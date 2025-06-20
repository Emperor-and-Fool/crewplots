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

// Configurable parameters - can be set via environment variables
static int BUFFER_SIZE = 8192;
static int MAX_VALUE_SIZE = 2048;
static int MAX_KEY_SIZE = 512;
static int MAX_CLIENTS = 100;
static int MAX_ARGS = 32;

typedef struct {
    char *key;
    char *value;
    time_t ttl;
} KeyValue;

typedef struct {
    int fd;
    char *input_buffer;
    int input_len;
    char *output_buffer;
    int output_len;
    int output_sent;
} Client;

static KeyValue *store = NULL;
static int store_count = 0;
static int store_capacity = 10000;
static Client *clients = NULL;
static int client_count = 0;
static int server_fd;
static volatile int running = 1;

void load_config() {
    char *env_val;
    
    if ((env_val = getenv("REDIS_BUFFER_SIZE"))) {
        BUFFER_SIZE = atoi(env_val);
        if (BUFFER_SIZE < 1024) BUFFER_SIZE = 1024;
        if (BUFFER_SIZE > 1048576) BUFFER_SIZE = 1048576; // 1MB max
    }
    
    if ((env_val = getenv("REDIS_MAX_VALUE_SIZE"))) {
        MAX_VALUE_SIZE = atoi(env_val);
        if (MAX_VALUE_SIZE < 256) MAX_VALUE_SIZE = 256;
        if (MAX_VALUE_SIZE > 524288) MAX_VALUE_SIZE = 524288; // 512KB max
    }
    
    if ((env_val = getenv("REDIS_MAX_KEY_SIZE"))) {
        MAX_KEY_SIZE = atoi(env_val);
        if (MAX_KEY_SIZE < 64) MAX_KEY_SIZE = 64;
        if (MAX_KEY_SIZE > 8192) MAX_KEY_SIZE = 8192;
    }
    
    if ((env_val = getenv("REDIS_MAX_CLIENTS"))) {
        MAX_CLIENTS = atoi(env_val);
        if (MAX_CLIENTS < 1) MAX_CLIENTS = 1;
        if (MAX_CLIENTS > 1000) MAX_CLIENTS = 1000;
    }
    
    printf("Configuration loaded:\n");
    printf("  BUFFER_SIZE: %d\n", BUFFER_SIZE);
    printf("  MAX_VALUE_SIZE: %d\n", MAX_VALUE_SIZE);
    printf("  MAX_KEY_SIZE: %d\n", MAX_KEY_SIZE);
    printf("  MAX_CLIENTS: %d\n", MAX_CLIENTS);
}

int init_memory() {
    store = malloc(store_capacity * sizeof(KeyValue));
    if (!store) return 0;
    
    clients = malloc(MAX_CLIENTS * sizeof(Client));
    if (!clients) {
        free(store);
        return 0;
    }
    
    // Initialize client buffers
    for (int i = 0; i < MAX_CLIENTS; i++) {
        clients[i].input_buffer = malloc(BUFFER_SIZE);
        clients[i].output_buffer = malloc(BUFFER_SIZE);
        if (!clients[i].input_buffer || !clients[i].output_buffer) {
            // Cleanup on failure
            for (int j = 0; j <= i; j++) {
                free(clients[j].input_buffer);
                free(clients[j].output_buffer);
            }
            free(clients);
            free(store);
            return 0;
        }
        clients[i].fd = -1;
        clients[i].input_len = 0;
        clients[i].output_len = 0;
        clients[i].output_sent = 0;
    }
    
    return 1;
}

