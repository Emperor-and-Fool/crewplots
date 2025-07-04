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
#define BUFFER_SIZE 16384
#define MAX_ARGS 32
#define MAX_KEY_SIZE 512
#define MAX_VALUE_SIZE 4096

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

static KeyValue store[15000];
static int store_count = 0;
static Client clients[MAX_CLIENTS];
static int client_count = 0;
static int server_fd;
static volatile int running = 1;

void signal_handler(int sig) {
    running = 0;
}

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
    printf("[DEBUG] find_key('%s') - current time: %ld\n", key, now);
    
    for (int i = 0; i < store_count; i++) {
        if (strcmp(store[i].key, key) == 0) {
            printf("[DEBUG] Found key '%s' at index %d, ttl: %ld\n", key, i, store[i].ttl);
            
            if (store[i].ttl > 0 && store[i].ttl <= now) {
                printf("[DEBUG] Key '%s' expired (ttl: %ld <= now: %ld), removing\n", key, store[i].ttl, now);
                // Expired - remove it
                memmove(&store[i], &store[i+1], (store_count - i - 1) * sizeof(KeyValue));
                store_count--;
                return -1;
            }
            printf("[DEBUG] Key '%s' is valid\n", key);
            return i;
        }
    }
    printf("[DEBUG] Key '%s' not found\n", key);
    return -1;
}

void set_key(const char *key, const char *value, int ttl_seconds) {
    time_t now = time(NULL);
    printf("[DEBUG] set_key('%s', '%s', %d) - current time: %ld\n", key, value, ttl_seconds, now);
    
    int idx = find_key(key);
    if (idx >= 0) {
        strncpy(store[idx].value, value, MAX_VALUE_SIZE - 1);
        store[idx].value[MAX_VALUE_SIZE - 1] = '\0';
        store[idx].ttl = ttl_seconds > 0 ? now + ttl_seconds : 0;
        printf("[DEBUG] Updated existing key '%s', new ttl: %ld\n", key, store[idx].ttl);
    } else if (store_count < 15000) {
        strncpy(store[store_count].key, key, MAX_KEY_SIZE - 1);
        store[store_count].key[MAX_KEY_SIZE - 1] = '\0';
        strncpy(store[store_count].value, value, MAX_VALUE_SIZE - 1);
        store[store_count].value[MAX_VALUE_SIZE - 1] = '\0';
        store[store_count].ttl = ttl_seconds > 0 ? now + ttl_seconds : 0;
        printf("[DEBUG] Created new key '%s' at index %d, ttl: %ld\n", key, store_count, store[store_count].ttl);
        store_count++;
    }
}

void remove_client(int idx) {
    close(clients[idx].fd);
    memmove(&clients[idx], &clients[idx+1], (client_count - idx - 1) * sizeof(Client));
    client_count--;
}

int parse_args(char *input, char **args, int max_args) {
    if (input[0] != '*') return 0;
    
    int argc = atoi(input + 1);
    if (argc > max_args) argc = max_args;
    
    char *pos = strchr(input, '\n') + 1;
    
    for (int i = 0; i < argc; i++) {
        if (*pos != '$') return 0;
        int len = atoi(pos + 1);
        pos = strchr(pos, '\n') + 1;
        args[i] = pos;
        pos[len] = '\0';
        pos += len + 2;
    }
    
    return argc;
}

