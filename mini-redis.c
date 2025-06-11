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

// Parse RESP-2 protocol array commands
int parse_resp_array(char *buffer, char **args, int max_args) {
    if (*buffer != '*') return -1;
    
    int arg_count = atoi(buffer + 1);
    if (arg_count > max_args || arg_count <= 0) return -1;
    
    char *pos = buffer;
    // Find first \r\n
    while (*pos && !(*pos == '\r' && *(pos+1) == '\n')) pos++;
    if (!*pos) return -1;
    pos += 2; // Skip \r\n
    
    for (int i = 0; i < arg_count; i++) {
        if (*pos != '$') return -1;
        int len = atoi(pos + 1);
        if (len < 0) return -1;
        
        // Find \r\n after length
        while (*pos && !(*pos == '\r' && *(pos+1) == '\n')) pos++;
        if (!*pos) return -1;
        pos += 2; // Skip \r\n
        
        args[i] = pos;
        if (len > 0) {
            // Ensure we don't read beyond buffer bounds
            for (int j = 0; j < len; j++) {
                if (!pos[j]) return -1;
            }
            // Null terminate the argument (temporary modification)
            char saved = pos[len];
            pos[len] = '\0';
            pos += len;
            
            // Skip \r\n after data
            if (*pos == '\r' && *(pos+1) == '\n') {
                pos += 2;
            } else {
                // Restore character and fail
                pos[-(len)] = saved;
                return -1;
            }
        } else {
            args[i] = "";
            // Skip \r\n for empty string
            if (*pos == '\r' && *(pos+1) == '\n') {
                pos += 2;
            } else {
                return -1;
            }
        }
    }
    
    return arg_count;
}