void cleanup_memory() {
    if (store) {
        for (int i = 0; i < store_count; i++) {
            free(store[i].key);
            free(store[i].value);
        }
        free(store);
    }
    
    if (clients) {
        for (int i = 0; i < MAX_CLIENTS; i++) {
            free(clients[i].input_buffer);
            free(clients[i].output_buffer);
        }
        free(clients);
    }
}

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
    for (int i = 0; i < store_count; i++) {
        if (store[i].key && strcmp(store[i].key, key) == 0) {
            if (store[i].ttl > 0 && store[i].ttl <= now) {
                free(store[i].key);
                free(store[i].value);
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
        free(store[idx].value);
        store[idx].value = strdup(value);
        store[idx].ttl = ttl_seconds > 0 ? time(NULL) + ttl_seconds : 0;
    } else if (store_count < store_capacity) {
        store[store_count].key = strdup(key);
        store[store_count].value = strdup(value);
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
        free(store[idx].key);
        free(store[idx].value);
        memmove(&store[idx], &store[idx+1], (store_count - idx - 1) * sizeof(KeyValue));
        store_count--;
        return 1;
    }
    return 0;
}

// Enhanced RESP parser with fixed buffer management
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
    
    // Use static storage with fixed size based on maximum possible values
    static char arg_storage[32][8192]; // MAX_ARGS=32, MAX_VALUE_SIZE up to 8192
    
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
        if (arg_len < 0 || arg_len >= 8192) return -1; // Fixed upper bound
        
        pos = len_end + 2; // Skip \r\n after length
        
        // Check if we have the complete argument data
        if (pos + arg_len + 2 > buffer_len) return -1; // Incomplete data
        
        // Store argument with bounds checking
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
            char *response = malloc(strlen(args[1]) + 20);
            int msg_len = strlen(args[1]);
            snprintf(response, strlen(args[1]) + 20, "$%d\r\n%s\r\n", msg_len, args[1]);
            queue_response(client, response);
            free(response);
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
            char *value = get_key(args[1]);
            if (value) {
                char *response = malloc(strlen(value) + 20);
                snprintf(response, strlen(value) + 20, "$%ld\r\n%s\r\n", strlen(value), value);
                queue_response(client, response);
                free(response);
            } else {
                queue_response(client, "$-1\r\n");
            }
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'get' command\r\n");
        }
    } else if (strcmp(cmd, "DEL") == 0) {
        if (argc >= 2) {
            int deleted = delete_key(args[1]);
            char response[32];
            snprintf(response, sizeof(response), ":%d\r\n", deleted);
            queue_response(client, response);
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'del' command\r\n");
        }
    } else if (strcmp(cmd, "EXISTS") == 0) {
        if (argc >= 2) {
            char *value = get_key(args[1]);
            queue_response(client, value ? ":1\r\n" : ":0\r\n");
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'exists' command\r\n");
        }
    } else if (strcmp(cmd, "AUTH") == 0) {
        queue_response(client, "+OK\r\n");
    } else if (strcmp(cmd, "SELECT") == 0) {
        queue_response(client, "+OK\r\n");
    } else if (strcmp(cmd, "INFO") == 0) {
        char info[1024];
        snprintf(info, sizeof(info), "$%d\r\nkeys:%d\r\nused_memory:%lu\r\nmax_value_size:%d\r\nbuffer_size:%d\r\n", 
                 (int)strlen("keys:") + 10 + (int)strlen("used_memory:") + 20 + (int)strlen("max_value_size:") + 10 + (int)strlen("buffer_size:") + 10,
                 store_count, 
                 store_count * sizeof(KeyValue),
                 MAX_VALUE_SIZE,
                 BUFFER_SIZE);
        queue_response(client, info);
    } else if (strcmp(cmd, "CLIENT") == 0) {
        queue_response(client, "+OK\r\n");
    } else if (strcmp(cmd, "COMMAND") == 0) {
        queue_response(client, "*0\r\n");
    } else {
        char error[256];
        snprintf(error, sizeof(error), "-ERR unknown command '%s'\r\n", cmd);
        queue_response(client, error);
    }
}

