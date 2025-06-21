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
#define MAX_CLIENT_NAME 64

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
    char client_name[MAX_CLIENT_NAME];  // For CLIENT SETNAME
} Client;

static KeyValue store[15000];
static int store_count = 0;
static Client clients[MAX_CLIENTS];
static int client_count = 0;
static int server_fd;
static volatile int running = 1;
static time_t server_start_time;

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
    } else if (store_count < 15000) {
        strncpy(store[store_count].key, key, MAX_KEY_SIZE - 1);
        store[store_count].key[MAX_KEY_SIZE - 1] = '\0';
        strncpy(store[store_count].value, value, MAX_VALUE_SIZE - 1);
        store[store_count].value[MAX_VALUE_SIZE - 1] = '\0';
        store[store_count].ttl = ttl_seconds > 0 ? time(NULL) + ttl_seconds : 0;
        store_count++;
    }
}

// Parse RESP protocol arrays
int parse_resp_command(const char *buffer, int buffer_len, char **args, int max_args, int *consumed) {
    if (buffer_len < 1) return 0;
    
    *consumed = 0;
    
    if (buffer[0] != '*') return -1; // Must start with array
    
    // Find the end of the array count line
    int i = 1;
    while (i < buffer_len && buffer[i] != '\r') i++;
    if (i >= buffer_len - 1 || buffer[i+1] != '\n') return 0; // Need more data
    
    char count_str[32];
    int count_len = i - 1;
    if (count_len >= 32) return -1;
    memcpy(count_str, buffer + 1, count_len);
    count_str[count_len] = '\0';
    
    int argc = atoi(count_str);
    if (argc <= 0 || argc > max_args) return -1;
    
    i += 2; // Skip \r\n
    *consumed = i;
    
    // Parse each argument
    for (int arg = 0; arg < argc; arg++) {
        if (i >= buffer_len) return 0; // Need more data
        
        if (buffer[i] != '$') return -1; // Must be bulk string
        
        // Find the length
        int len_start = i + 1;
        i++;
        while (i < buffer_len && buffer[i] != '\r') i++;
        if (i >= buffer_len - 1 || buffer[i+1] != '\n') return 0; // Need more data
        
        char len_str[32];
        int len_len = i - len_start;
        if (len_len >= 32) return -1;
        memcpy(len_str, buffer + len_start, len_len);
        len_str[len_len] = '\0';
        
        int str_len = atoi(len_str);
        if (str_len < 0) return -1;
        
        i += 2; // Skip \r\n
        
        // Check if we have enough data for the string + \r\n
        if (i + str_len + 2 > buffer_len) return 0; // Need more data
        
        // Allocate and copy the argument
        args[arg] = malloc(str_len + 1);
        memcpy(args[arg], buffer + i, str_len);
        args[arg][str_len] = '\0';
        
        i += str_len + 2; // Skip string + \r\n
    }
    
    *consumed = i;
    return argc;
}