void handle_client_data(Client *client) {
    int received = recv(client->fd, client->input_buffer + client->input_len, 
                       BUFFER_SIZE - client->input_len - 1, 0);
    
    if (received <= 0) {
        for (int i = 0; i < client_count; i++) {
            if (clients[i].fd == client->fd) {
                remove_client(i);
                break;
            }
        }
        return;
    }
    
    client->input_len += received;
    client->input_buffer[client->input_len] = '\0';
    
    while (client->input_len > 0) {
        char *end = strstr(client->input_buffer, "\r\n");
        if (!end) break;
        
        char *args[MAX_ARGS];
        int argc = parse_args(client->input_buffer, args, MAX_ARGS);
        
        if (argc <= 0) break;
        
        char *cmd = args[0];
        for (char *p = cmd; *p; p++) *p = toupper(*p);
        
        printf("[DEBUG] Processing command: %s (argc: %d)\n", cmd, argc);
        
        if (strcmp(cmd, "PING") == 0) {
            queue_response(client, "+PONG\r\n");
        } else if (strcmp(cmd, "SET") == 0) {
            if (argc >= 3) {
                set_key(args[1], args[2], 0);
                queue_response(client, "+OK\r\n");
            } else {
                queue_response(client, "-ERR wrong number of arguments for 'set' command\r\n");
            }
        } else if (strcmp(cmd, "GET") == 0) {
            if (argc >= 2) {
                int idx = find_key(args[1]);
                if (idx >= 0) {
                    char response[MAX_VALUE_SIZE + 64];
                    snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", 
                            strlen(store[idx].value), store[idx].value);
                    queue_response(client, response);
                } else {
                    queue_response(client, "$-1\r\n");
                }
            } else {
                queue_response(client, "-ERR wrong number of arguments for 'get' command\r\n");
            }
        } else if (strcmp(cmd, "DEL") == 0) {
            if (argc >= 2) {
                int idx = find_key(args[1]);
                if (idx >= 0) {
                    memmove(&store[idx], &store[idx+1], (store_count - idx - 1) * sizeof(KeyValue));
                    store_count--;
                    queue_response(client, ":1\r\n");
                } else {
                    queue_response(client, ":0\r\n");
                }
            } else {
                queue_response(client, "-ERR wrong number of arguments for 'del' command\r\n");
            }
        } else if (strcmp(cmd, "FLUSHALL") == 0) {
            store_count = 0;
            queue_response(client, "+OK\r\n");
        } else if (strcmp(cmd, "COMMAND") == 0) {
            queue_response(client, "*0\r\n");
        } else if (strcmp(cmd, "EXPIRE") == 0) {
            printf("[DEBUG] EXPIRE command received\n");
            if (argc >= 3) {
                printf("[DEBUG] EXPIRE args: key='%s', ttl='%s'\n", args[1], args[2]);
                
                int idx = find_key(args[1]);
                if (idx >= 0) {
                    int ttl_seconds = atoi(args[2]);
                    printf("[DEBUG] EXPIRE: found key at index %d, setting ttl to %d seconds\n", idx, ttl_seconds);
                    
                    if (ttl_seconds > 0) {
                        time_t now = time(NULL);
                        store[idx].ttl = now + ttl_seconds;
                        printf("[DEBUG] EXPIRE: set ttl to %ld (now: %ld + %d)\n", store[idx].ttl, now, ttl_seconds);
                        queue_response(client, ":1\r\n");  // Success
                    } else {
                        printf("[DEBUG] EXPIRE: invalid TTL %d\n", ttl_seconds);
                        queue_response(client, ":0\r\n");  // Invalid TTL
                    }
                } else {
                    printf("[DEBUG] EXPIRE: key '%s' not found\n", args[1]);
                    queue_response(client, ":0\r\n");  // Key doesn't exist
                }
            } else {
                printf("[DEBUG] EXPIRE: wrong number of arguments\n");
                queue_response(client, "-ERR wrong number of arguments for 'expire' command\r\n");
            }
        } else if (strcmp(cmd, "TTL") == 0) {
            printf("[DEBUG] TTL command received\n");
            if (argc >= 2) {
                printf("[DEBUG] TTL for key: '%s'\n", args[1]);
                
                int idx = find_key(args[1]);
                if (idx >= 0) {
                    printf("[DEBUG] TTL: found key at index %d, ttl: %ld\n", idx, store[idx].ttl);
                    
                    if (store[idx].ttl > 0) {
                        time_t now = time(NULL);
                        int remaining = store[idx].ttl - now;
                        printf("[DEBUG] TTL: remaining time: %d seconds (ttl: %ld - now: %ld)\n", remaining, store[idx].ttl, now);
                        
                        if (remaining > 0) {
                            char response[64];
                            snprintf(response, sizeof(response), ":%d\r\n", remaining);
                            queue_response(client, response);
                        } else {
                            printf("[DEBUG] TTL: key expired\n");
                            queue_response(client, ":-2\r\n");  // Expired
                        }
                    } else {
                        printf("[DEBUG] TTL: no expiration set\n");
                        queue_response(client, ":-1\r\n");  // No expiration
                    }
                } else {
                    printf("[DEBUG] TTL: key not found\n");
                    queue_response(client, ":-2\r\n");  // Key doesn't exist
                }
            } else {
                queue_response(client, "-ERR wrong number of arguments for 'ttl' command\r\n");
            }
        } else {
            char response[256];
            snprintf(response, sizeof(response), "-ERR unknown command '%s'\r\n", cmd);
            queue_response(client, response);
        }
        
        flush_client_output(client);
        
        end += 2;
        int processed = end - client->input_buffer;
        memmove(client->input_buffer, end, client->input_len - processed);
        client->input_len -= processed;
    }
}

int main(int argc, char *argv[]) {
    int port = (argc > 1) ? atoi(argv[1]) : 6379;
    
    printf("[DEBUG] Starting Redis server with EXPIRE support on port %d\n", port);
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket");
        return 1;
    }
    
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(port);
    
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
    
    printf("[DEBUG] Redis server listening on port %d\n", port);
    
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
        
        struct timeval timeout;
        timeout.tv_sec = 1;
        timeout.tv_usec = 0;
        
        int activity = select(max_fd + 1, &readfds, &writefds, NULL, &timeout);
        
        if (activity < 0 && errno != EINTR) {
            perror("select");
            break;
        }
        
        if (activity == 0) continue;
        
        if (FD_ISSET(server_fd, &readfds)) {
            struct sockaddr_in client_addr;
            socklen_t client_len = sizeof(client_addr);
            int client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
            
            if (client_fd >= 0 && client_count < MAX_CLIENTS) {
                clients[client_count].fd = client_fd;
                clients[client_count].input_len = 0;
                clients[client_count].output_len = 0;
                clients[client_count].output_sent = 0;
                client_count++;
                printf("[DEBUG] Client connected, total clients: %d\n", client_count);
            } else if (client_fd >= 0) {
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
    }
    
    printf("[DEBUG] Shutting down Redis server\n");
    for (int i = 0; i < client_count; i++) {
        close(clients[i].fd);
    }
    close(server_fd);
    
    return 0;
}