void handle_client_data(Client *client) {
    char *temp_buffer = malloc(BUFFER_SIZE);
    if (!temp_buffer) return;
    
    int bytes_received = recv(client->fd, temp_buffer, BUFFER_SIZE - 1, MSG_DONTWAIT);
    
    if (bytes_received <= 0) {
        free(temp_buffer);
        return;
    }
    
    if (client->input_len + bytes_received >= BUFFER_SIZE - 1) {
        client->input_len = 0;
        free(temp_buffer);
        return;
    }
    
    memcpy(client->input_buffer + client->input_len, temp_buffer, bytes_received);
    client->input_len += bytes_received;
    free(temp_buffer);
    
    while (client->input_len > 0) {
        char **args = malloc(MAX_ARGS * sizeof(char*));
        if (!args) break;
        
        int consumed = 0;
        int argc = parse_resp_command(client->input_buffer, client->input_len, args, MAX_ARGS, &consumed);
        
        if (argc > 0) {
            process_command(client, args, argc);
            
            if (consumed > 0 && consumed <= client->input_len) {
                memmove(client->input_buffer, client->input_buffer + consumed, client->input_len - consumed);
                client->input_len -= consumed;
            } else {
                free(args);
                break;
            }
        } else if (argc == 0) {
            free(args);
            break;
        } else {
            client->input_len = 0;
            free(args);
            break;
        }
        
        free(args);
    }
}

void remove_client(int index) {
    close(clients[index].fd);
    clients[index].fd = -1;
    clients[index].input_len = 0;
    clients[index].output_len = 0;
    clients[index].output_sent = 0;
    
    memmove(&clients[index], &clients[index + 1], (client_count - index - 1) * sizeof(Client));
    client_count--;
}

int main() {
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    signal(SIGPIPE, SIG_IGN);
    
    load_config();
    
    if (!init_memory()) {
        fprintf(stderr, "Failed to allocate memory\n");
        return 1;
    }
    
    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket");
        cleanup_memory();
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
        cleanup_memory();
        return 1;
    }
    
    if (listen(server_fd, 10) < 0) {
        perror("listen");
        close(server_fd);
        cleanup_memory();
        return 1;
    }
    
    printf("Configurable Redis server listening on 127.0.0.1:6379\n");
    
    while (running) {
        fd_set readfds, writefds;
        FD_ZERO(&readfds);
        FD_ZERO(&writefds);
        
        FD_SET(server_fd, &readfds);
        int max_fd = server_fd;
        
        for (int i = 0; i < client_count; i++) {
            if (clients[i].fd >= 0) {
                FD_SET(clients[i].fd, &readfds);
                if (clients[i].output_len > clients[i].output_sent) {
                    FD_SET(clients[i].fd, &writefds);
                }
                if (clients[i].fd > max_fd) {
                    max_fd = clients[i].fd;
                }
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
            
            if (client_fd >= 0 && client_count < MAX_CLIENTS) {
                clients[client_count].fd = client_fd;
                clients[client_count].input_len = 0;
                clients[client_count].output_len = 0;
                clients[client_count].output_sent = 0;
                client_count++;
            } else if (client_fd >= 0) {
                close(client_fd);
            }
        }
        
        for (int i = 0; i < client_count; i++) {
            if (clients[i].fd >= 0) {
                if (FD_ISSET(clients[i].fd, &readfds)) {
                    handle_client_data(&clients[i]);
                }
                
                if (FD_ISSET(clients[i].fd, &writefds)) {
                    flush_client_output(&clients[i]);
                }
            }
        }
        
        // Check for disconnected clients
        for (int i = client_count - 1; i >= 0; i--) {
            if (clients[i].fd >= 0) {
                char test;
                int result = recv(clients[i].fd, &test, 1, MSG_PEEK | MSG_DONTWAIT);
                if (result == 0 || (result < 0 && errno != EAGAIN && errno != EWOULDBLOCK)) {
                    remove_client(i);
                }
            }
        }
    }
    
    for (int i = 0; i < client_count; i++) {
        if (clients[i].fd >= 0) {
            close(clients[i].fd);
        }
    }
    close(server_fd);
    cleanup_memory();
    
    printf("Redis server stopped\n");
    return 0;
}