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
#define MAX_KEY_SIZE 256
#define MAX_VALUE_SIZE 1024

typedef struct {
    char key[MAX_KEY_SIZE];
    char value[MAX_VALUE_SIZE];
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

int find_key(const char *key) {
    for (int i = 0; i < store_count; i++) {
        if (strcmp(store[i].key, key) == 0) {
            if (store[i].ttl > 0 && store[i].ttl < time(NULL)) {
                // Key expired, remove it
                memmove(&store[i], &store[i+1], (store_count - i - 1) * sizeof(KeyValue));
                store_count--;
                return -1;
            }
            return i;
        }
    }
    return -1;
}

void set_key(const char *key, const char *value, int ttl) {
    int idx = find_key(key);
    if (idx >= 0) {
        strncpy(store[idx].value, value, MAX_VALUE_SIZE - 1);
        store[idx].value[MAX_VALUE_SIZE - 1] = '\0';
        store[idx].ttl = ttl > 0 ? time(NULL) + ttl : 0;
    } else if (store_count < 1000) {
        strncpy(store[store_count].key, key, MAX_KEY_SIZE - 1);
        store[store_count].key[MAX_KEY_SIZE - 1] = '\0';
        strncpy(store[store_count].value, value, MAX_VALUE_SIZE - 1);
        store[store_count].value[MAX_VALUE_SIZE - 1] = '\0';
        store[store_count].ttl = ttl > 0 ? time(NULL) + ttl : 0;
        store_count++;
    }
}

char *get_key(const char *key) {
    int idx = find_key(key);
    return idx >= 0 ? store[idx].value : NULL;
}

int exists_key(const char *key) {
    return find_key(key) >= 0;
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

void send_response(int client_fd, const char *response) {
    send(client_fd, response, strlen(response), 0);
}

void process_command(int client_fd, char *command) {
    char *cmd = strtok(command, " \r\n");
    if (!cmd) return;
    
    // Convert to uppercase
    for (char *p = cmd; *p; p++) *p = toupper(*p);
    
    if (strcmp(cmd, "PING") == 0) {
        send_response(client_fd, "+PONG\r\n");
    } else if (strcmp(cmd, "SET") == 0) {
        char *key = strtok(NULL, " \r\n");
        char *value = strtok(NULL, " \r\n");
        char *ex = strtok(NULL, " \r\n");
        char *ttl_str = strtok(NULL, " \r\n");
        
        if (key && value) {
            int ttl = 0;
            if (ex && ttl_str && strcasecmp(ex, "EX") == 0) {
                ttl = atoi(ttl_str);
            }
            set_key(key, value, ttl);
            send_response(client_fd, "+OK\r\n");
        } else {
            send_response(client_fd, "-ERR wrong number of arguments\r\n");
        }
    } else if (strcmp(cmd, "GET") == 0) {
        char *key = strtok(NULL, " \r\n");
        if (key) {
            char *value = get_key(key);
            if (value) {
                char response[BUFFER_SIZE];
                snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(value), value);
                send_response(client_fd, response);
            } else {
                send_response(client_fd, "$-1\r\n");
            }
        } else {
            send_response(client_fd, "-ERR wrong number of arguments\r\n");
        }
    } else if (strcmp(cmd, "EXISTS") == 0) {
        char *key = strtok(NULL, " \r\n");
        if (key) {
            int exists = exists_key(key);
            char response[64];
            snprintf(response, sizeof(response), ":%d\r\n", exists);
            send_response(client_fd, response);
        } else {
            send_response(client_fd, "-ERR wrong number of arguments\r\n");
        }
    } else if (strcmp(cmd, "DEL") == 0) {
        char *key = strtok(NULL, " \r\n");
        if (key) {
            int deleted = delete_key(key);
            char response[64];
            snprintf(response, sizeof(response), ":%d\r\n", deleted);
            send_response(client_fd, response);
        } else {
            send_response(client_fd, "-ERR wrong number of arguments\r\n");
        }
    } else if (strcmp(cmd, "FLUSHALL") == 0 || strcmp(cmd, "FLUSHDB") == 0) {
        store_count = 0;
        send_response(client_fd, "+OK\r\n");
    } else if (strcmp(cmd, "QUIT") == 0) {
        send_response(client_fd, "+OK\r\n");
        return; // Client will close connection
    } else if (strcmp(cmd, "KEYS") == 0) {
        char *pattern = strtok(NULL, " \r\n");
        if (!pattern) pattern = "*";
        
        char response[BUFFER_SIZE] = "";
        int count = 0;
        
        for (int i = 0; i < store_count; i++) {
            if (strcmp(pattern, "*") == 0 || strstr(store[i].key, pattern)) {
                count++;
            }
        }
        
        snprintf(response, sizeof(response), "*%d\r\n", count);
        send_response(client_fd, response);
        
        for (int i = 0; i < store_count; i++) {
            if (strcmp(pattern, "*") == 0 || strstr(store[i].key, pattern)) {
                char key_response[256];
                snprintf(key_response, sizeof(key_response), "$%ld\r\n%s\r\n", strlen(store[i].key), store[i].key);
                send_response(client_fd, key_response);
            }
        }
    } else if (strcmp(cmd, "SELECT") == 0) {
        // Simple SELECT command support (ignore database selection)
        send_response(client_fd, "+OK\r\n");
    } else if (strcmp(cmd, "INFO") == 0) {
        // Basic INFO command
        send_response(client_fd, "$23\r\n# Server\r\nredis_version:7.0.0\r\n\r\n");
    } else if (strcmp(cmd, "CLIENT") == 0) {
        char *subcmd = strtok(NULL, " \r\n");
        if (subcmd && strcasecmp(subcmd, "SETNAME") == 0) {
            send_response(client_fd, "+OK\r\n");
        } else {
            send_response(client_fd, "+OK\r\n");
        }
    } else {
        send_response(client_fd, "-ERR unknown command\r\n");
    }
}

int main(int argc, char *argv[]) {
    int port = 6379;
    
    if (argc > 1) {
        port = atoi(argv[1]);
    }
    
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
    addr.sin_port = htons(port);
    
    if (bind(server_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("bind");
        exit(1);
    }
    
    if (listen(server_fd, 10) < 0) {
        perror("listen");
        exit(1);
    }
    
    printf("Mini Redis server listening on 127.0.0.1:%d\n", port);
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
        
        if (activity < 0 && errno != EINTR) {
            perror("select");
            break;
        }
        
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
        
        for (int i = 0; i < client_count; i++) {
            if (FD_ISSET(clients[i].fd, &readfds)) {
                char buffer[256];
                int bytes = recv(clients[i].fd, buffer, sizeof(buffer) - 1, 0);
                
                if (bytes <= 0) {
                    close(clients[i].fd);
                    memmove(&clients[i], &clients[i+1], (client_count - i - 1) * sizeof(Client));
                    client_count--;
                    i--;
                } else {
                    buffer[bytes] = '\0';
                    
                    int buffer_pos = clients[i].buffer_len;
                    int space_left = BUFFER_SIZE - buffer_pos - 1;
                    
                    if (space_left > 0) {
                        int copy_len = bytes < space_left ? bytes : space_left;
                        memcpy(clients[i].buffer + buffer_pos, buffer, copy_len);
                        clients[i].buffer_len += copy_len;
                        clients[i].buffer[clients[i].buffer_len] = '\0';
                        
                        char *line_end = strstr(clients[i].buffer, "\r\n");
                        if (line_end) {
                            *line_end = '\0';
                            process_command(clients[i].fd, clients[i].buffer);
                            
                            int processed_len = line_end - clients[i].buffer + 2;
                            memmove(clients[i].buffer, clients[i].buffer + processed_len, 
                                   clients[i].buffer_len - processed_len);
                            clients[i].buffer_len -= processed_len;
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