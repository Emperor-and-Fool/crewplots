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

#define MAX_CLIENTS 100
#define BUFFER_SIZE 8192
#define MAX_ARGS 32
#define MAX_KEY_SIZE 512
#define MAX_VALUE_SIZE 2048

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

static KeyValue store[10000];
static int store_count = 0;
static Client clients[MAX_CLIENTS];
static int client_count = 0;
static int server_fd;
static volatile int running = 1;

void signal_handler(int sig) {
    running = 0;
}

// Send data to client with buffering
void queue_response(Client *client, const char *data) {
    int len = strlen(data);
    if (client->output_len + len < BUFFER_SIZE) {
        memcpy(client->output_buffer + client->output_len, data, len);
        client->output_len += len;
    }
}

void flush_client_output(Client *client) {
    if (client->output_len > client->output_sent) {
        int remaining = client->output_len - client->output_sent;
        int sent = send(client->fd, client->output_buffer + client->output_sent, remaining, MSG_NOSIGNAL);
        if (sent > 0) {
            client->output_sent += sent;
            if (client->output_sent >= client->output_len) {
                client->output_len = 0;
                client->output_sent = 0;
            }
        }
    }
}

int find_key(const char *key) {
    time_t now = time(NULL);
    for (int i = 0; i < store_count; i++) {
        if (strcmp(store[i].key, key) == 0) {
            if (store[i].ttl > 0 && store[i].ttl <= now) {
                // Expired - remove it
                memmove(&store[i], &store[i+1], (store_count - i - 1) * sizeof(KeyValue));
                store_count--;
                return -1;
            }
            return i;
        }
    }
    return -1;
}

void set_key(const char *key, const char *value, int ttl_seconds) {
    int idx = find_key(key);
    if (idx >= 0) {
        strncpy(store[idx].value, value, MAX_VALUE_SIZE - 1);
        store[idx].value[MAX_VALUE_SIZE - 1] = '\0';
        store[idx].ttl = ttl_seconds > 0 ? time(NULL) + ttl_seconds : 0;
    } else if (store_count < 10000) {
        strncpy(store[store_count].key, key, MAX_KEY_SIZE - 1);
        store[store_count].key[MAX_KEY_SIZE - 1] = '\0';
        strncpy(store[store_count].value, value, MAX_VALUE_SIZE - 1);
        store[store_count].value[MAX_VALUE_SIZE - 1] = '\0';
        store[store_count].ttl = ttl_seconds > 0 ? time(NULL) + ttl_seconds : 0;
        store_count++;
    }
}

int parse_resp_command(const char *buffer, int buffer_len, char **args, int max_args, int *consumed) {
    *consumed = 0;
    
    if (buffer_len < 4) return 0; // Need at least *N\r\n
    
    if (buffer[0] != '*') return -1; // Invalid format
    
    // Find first \r\n
    int pos = 1;
    while (pos < buffer_len - 1 && !(buffer[pos] == '\r' && buffer[pos + 1] == '\n')) {
        pos++;
    }
    
    if (pos >= buffer_len - 1) return 0; // Need more data
    
    // Parse argument count
    char count_str[16];
    memcpy(count_str, buffer + 1, pos - 1);
    count_str[pos - 1] = '\0';
    int argc = atoi(count_str);
    
    if (argc <= 0 || argc > max_args) return -1;
    
    pos += 2; // Skip \r\n
    *consumed = pos;
    
    // Parse each argument
    for (int i = 0; i < argc; i++) {
        if (pos >= buffer_len) return 0; // Need more data
        
        if (buffer[pos] != '$') return -1; // Invalid format
        pos++;
        
        // Find length \r\n
        int len_start = pos;
        while (pos < buffer_len - 1 && !(buffer[pos] == '\r' && buffer[pos + 1] == '\n')) {
            pos++;
        }
        
        if (pos >= buffer_len - 1) return 0; // Need more data
        
        // Parse length
        char len_str[16];
        memcpy(len_str, buffer + len_start, pos - len_start);
        len_str[pos - len_start] = '\0';
        int arg_len = atoi(len_str);
        
        pos += 2; // Skip \r\n
        
        if (pos + arg_len + 2 > buffer_len) return 0; // Need more data
        
        // Extract argument
        args[i] = malloc(arg_len + 1);
        memcpy(args[i], buffer + pos, arg_len);
        args[i][arg_len] = '\0';
        
        pos += arg_len + 2; // Skip data and \r\n
        *consumed = pos;
    }
    
    return argc;
}