void process_command(Client *client, char **args, int argc) {
    if (argc == 0) return;
    
    char *cmd = args[0];
    
    // Convert command to uppercase
    for (int i = 0; cmd[i]; i++) {
        cmd[i] = toupper(cmd[i]);
    }
    
    // Core commands
    if (strcmp(cmd, "PING") == 0) {
        if (argc == 1) {
            queue_response(client, "+PONG\r\n");
        } else if (argc == 2) {
            // PING with message
            char response[MAX_VALUE_SIZE + 20];
            snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(args[1]), args[1]);
            queue_response(client, response);
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'ping' command\r\n");
        }
    } else if (strcmp(cmd, "ECHO") == 0) {
        if (argc == 2) {
            char response[MAX_VALUE_SIZE + 20];
            snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(args[1]), args[1]);
            queue_response(client, response);
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'echo' command\r\n");
        }
    } else if (strcmp(cmd, "QUIT") == 0) {
        queue_response(client, "+OK\r\n");
        // Mark client for disconnection (we'll handle this in main loop)
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
                char response[MAX_VALUE_SIZE + 100];
                snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(store[idx].value), store[idx].value);
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
    } else if (strcmp(cmd, "EXISTS") == 0) {
        if (argc >= 2) {
            int idx = find_key(args[1]);
            queue_response(client, idx >= 0 ? ":1\r\n" : ":0\r\n");
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'exists' command\r\n");
        }
    } else if (strcmp(cmd, "TTL") == 0) {
        if (argc >= 2) {
            int idx = find_key(args[1]);
            if (idx >= 0) {
                if (store[idx].ttl == 0) {
                    queue_response(client, ":-1\r\n"); // No expiration
                } else {
                    time_t remaining = store[idx].ttl - time(NULL);
                    if (remaining <= 0) {
                        queue_response(client, ":-2\r\n"); // Key doesn't exist (expired)
                    } else {
                        char response[32];
                        snprintf(response, sizeof(response), ":%ld\r\n", remaining);
                        queue_response(client, response);
                    }
                }
            } else {
                queue_response(client, ":-2\r\n"); // Key doesn't exist
            }
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'ttl' command\r\n");
        }
    } else if (strcmp(cmd, "AUTH") == 0) {
        queue_response(client, "+OK\r\n");
    } else if (strcmp(cmd, "SELECT") == 0) {
        queue_response(client, "+OK\r\n");
    } else if (strcmp(cmd, "INFO") == 0) {
        char info[2048];
        time_t uptime = time(NULL) - server_start_time;
        
        if (argc == 1) {
            // Full INFO
            snprintf(info, sizeof(info), 
                "# Server\r\n"
                "redis_version:7.0.0-compat\r\n"
                "uptime_in_seconds:%ld\r\n"
                "tcp_port:6379\r\n"
                "# Memory\r\n"
                "used_memory:%lu\r\n"
                "# Keyspace\r\n"
                "db0:keys=%d,expires=0,avg_ttl=0\r\n",
                uptime,
                store_count * sizeof(KeyValue),
                store_count);
        } else {
            // Section-specific INFO
            if (strcmp(args[1], "memory") == 0 || strcmp(args[1], "MEMORY") == 0) {
                snprintf(info, sizeof(info), 
                    "# Memory\r\n"
                    "used_memory:%lu\r\n", 
                    store_count * sizeof(KeyValue));
            } else if (strcmp(args[1], "server") == 0 || strcmp(args[1], "SERVER") == 0) {
                snprintf(info, sizeof(info), 
                    "# Server\r\n"
                    "redis_version:7.0.0-compat\r\n"
                    "uptime_in_seconds:%ld\r\n"
                    "tcp_port:6379\r\n", 
                    uptime);
            } else {
                snprintf(info, sizeof(info), "# Unknown section\r\n");
            }
        }
        
        char response[2048];
        snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(info), info);
        queue_response(client, response);
    } else if (strcmp(cmd, "CLIENT") == 0) {
        if (argc >= 2) {
            char *subcmd = args[1];
            for (int i = 0; subcmd[i]; i++) {
                subcmd[i] = toupper(subcmd[i]);
            }
            
            if (strcmp(subcmd, "SETNAME") == 0) {
                if (argc >= 3) {
                    strncpy(client->client_name, args[2], MAX_CLIENT_NAME - 1);
                    client->client_name[MAX_CLIENT_NAME - 1] = '\0';
                    queue_response(client, "+OK\r\n");
                } else {
                    queue_response(client, "-ERR wrong number of arguments for 'client setname' command\r\n");
                }
            } else if (strcmp(subcmd, "GETNAME") == 0) {
                if (strlen(client->client_name) > 0) {
                    char response[MAX_CLIENT_NAME + 20];
                    snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(client->client_name), client->client_name);
                    queue_response(client, response);
                } else {
                    queue_response(client, "$-1\r\n");
                }
            } else if (strcmp(subcmd, "LIST") == 0) {
                char client_info[1024] = "";
                for (int i = 0; i < client_count; i++) {
                    char temp[256];
                    snprintf(temp, sizeof(temp), "id=%d addr=127.0.0.1:6379 name=%s\r\n", 
                            i, strlen(clients[i].client_name) > 0 ? clients[i].client_name : "");
                    strncat(client_info, temp, sizeof(client_info) - strlen(client_info) - 1);
                }
                char response[1024];
                snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(client_info), client_info);
                queue_response(client, response);
            } else {
                queue_response(client, "+OK\r\n");
            }
        } else {
            queue_response(client, "+OK\r\n");
        }
    } else if (strcmp(cmd, "CONFIG") == 0) {
        if (argc >= 2) {
            char *subcmd = args[1];
            for (int i = 0; subcmd[i]; i++) {
                subcmd[i] = toupper(subcmd[i]);
            }
            
            if (strcmp(subcmd, "GET") == 0) {
                if (argc >= 3) {
                    // Return empty array for any config parameter
                    queue_response(client, "*0\r\n");
                } else {
                    queue_response(client, "-ERR wrong number of arguments for 'config get' command\r\n");
                }
            } else if (strcmp(subcmd, "SET") == 0) {
                queue_response(client, "+OK\r\n");
            } else {
                queue_response(client, "+OK\r\n");
            }
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'config' command\r\n");
        }
    } else if (strcmp(cmd, "COMMAND") == 0) {
        // Return empty array to satisfy ioredis
        queue_response(client, "*0\r\n");
    } else if (strcmp(cmd, "HELLO") == 0) {
        // Protocol negotiation command
        char hello_response[512];
        snprintf(hello_response, sizeof(hello_response),
            "*14\r\n"
            "$6\r\nserver\r\n"
            "$5\r\nredis\r\n"
            "$7\r\nversion\r\n"
            "$10\r\n7.0.0-compat\r\n"
            "$5\r\nproto\r\n"
            ":2\r\n"
            "$2\r\nid\r\n"
            ":1\r\n"
            "$4\r\nmode\r\n"
            "$10\r\nstandalone\r\n"
            "$4\r\nrole\r\n"
            "$6\r\nmaster\r\n"
            "$7\r\nmodules\r\n"
            "*0\r\n");
        queue_response(client, hello_response);
    } else if (strcmp(cmd, "DBSIZE") == 0) {
        char response[32];
        snprintf(response, sizeof(response), ":%d\r\n", store_count);
        queue_response(client, response);
    } else if (strcmp(cmd, "FLUSHDB") == 0) {
        store_count = 0;
        queue_response(client, "+OK\r\n");
    } else if (strcmp(cmd, "FLUSHALL") == 0) {
        store_count = 0;
        queue_response(client, "+OK\r\n");
    } else {
        char error[256];
        snprintf(error, sizeof(error), "-ERR unknown command '%s'\r\n", cmd);
        queue_response(client, error);
    }
}

