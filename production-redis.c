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

char* get_key(const char *key) {
    int idx = find_key(key);
    return idx >= 0 ? store[idx].value : NULL;
}

int delete_key(const char *key) {
    int idx = find_key(key);
    if (idx >= 0) {
        memmove(&store[idx], &store[idx+1], (store_count - idx - 1) * sizeof(KeyValue));
        store_count--;
        return 1;
    }
    return 0;
}

// Robust RESP parser that handles partial reads correctly
int parse_resp_command(const char *buffer, int buffer_len, char **args, int max_args, int *consumed) {
    *consumed = 0;
    
    if (buffer_len < 4 || buffer[0] != '*') return -1;
    
    // Find first \r\n
    int header_end = -1;
    for (int i = 1; i < buffer_len - 1; i++) {
        if (buffer[i] == '\r' && buffer[i+1] == '\n') {
            header_end = i;
            break;
        }
    }
    if (header_end == -1) return -1; // Incomplete header
    
    int argc = atoi(buffer + 1);
    if (argc <= 0 || argc > max_args) return -1;
    
    int pos = header_end + 2; // Skip past \r\n
    
    for (int i = 0; i < argc; i++) {
        if (pos >= buffer_len || buffer[pos] != '$') return -1;
        
        // Find length line end
        int len_end = -1;
        for (int j = pos + 1; j < buffer_len - 1; j++) {
            if (buffer[j] == '\r' && buffer[j+1] == '\n') {
                len_end = j;
                break;
            }
        }
        if (len_end == -1) return -1; // Incomplete length
        
        int arg_len = atoi(buffer + pos + 1);
        if (arg_len < 0) return -1;
        
        pos = len_end + 2; // Skip \r\n after length
        
        // Check if we have the complete argument data
        if (pos + arg_len + 2 > buffer_len) return -1; // Incomplete data
        
        // Store argument (create null-terminated copy)
        static char arg_storage[MAX_ARGS][512];
        if (arg_len >= 512) return -1;
        memcpy(arg_storage[i], buffer + pos, arg_len);
        arg_storage[i][arg_len] = '\0';
        args[i] = arg_storage[i];
        
        pos += arg_len + 2; // Skip data + \r\n
    }
    
    *consumed = pos;
    return argc;
}

void process_command(Client *client, char **args, int argc) {
    if (argc < 1) return;
    
    char *cmd = args[0];
    // Convert to uppercase
    for (int i = 0; cmd[i]; i++) {
        cmd[i] = toupper(cmd[i]);
    }
    
    if (strcmp(cmd, "PING") == 0) {
        if (argc > 1) {
            // PING with message
            char response[1024];
            int msg_len = strlen(args[1]);
            snprintf(response, sizeof(response), "$%d\r\n%s\r\n", msg_len, args[1]);
            queue_response(client, response);
        } else {
            queue_response(client, "+PONG\r\n");
        }
    } else if (strcmp(cmd, "SET") == 0) {
        if (argc >= 3) {
            int ttl = 0;
            // Check for EX parameter
            if (argc >= 5 && strcasecmp(args[3], "EX") == 0) {
                ttl = atoi(args[4]);
            }
            set_key(args[1], args[2], ttl);
            queue_response(client, "+OK\r\n");
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'set' command\r\n");
        }
    } else if (strcmp(cmd, "GET") == 0) {
        if (argc >= 2) {
            char *value = get_key(args[1]);
            if (value) {
                char response[2048];
                snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(value), value);
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
                deleted += delete_key(args[i]);
            }
            char response[64];
            snprintf(response, sizeof(response), ":%d\r\n", deleted);
            queue_response(client, response);
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'del' command\r\n");
        }
    } else if (strcmp(cmd, "EXISTS") == 0) {
        if (argc >= 2) {
            int exists = 0;
            for (int i = 1; i < argc; i++) {
                if (find_key(args[i]) >= 0) exists++;
            }
            char response[64];
            snprintf(response, sizeof(response), ":%d\r\n", exists);
            queue_response(client, response);
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'exists' command\r\n");
        }
    } else if (strcmp(cmd, "AUTH") == 0) {
        queue_response(client, "+OK\r\n");
    } else if (strcmp(cmd, "SELECT") == 0) {
        queue_response(client, "+OK\r\n");
    } else if (strcmp(cmd, "INFO") == 0) {
        const char *info = "# Server\r\nredis_version:7.0.0\r\nredis_mode:standalone\r\ntcp_port:6379\r\n";
        char response[512];
        snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(info), info);
        queue_response(client, response);
    } else if (strcmp(cmd, "CLIENT") == 0) {
        if (argc >= 2) {
            char *subcmd = args[1];
            for (int i = 0; subcmd[i]; i++) subcmd[i] = toupper(subcmd[i]);
            
            if (strcmp(subcmd, "SETNAME") == 0) {
                queue_response(client, "+OK\r\n");
            } else if (strcmp(subcmd, "LIST") == 0) {
                queue_response(client, "*0\r\n");
            } else if (strcmp(subcmd, "GETNAME") == 0) {
                queue_response(client, "$-1\r\n");
            } else {
                queue_response(client, "+OK\r\n");
            }
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'client' command\r\n");
        }
    } else if (strcmp(cmd, "COMMAND") == 0) {
        // Return empty array for COMMAND queries
        queue_response(client, "*0\r\n");
    } else if (strcmp(cmd, "QUIT") == 0) {
        queue_response(client, "+OK\r\n");
        // Mark client for disconnection after flush
    } else {
        char error[256];
        snprintf(error, sizeof(error), "-ERR unknown command '%s'\r\n", cmd);
        queue_response(client, error);
    }
}