void process_command(Client *client, char **args, int argc) {
    if (argc == 0) return;
    
    char *cmd = args[0];
    
    // Convert command to uppercase
    for (int i = 0; cmd[i]; i++) {
        cmd[i] = toupper(cmd[i]);
    }
    
    if (strcmp(cmd, "PING") == 0) {
        queue_response(client, "+PONG\r\n");
    } else if (strcmp(cmd, "SET") == 0) {
        if (argc >= 3) {
            set_key(args[1], args[2], 0);
            queue_response(client, "+OK\r\n");
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'set' command\r\n");
        }
    } else if (strcmp(cmd, "SETEX") == 0) {
        if (argc >= 4) {
            int ttl = atoi(args[2]);
            set_key(args[1], args[3], ttl);
            queue_response(client, "+OK\r\n");
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'setex' command\r\n");
        }
    } else if (strcmp(cmd, "GET") == 0) {
        if (argc >= 2) {
            int idx = find_key(args[1]);
            if (idx >= 0) {
                char response[BUFFER_SIZE];
                snprintf(response, sizeof(response), "$%d\r\n%s\r\n", 
                        (int)strlen(store[idx].value), store[idx].value);
                queue_response(client, response);
            } else {
                queue_response(client, "$-1\r\n");
            }
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'get' command\r\n");
        }
    } else if (strcmp(cmd, "DEL") == 0) {
        if (argc >= 2) {
            int deleted = 0;
            for (int i = 1; i < argc; i++) {
                int idx = find_key(args[i]);
                if (idx >= 0) {
                    memmove(&store[idx], &store[idx+1], (store_count - idx - 1) * sizeof(KeyValue));
                    store_count--;
                    deleted++;
                }
            }
            char response[64];
            snprintf(response, sizeof(response), ":%d\r\n", deleted);
            queue_response(client, response);
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'del' command\r\n");
        }
    } else if (strcmp(cmd, "EXISTS") == 0) {
        if (argc >= 2) {
            int exists = find_key(args[1]) >= 0 ? 1 : 0;
            char response[64];
            snprintf(response, sizeof(response), ":%d\r\n", exists);
            queue_response(client, response);
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'exists' command\r\n");
        }
    } else {
        queue_response(client, "-ERR unknown command\r\n");
    }
    
    // Free allocated argument strings
    for (int i = 0; i < argc; i++) {
        free(args[i]);
    }
}

void handle_client_data(Client *client) {
    char buffer[BUFFER_SIZE];
    int bytes = recv(client->fd, buffer, sizeof(buffer) - 1, MSG_DONTWAIT);
    
    if (bytes <= 0) return;
    
    // Add to input buffer
    if (client->input_len + bytes < BUFFER_SIZE) {
        memcpy(client->input_buffer + client->input_len, buffer, bytes);
        client->input_len += bytes;
    }
    
    // Process complete commands
    while (client->input_len > 0) {
        char *args[MAX_ARGS];
        int consumed;
        int argc = parse_resp_command(client->input_buffer, client->input_len, args, MAX_ARGS, &consumed);
        
        if (argc > 0) {
            process_command(client, args, argc);
            // Remove processed data
            memmove(client->input_buffer, client->input_buffer + consumed, client->input_len - consumed);
            client->input_len -= consumed;
        } else {
            break; // Need more data or error
        }
    }
}

void remove_client(int index) {
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
        exit(1);
    }
    
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    struct sockaddr_in addr;
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = inet_addr("127.0.0.1");
    addr.sin_port = htons(6379);
    
    if (bind(server_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("bind");
        exit(1);
    }
    
    if (listen(server_fd, 5) < 0) {
        perror("listen");
        exit(1);
    }
    
    printf("Redis server listening on 127.0.0.1:6379\n");
    printf("Ready to accept connections\n");
    fflush(stdout);
    
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
        
        if (activity < 0 && errno != EINTR) break;
        
        // Accept new connections
        if (FD_ISSET(server_fd, &readfds) && client_count < MAX_CLIENTS) {
            int client_fd = accept(server_fd, NULL, NULL);
            if (client_fd >= 0) {
                clients[client_count].fd = client_fd;
                clients[client_count].input_len = 0;
                clients[client_count].output_len = 0;
                clients[client_count].output_sent = 0;
                client_count++;
            }
        }
        
        // Handle client I/O
        for (int i = 0; i < client_count; i++) {
            if (FD_ISSET(clients[i].fd, &readfds)) {
                handle_client_data(&clients[i]);
            }
            
            if (FD_ISSET(clients[i].fd, &writefds)) {
                flush_client_output(&clients[i]);
            }
        }
        
        // Remove disconnected clients
        for (int i = client_count - 1; i >= 0; i--) {
            char test;
            if (recv(clients[i].fd, &test, 1, MSG_PEEK | MSG_DONTWAIT) == 0) {
                remove_client(i);
            }
        }
    }
    
    close(server_fd);
    return 0;
}