void handle_client_data(Client *client) {
    char temp_buffer[BUFFER_SIZE];
    int bytes_received = recv(client->fd, temp_buffer, sizeof(temp_buffer) - 1, MSG_DONTWAIT);
    
    if (bytes_received <= 0) {
        return;
    }
    
    // Safety check to prevent buffer overflow
    if (client->input_len + bytes_received >= BUFFER_SIZE - 1) {
        if (client->input_len > 0) {
            return;
        } else {
            return;
        }
    }
    
    memcpy(client->input_buffer + client->input_len, temp_buffer, bytes_received);
    client->input_len += bytes_received;
    
    // Process commands
    while (client->input_len > 0) {
        char *args[MAX_ARGS];
        int consumed = 0;
        int argc = parse_resp_command(client->input_buffer, client->input_len, args, MAX_ARGS, &consumed);
        
        if (argc > 0) {
            process_command(client, args, argc);
            
            // Free allocated arguments
            for (int i = 0; i < argc; i++) {
                free(args[i]);
            }
            
            // Remove processed data from buffer
            if (consumed > 0 && consumed <= client->input_len) {
                memmove(client->input_buffer, client->input_buffer + consumed, client->input_len - consumed);
                client->input_len -= consumed;
            } else {
                break;
            }
        } else if (argc == 0) {
            break; // Need more data
        } else {
            // Parse error, clear buffer
            client->input_len = 0;
            break;
        }
    }
}

void remove_client(int index) {
    close(clients[index].fd);
    memmove(&clients[index], &clients[index + 1], (client_count - index - 1) * sizeof(Client));
    client_count--;
}

int main() {
    server_start_time = time(NULL);
    
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
    addr.sin_port = htons(6380);
    
    if (bind(server_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("bind");
        return 1;
    }
    
    if (listen(server_fd, 10) < 0) {
        perror("listen");
        return 1;
    }
    
    printf("Redis-compatible server listening on 127.0.0.1:6380\n");
    
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
            break;
        }
        
        if (FD_ISSET(server_fd, &readfds)) {
            int client_fd = accept(server_fd, NULL, NULL);
            if (client_fd >= 0 && client_count < MAX_CLIENTS) {
                clients[client_count].fd = client_fd;
                clients[client_count].input_len = 0;
                clients[client_count].output_len = 0;
                clients[client_count].output_sent = 0;
                clients[client_count].client_name[0] = '\0';
                client_count++;
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
        
        // Clean up disconnected clients
        for (int i = client_count - 1; i >= 0; i--) {
            char test_byte;
            int result = recv(clients[i].fd, &test_byte, 1, MSG_PEEK | MSG_DONTWAIT);
            if (result == 0 || (result < 0 && errno != EAGAIN && errno != EWOULDBLOCK)) {
                remove_client(i);
            }
        }
    }
    
    close(server_fd);
    for (int i = 0; i < client_count; i++) {
        close(clients[i].fd);
    }
    
    printf("Redis server shutting down\n");
    return 0;
}