void handle_client_data(Client *client) {
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
            break; // Need more data
        }
    }
}

int main() {
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    signal(SIGPIPE, SIG_IGN); // Ignore broken pipe signals
    
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
    
    if (listen(server_fd, 128) < 0) {
        perror("listen");
        exit(1);
    }
    
    printf("Production Redis server listening on 127.0.0.1:6379\n");
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
            if (clients[i].fd > max_fd) max_fd = clients[i].fd;
        }
        
        struct timeval timeout = {1, 0};
        int activity = select(max_fd + 1, &readfds, &writefds, NULL, &timeout);
        
        if (activity < 0 && errno != EINTR) break;
        
        // Accept new connections
        if (FD_ISSET(server_fd, &readfds)) {
            struct sockaddr_in client_addr;
            socklen_t client_len = sizeof(client_addr);
            int client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
            
            if (client_fd >= 0) {
                if (client_count < MAX_CLIENTS) {
                    clients[client_count].fd = client_fd;
                    clients[client_count].input_len = 0;
                    clients[client_count].output_len = 0;
                    clients[client_count].output_sent = 0;
                    client_count++;
                } else {
                    close(client_fd); // Too many clients
                }
            }
        }
        
        // Handle client I/O
        for (int i = 0; i < client_count; i++) {
            Client *client = &clients[i];
            
            // Read data
            if (FD_ISSET(client->fd, &readfds)) {
                int space = BUFFER_SIZE - client->input_len - 1;
                if (space > 0) {
                    int bytes = recv(client->fd, client->input_buffer + client->input_len, space, 0);
                    if (bytes > 0) {
                        client->input_len += bytes;
                        client->input_buffer[client->input_len] = '\0';
                        handle_client_data(client);
                    } else {
                        // Client disconnected
                        close(client->fd);
                        memmove(&clients[i], &clients[i+1], (client_count - i - 1) * sizeof(Client));
                        client_count--;
                        i--;
                        continue;
                    }
                }
            }
            
            // Write data
            if (FD_ISSET(client->fd, &writefds)) {
                flush_client_output(client);
            }
        }
    }
    
    // Cleanup
    for (int i = 0; i < client_count; i++) {
        close(clients[i].fd);
    }
    close(server_fd);
    
    printf("\nProduction Redis server shutdown\n");
    return 0;
}