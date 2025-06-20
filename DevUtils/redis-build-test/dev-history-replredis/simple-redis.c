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
#define BUFFER_SIZE 4096
#define MAX_ARGS 16

typedef struct {
    char key[256];
    char value[1024];
    time_t ttl;
} KeyValue;

typedef struct {
    int fd;
    char buffer[BUFFER_SIZE];
    int buffer_len;
} Client;

static KeyValue store[1000];
static int store_count = 0;
static Client clients[MAX_CLIENTS];
static int client_count = 0;
static int server_fd;
static volatile int running = 1;

void signal_handler(int sig) {
    running = 0;
}

void send_response(int client_fd, const char *response) {
    send(client_fd, response, strlen(response), 0);
}

int find_key(const char *key) {
    for (int i = 0; i < store_count; i++) {
        if (strcmp(store[i].key, key) == 0) {
            if (store[i].ttl > 0 && store[i].ttl < time(NULL)) {
                // Key expired
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
        strcpy(store[idx].value, value);
        store[idx].ttl = ttl_seconds > 0 ? time(NULL) + ttl_seconds : 0;
    } else if (store_count < 1000) {
        strcpy(store[store_count].key, key);
        strcpy(store[store_count].value, value);
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

// Simple RESP parser that actually works
int parse_command(char *input, char **args) {
    if (*input != '*') return -1;
    
    char *pos = input + 1;
    int argc = atoi(pos);
    if (argc <= 0 || argc > MAX_ARGS) return -1;
    
    // Skip to end of first line
    pos = strchr(pos, '\n');
    if (!pos) return -1;
    pos++;
    
    for (int i = 0; i < argc; i++) {
        if (*pos != '$') return -1;
        pos++;
        
        int len = atoi(pos);
        if (len < 0) return -1;
        
        // Skip to end of length line
        pos = strchr(pos, '\n');
        if (!pos) return -1;
        pos++;
        
        // Store argument
        args[i] = pos;
        pos[len] = '\0';  // Null terminate
        pos += len + 2;   // Skip data + \r\n
    }
    
    return argc;
}

void process_command(int client_fd, char *buffer) {
    char *args[MAX_ARGS];
    int argc = parse_command(buffer, args);
    
    if (argc < 1) {
        send_response(client_fd, "-ERR Invalid command format\r\n");
        return;
    }
    
    char *cmd = args[0];
    
    // Convert to uppercase
    for (int i = 0; cmd[i]; i++) {
        cmd[i] = toupper(cmd[i]);
    }
    
    if (strcmp(cmd, "PING") == 0) {
        send_response(client_fd, "+PONG\r\n");
    } else if (strcmp(cmd, "SET") == 0) {
        if (argc >= 3) {
            set_key(args[1], args[2], 0);
            send_response(client_fd, "+OK\r\n");
        } else {
            send_response(client_fd, "-ERR wrong number of arguments\r\n");
        }
    } else if (strcmp(cmd, "GET") == 0) {
        if (argc >= 2) {
            char *value = get_key(args[1]);
            if (value) {
                char response[1024];
                snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(value), value);
                send_response(client_fd, response);
            } else {
                send_response(client_fd, "$-1\r\n");
            }
        } else {
            send_response(client_fd, "-ERR wrong number of arguments\r\n");
        }
    } else if (strcmp(cmd, "DEL") == 0) {
        if (argc >= 2) {
            int deleted = delete_key(args[1]);
            char response[32];
            snprintf(response, sizeof(response), ":%d\r\n", deleted);
            send_response(client_fd, response);
        } else {
            send_response(client_fd, "-ERR wrong number of arguments\r\n");
        }
    } else if (strcmp(cmd, "EXISTS") == 0) {
        if (argc >= 2) {
            int exists = find_key(args[1]) >= 0 ? 1 : 0;
            char response[32];
            snprintf(response, sizeof(response), ":%d\r\n", exists);
            send_response(client_fd, response);
        } else {
            send_response(client_fd, "-ERR wrong number of arguments\r\n");
        }
    } else if (strcmp(cmd, "AUTH") == 0) {
        send_response(client_fd, "+OK\r\n");
    } else if (strcmp(cmd, "SELECT") == 0) {
        send_response(client_fd, "+OK\r\n");
    } else if (strcmp(cmd, "INFO") == 0) {
        send_response(client_fd, "$23\r\n# Server\r\nredis_version:7.0.0\r\n\r\n");
    } else {
        char error[256];
        snprintf(error, sizeof(error), "-ERR unknown command '%s'\r\n", cmd);
        send_response(client_fd, error);
    }
}

int main() {
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
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
    
    if (listen(server_fd, 10) < 0) {
        perror("listen");
        exit(1);
    }
    
    printf("Simple Redis server listening on 127.0.0.1:6379\n");
    printf("Ready to accept connections\n");
    fflush(stdout);
    
    while (running) {
        fd_set readfds;
        FD_ZERO(&readfds);
        FD_SET(server_fd, &readfds);
        
        int max_fd = server_fd;
        for (int i = 0; i < client_count; i++) {
            FD_SET(clients[i].fd, &readfds);
            if (clients[i].fd > max_fd) max_fd = clients[i].fd;
        }
        
        struct timeval timeout = {1, 0};
        int activity = select(max_fd + 1, &readfds, NULL, NULL, &timeout);
        
        if (activity < 0 && errno != EINTR) break;
        
        // Accept new connections
        if (FD_ISSET(server_fd, &readfds)) {
            struct sockaddr_in client_addr;
            socklen_t client_len = sizeof(client_addr);
            int client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
            
            if (client_fd >= 0 && client_count < MAX_CLIENTS) {
                clients[client_count].fd = client_fd;
                clients[client_count].buffer_len = 0;
                client_count++;
            } else if (client_fd >= 0) {
                close(client_fd);
            }
        }
        
        // Handle client data
        for (int i = 0; i < client_count; i++) {
            if (FD_ISSET(clients[i].fd, &readfds)) {
                char temp_buffer[1024];
                int bytes = recv(clients[i].fd, temp_buffer, sizeof(temp_buffer) - 1, 0);
                
                if (bytes <= 0) {
                    close(clients[i].fd);
                    memmove(&clients[i], &clients[i+1], (client_count - i - 1) * sizeof(Client));
                    client_count--;
                    i--;
                } else {
                    temp_buffer[bytes] = '\0';
                    
                    // Add to client buffer
                    int space = BUFFER_SIZE - clients[i].buffer_len - 1;
                    if (space > 0) {
                        int copy_len = bytes < space ? bytes : space;
                        memcpy(clients[i].buffer + clients[i].buffer_len, temp_buffer, copy_len);
                        clients[i].buffer_len += copy_len;
                        clients[i].buffer[clients[i].buffer_len] = '\0';
                        
                        // Look for complete commands
                        char *pos = clients[i].buffer;
                        while (clients[i].buffer_len > 0) {
                            if (*pos == '*') {
                                // Find command end
                                char *cmd_start = pos;
                                
                                // Parse array count
                                int array_count = atoi(pos + 1);
                                if (array_count <= 0) break;
                                
                                // Skip array header
                                pos = strchr(pos, '\n');
                                if (!pos) break;
                                pos++;
                                
                                // Check all arguments are complete
                                int complete = 1;
                                for (int arg = 0; arg < array_count && complete; arg++) {
                                    if (pos >= clients[i].buffer + clients[i].buffer_len || *pos != '$') {
                                        complete = 0;
                                        break;
                                    }
                                    
                                    int arg_len = atoi(pos + 1);
                                    pos = strchr(pos, '\n');
                                    if (!pos || pos + 1 + arg_len + 2 > clients[i].buffer + clients[i].buffer_len) {
                                        complete = 0;
                                        break;
                                    }
                                    pos += 1 + arg_len + 2; // Skip \n + data + \r\n
                                }
                                
                                if (complete) {
                                    // Process complete command
                                    int cmd_len = pos - cmd_start;
                                    char cmd_buffer[BUFFER_SIZE];
                                    memcpy(cmd_buffer, cmd_start, cmd_len);
                                    cmd_buffer[cmd_len] = '\0';
                                    
                                    process_command(clients[i].fd, cmd_buffer);
                                    
                                    // Remove processed command
                                    memmove(clients[i].buffer, pos, clients[i].buffer_len - (pos - clients[i].buffer));
                                    clients[i].buffer_len -= (pos - clients[i].buffer);
                                    pos = clients[i].buffer;
                                } else {
                                    break; // Wait for more data
                                }
                            } else {
                                // Skip non-RESP data
                                char *newline = strchr(pos, '\n');
                                if (newline) {
                                    int skip_len = newline - pos + 1;
                                    memmove(clients[i].buffer, newline + 1, clients[i].buffer_len - skip_len);
                                    clients[i].buffer_len -= skip_len;
                                    pos = clients[i].buffer;
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    close(server_fd);
    printf("\nServer shutdown\n");
    return 0;
}