#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <signal.h>
#include <errno.h>
#include <sys/select.h>
#include <time.h>
#include <ctype.h>

#define MAX_CLIENTS 10
#define BUFFER_SIZE 32768     // 32KB buffer
#define MAX_ARGS 32
#define MAX_KEY_SIZE 2048     
#define MAX_VALUE_SIZE 8192   // 8KB max value

typedef struct {
    char key[MAX_KEY_SIZE];
    char value[MAX_VALUE_SIZE];
    time_t ttl;
} KeyValue;

typedef struct {
    int fd;
    char input_buffer[BUFFER_SIZE];
    int input_len;
    char output_buffer[BUFFER_SIZE];
    int output_len;
    int output_sent;
} Client;

static KeyValue store[1000];
static int store_count = 0;
static Client clients[MAX_CLIENTS];
static int client_count = 0;
static int server_fd;
static volatile int running = 1;

void signal_handler(int sig) {
    printf("Signal %d received, shutting down...\n", sig);
    running = 0;
}

void queue_response(Client *client, const char *data) {
    int len = strlen(data);
    printf("Queuing response: %d bytes\n", len);
    if (client->output_len + len < BUFFER_SIZE) {
        memcpy(client->output_buffer + client->output_len, data, len);
        client->output_len += len;
    } else {
        printf("ERROR: Output buffer full\n");
    }
}

void flush_client_output(Client *client) {
    if (client->output_len > client->output_sent) {
        int remaining = client->output_len - client->output_sent;
        printf("Flushing %d bytes to client\n", remaining);
        int sent = send(client->fd, client->output_buffer + client->output_sent, remaining, MSG_NOSIGNAL);
        if (sent > 0) {
            client->output_sent += sent;
            if (client->output_sent >= client->output_len) {
                client->output_len = 0;
                client->output_sent = 0;
            }
        } else {
            printf("Send error: %s\n", strerror(errno));
        }
    }
}

int find_key(const char *key) {
    for (int i = 0; i < store_count; i++) {
        if (strcmp(store[i].key, key) == 0) {
            return i;
        }
    }
    return -1;
}

void set_key(const char *key, const char *value, int ttl_seconds) {
    printf("Setting key '%s' with value length %zu\n", key, strlen(value));
    int idx = find_key(key);
    if (idx >= 0) {
        strncpy(store[idx].value, value, MAX_VALUE_SIZE - 1);
        store[idx].value[MAX_VALUE_SIZE - 1] = '\0';
        store[idx].ttl = ttl_seconds > 0 ? time(NULL) + ttl_seconds : 0;
    } else if (store_count < 1000) {
        strncpy(store[store_count].key, key, MAX_KEY_SIZE - 1);
        store[store_count].key[MAX_KEY_SIZE - 1] = '\0';
        strncpy(store[store_count].value, value, MAX_VALUE_SIZE - 1);
        store[store_count].value[MAX_VALUE_SIZE - 1] = '\0';
        store[store_count].ttl = ttl_seconds > 0 ? time(NULL) + ttl_seconds : 0;
        store_count++;
    }
}

char* get_key(const char *key) {
    int idx = find_key(key);
    return idx >= 0 ? store[idx].value : NULL;
}

// Debug RESP parser
int parse_resp_command(const char *buffer, int buffer_len, char **args, int max_args, int *consumed) {
    printf("Parsing RESP command, buffer_len=%d\n", buffer_len);
    printf("Buffer start: %.*s\n", (buffer_len > 50 ? 50 : buffer_len), buffer);
    
    *consumed = 0;
    
    if (buffer_len < 4 || buffer[0] != '*') {
        printf("Invalid header\n");
        return -1;
    }
    
    int header_end = -1;
    for (int i = 1; i < buffer_len - 1; i++) {
        if (buffer[i] == '\r' && buffer[i+1] == '\n') {
            header_end = i;
            break;
        }
    }
    if (header_end == -1) {
        printf("Incomplete header\n");
        return -1;
    }
    
    int argc = atoi(buffer + 1);
    printf("Found %d arguments\n", argc);
    if (argc <= 0 || argc > max_args) {
        printf("Invalid argc: %d\n", argc);
        return -1;
    }
    
    int pos = header_end + 2;
    
    for (int i = 0; i < argc; i++) {
        printf("Parsing arg %d at pos %d\n", i, pos);
        
        if (pos >= buffer_len || buffer[pos] != '$') {
            printf("Missing $ at pos %d\n", pos);
            return -1;
        }
        
        int len_end = -1;
        for (int j = pos + 1; j < buffer_len - 1; j++) {
            if (buffer[j] == '\r' && buffer[j+1] == '\n') {
                len_end = j;
                break;
            }
        }
        if (len_end == -1) {
            printf("Incomplete length line\n");
            return -1;
        }
        
        int arg_len = atoi(buffer + pos + 1);
        printf("Arg %d length: %d\n", i, arg_len);
        
        if (arg_len < 0 || arg_len >= MAX_VALUE_SIZE) {
            printf("Invalid arg length: %d\n", arg_len);
            return -1;
        }
        
        pos = len_end + 2;
        
        if (pos + arg_len + 2 > buffer_len) {
            printf("Incomplete data: need %d more bytes\n", (pos + arg_len + 2) - buffer_len);
            return -1;
        }
        
        static char arg_storage[MAX_ARGS][MAX_VALUE_SIZE];
        memcpy(arg_storage[i], buffer + pos, arg_len);
        arg_storage[i][arg_len] = '\0';
        args[i] = arg_storage[i];
        
        printf("Arg %d: '%.*s'\n", i, (arg_len > 50 ? 50 : arg_len), args[i]);
        
        pos += arg_len + 2;
    }
    
    *consumed = pos;
    printf("Consumed %d bytes total\n", *consumed);
    return argc;
}