void process_command(int client_fd, char *buffer) {
    char *args[16];
    int argc = parse_resp_array(buffer, args, 16);
    
    if (argc < 1) {
        // Fallback to simple string parsing for inline commands
        char *saveptr;
        char *cmd = strtok_r(buffer, " \r\n", &saveptr);
        if (!cmd) return;
        
        // Convert to uppercase
        for (char *p = cmd; *p; p++) *p = toupper(*p);
        
        // Simple command processing
        if (strcmp(cmd, "PING") == 0) {
            send_response(client_fd, "+PONG\r\n");
            return;
        }
        send_response(client_fd, "-ERR unknown command\r\n");
        return;
    }
    
    char *cmd = args[0];
    // Convert to uppercase
    for (char *p = cmd; *p; p++) *p = toupper(*p);
    
    if (strcmp(cmd, "PING") == 0) {
        send_response(client_fd, "+PONG\r\n");
    } else if (strcmp(cmd, "AUTH") == 0) {
        // Accept any auth for compatibility
        send_response(client_fd, "+OK\r\n");
    } else if (strcmp(cmd, "SET") == 0) {
        if (argc >= 3) {
            char *key = args[1];
            char *value = args[2];
            int ttl = 0;
            
            // Check for EX parameter
            if (argc >= 5 && strcasecmp(args[3], "EX") == 0) {
                ttl = atoi(args[4]);
            }
            
            set_key(key, value, ttl);
            send_response(client_fd, "+OK\r\n");
        } else {
            send_response(client_fd, "-ERR wrong number of arguments for 'set' command\r\n");
        }
    } else if (strcmp(cmd, "GET") == 0) {
        if (argc >= 2) {
            char *key = args[1];
            char *value = get_key(key);
            if (value) {
                char response[BUFFER_SIZE];
                snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(value), value);
                send_response(client_fd, response);
            } else {
                send_response(client_fd, "$-1\r\n");
            }
        } else {
            send_response(client_fd, "-ERR wrong number of arguments for 'get' command\r\n");
        }
    } else if (strcmp(cmd, "EXISTS") == 0) {
        if (argc >= 2) {
            char *key = args[1];
            int exists = exists_key(key);
            char response[64];
            snprintf(response, sizeof(response), ":%d\r\n", exists);
            send_response(client_fd, response);
        } else {
            send_response(client_fd, "-ERR wrong number of arguments for 'exists' command\r\n");
        }
    } else if (strcmp(cmd, "DEL") == 0) {
        if (argc >= 2) {
            char *key = args[1];
            int deleted = delete_key(key);
            char response[64];
            snprintf(response, sizeof(response), ":%d\r\n", deleted);
            send_response(client_fd, response);
        } else {
            send_response(client_fd, "-ERR wrong number of arguments for 'del' command\r\n");
        }
    } else if (strcmp(cmd, "FLUSHALL") == 0 || strcmp(cmd, "FLUSHDB") == 0) {
        store_count = 0;
        send_response(client_fd, "+OK\r\n");
    } else if (strcmp(cmd, "QUIT") == 0) {
        send_response(client_fd, "+OK\r\n");
        return; // Client will close connection
    } else if (strcmp(cmd, "KEYS") == 0) {
        char *pattern = (argc >= 2) ? args[1] : "*";
        
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
        char info_response[] = "# Server\r\nredis_version:7.0.0\r\nredis_mode:standalone\r\n";
        char response[512];
        snprintf(response, sizeof(response), "$%ld\r\n%s\r\n", strlen(info_response), info_response);
        send_response(client_fd, response);
    } else if (strcmp(cmd, "CLIENT") == 0) {
        if (argc >= 2) {
            char *subcmd = args[1];
            if (strcasecmp(subcmd, "SETNAME") == 0) {
                send_response(client_fd, "+OK\r\n");
            } else if (strcasecmp(subcmd, "LIST") == 0) {
                send_response(client_fd, "*0\r\n");
            } else {
                send_response(client_fd, "+OK\r\n");
            }
        } else {
            send_response(client_fd, "+OK\r\n");
        }
    } else if (strcmp(cmd, "COMMAND") == 0) {
        // Basic COMMAND response for compatibility
        send_response(client_fd, "*0\r\n");
    } else {
        char error_msg[256];
        snprintf(error_msg, sizeof(error_msg), "-ERR unknown command '%s'\r\n", cmd);
        send_response(client_fd, error_msg);
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
                        
                        // Process complete RESP commands
                        char *current_pos = clients[i].buffer;
                        while (clients[i].buffer_len > 0) {
                            // Look for complete RESP array command
                            if (*current_pos == '*') {
                                // Parse array header
                                char *header_end = strstr(current_pos, "\r\n");
                                if (!header_end) break; // Incomplete header
                                
                                int arg_count = atoi(current_pos + 1);
                                char *scan_pos = header_end + 2;
                                int complete_command = 1;
                                
                                // Check if all arguments are complete
                                for (int arg = 0; arg < arg_count; arg++) {
                                    if (scan_pos >= clients[i].buffer + clients[i].buffer_len) {
                                        complete_command = 0;
                                        break;
                                    }
                                    if (*scan_pos != '$') {
                                        complete_command = 0;
                                        break;
                                    }
                                    
                                    char *arg_len_end = strstr(scan_pos, "\r\n");
                                    if (!arg_len_end) {
                                        complete_command = 0;
                                        break;
                                    }
                                    
                                    int arg_len = atoi(scan_pos + 1);
                                    scan_pos = arg_len_end + 2 + arg_len + 2; // Skip $len\r\ndata\r\n
                                    
                                    if (scan_pos > clients[i].buffer + clients[i].buffer_len) {
                                        complete_command = 0;
                                        break;
                                    }
                                }
                                
                                if (complete_command) {
                                    // Process the complete command
                                    int cmd_len = scan_pos - current_pos;
                                    char temp_buffer[BUFFER_SIZE];
                                    memcpy(temp_buffer, current_pos, cmd_len);
                                    temp_buffer[cmd_len] = '\0';
                                    
                                    process_command(clients[i].fd, temp_buffer);
                                    
                                    // Remove processed command from buffer
                                    memmove(clients[i].buffer, scan_pos, 
                                           clients[i].buffer_len - (scan_pos - clients[i].buffer));
                                    clients[i].buffer_len -= (scan_pos - clients[i].buffer);
                                    current_pos = clients[i].buffer;
                                } else {
                                    break; // Wait for more data
                                }
                            } else {
                                // Simple string command (fallback)
                                char *line_end = strstr(current_pos, "\r\n");
                                if (line_end) {
                                    *line_end = '\0';
                                    process_command(clients[i].fd, current_pos);
                                    
                                    int processed_len = line_end - current_pos + 2;
                                    memmove(clients[i].buffer, line_end + 2, 
                                           clients[i].buffer_len - processed_len);
                                    clients[i].buffer_len -= processed_len;
                                    current_pos = clients[i].buffer;
                                } else {
                                    break; // Wait for complete line
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