void process_command(Client *client, char **args, int argc) {
    printf("Processing command with %d args\n", argc);
    if (argc < 1) return;
    
    char *cmd = args[0];
    for (int i = 0; cmd[i]; i++) {
        cmd[i] = toupper(cmd[i]);
    }
    printf("Command: %s\n", cmd);
    
    if (strcmp(cmd, "PING") == 0) {
        queue_response(client, "+PONG\r\n");
    } else if (strcmp(cmd, "SET") == 0) {
        if (argc >= 3) {
            set_key(args[1], args[2], 0);
            queue_response(client, "+OK\r\n");
        } else {
            queue_response(client, "-ERR wrong number of arguments\r\n");
        }
    } else if (strcmp(cmd, "GET") == 0) {
        if (argc >= 2) {
            char *value = get_key(args[1]);
            if (value) {
                char response[MAX_VALUE_SIZE + 100];
                snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(value), value);
                queue_response(client, response);
            } else {
                queue_response(client, "$-1\r\n");
            }
        } else {
            queue_response(client, "-ERR wrong number of arguments\r\n");
        }
    } else {
        printf("Unknown command: %s\n", cmd);
        queue_response(client, "-ERR unknown command\r\n");
    }
}

void handle_client_data(Client *client) {
    char temp_buffer[8192];
    int bytes_received = recv(client->fd, temp_buffer, sizeof(temp_buffer) - 1, MSG_DONTWAIT);
    
    printf("Received %d bytes from client\n", bytes_received);
    
    if (bytes_received <= 0) {
        if (bytes_received < 0) {
            printf("Recv error: %s\n", strerror(errno));
        }
        return;
    }
    
    if (client->input_len + bytes_received >= BUFFER_SIZE - 1) {
        printf("Input buffer full, resetting\n");
        client->input_len = 0;
        return;
    }
    
    memcpy(client->input_buffer + client->input_len, temp_buffer, bytes_received);
    client->input_len += bytes_received;
    printf("Total input buffer: %d bytes\n", client->input_len);
    
    while (client->input_len > 0) {
        char *args[MAX_ARGS];
        int consumed = 0;
        int argc = parse_resp_command(client->input_buffer, client->input_len, args, MAX_ARGS, &consumed);
        
        if (argc > 0) {
            process_command(client, args, argc);
            
            if (consumed > 0 && consumed <= client->input_len) {
                memmove(client->input_buffer, client->input_buffer + consumed, client->input_len - consumed);
                client->input_len -= consumed;
                printf("Remaining buffer: %d bytes\n", client->input_len);
            } else {
                printf("Parse error: consumed=%d, input_len=%d\n", consumed, client->input_len);
                break;
            }
        } else {
            printf("Parse returned %d, breaking\n", argc);
            break;
        }
    }
}

void remove_client(int index) {
    printf("Removing client %d\n", index);
    close(clients[index].fd);
    memmove(&clients[index], &clients[index + 1], (client_count - index - 1) * sizeof(Client));
    client_count--;
}

int main() {
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    signal(SIGPIPE, SIG_IGN);
    
    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket");
        return 1;
    }
    
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    struct sockaddr_in addr;
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = inet_addr("127.0.0.1");
    addr.sin_port = htons(6379);
    
    if (bind(server_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(server_fd);
        return 1;
    }
    
    if (listen(server_fd, 10) < 0) {
        perror("listen");
        close(server_fd);
        return 1;
    }
    
    printf("Debug Redis server listening on 127.0.0.1:6379\n");
    
    while (running) {
        fd_set readfds, writefds;
        FD_ZERO(&readfds);
        FD_ZERO(&writefds);
        
        FD_SET(server_fd, &readfds);
        int max_fd = server_fd;
        
        for (int i = 0; i < client_count; i++) {
            FD_SET(clients[i].fd, &readfds);
            if (clients[i].output_len > clients[i].output_sent) {
                FD_SET(clients[i].fd, &writefds);
            }
            if (clients[i].fd > max_fd) {
                max_fd = clients[i].fd;
            }
        }
        
        struct timeval timeout = {1, 0};
        int activity = select(max_fd + 1, &readfds, &writefds, NULL, &timeout);
        
        if (activity < 0 && errno != EINTR) {
            perror("select");
            break;
        }
        
        if (FD_ISSET(server_fd, &readfds)) {
            struct sockaddr_in client_addr;
            socklen_t client_len = sizeof(client_addr);
            int client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
            
            printf("New client connection: fd=%d\n", client_fd);
            
            if (client_fd >= 0 && client_count < MAX_CLIENTS) {
                clients[client_count].fd = client_fd;
                clients[client_count].input_len = 0;
                clients[client_count].output_len = 0;
                clients[client_count].output_sent = 0;
                client_count++;
            } else if (client_fd >= 0) {
                printf("Max clients reached, closing connection\n");
                close(client_fd);
            }
        }
        
        for (int i = 0; i < client_count; i++) {
            if (FD_ISSET(clients[i].fd, &readfds)) {
                handle_client_data(&clients[i]);
            }
            
            if (FD_ISSET(clients[i].fd, &writefds)) {
                flush_client_output(&clients[i]);
            }
        }
        
        // Check for disconnected clients
        for (int i = client_count - 1; i >= 0; i--) {
            char test;
            int result = recv(clients[i].fd, &test, 1, MSG_PEEK | MSG_DONTWAIT);
            if (result == 0 || (result < 0 && errno != EAGAIN && errno != EWOULDBLOCK)) {
                remove_client(i);
            }
        }
    }
    
    printf("Shutting down server\n");
    for (int i = 0; i < client_count; i++) {
        close(clients[i].fd);
    }
    close(server_fd);
    
    return 0;
}