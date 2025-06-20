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

// Fixed constants for array sizes
#define MAX_ARGS 32

// Configurable values - optimized for large payloads
static int MAX_CLIENTS = 100;
static int BUFFER_SIZE = 16384;    // Increased from 8192
static int MAX_KEY_SIZE = 1024;    // Increased from 512
static int MAX_VALUE_SIZE = 4096;  // Increased from 2048

void load_config() {
    char *env_val;
    
    if ((env_val = getenv("REDIS_BUFFER_SIZE"))) {
        int val = atoi(env_val);
        if (val >= 1024 && val <= 65536) BUFFER_SIZE = val;
    }
    
    if ((env_val = getenv("REDIS_MAX_VALUE_SIZE"))) {
        int val = atoi(env_val);
        if (val >= 256 && val <= 16384) MAX_VALUE_SIZE = val;
    }
    
    if ((env_val = getenv("REDIS_MAX_KEY_SIZE"))) {
        int val = atoi(env_val);
        if (val >= 64 && val <= 2048) MAX_KEY_SIZE = val;
    }
    
    if ((env_val = getenv("REDIS_MAX_CLIENTS"))) {
        int val = atoi(env_val);
        if (val >= 1 && val <= 1000) MAX_CLIENTS = val;
    }
    
    printf("Redis Config: BUFFER_SIZE=%d, MAX_VALUE_SIZE=%d, MAX_KEY_SIZE=%d, MAX_CLIENTS=%d\n", 
           BUFFER_SIZE, MAX_VALUE_SIZE, MAX_KEY_SIZE, MAX_CLIENTS);
}

typedef struct {
    char key[1024];
    char value[4096];
    time_t expiry;
} KeyValue;

typedef struct {
    int fd;
    char *buffer;
    int buffer_len;
    int buffer_capacity;
    char *response_queue;
    int response_len;
    int response_sent;
    int response_capacity;
} Client;

static KeyValue *store;
static int store_count = 0;
static int store_capacity = 1000;
static Client *clients;
static int client_count = 0;

void cleanup_expired_keys() {
    time_t now = time(NULL);
    for (int i = store_count - 1; i >= 0; i--) {
        if (store[i].expiry > 0 && store[i].expiry <= now) {
            memmove(&store[i], &store[i+1], (store_count - i - 1) * sizeof(KeyValue));
            store_count--;
        }
    }
}

void set_key(const char *key, const char *value, int ttl) {
    cleanup_expired_keys();
    
    // Update existing key
    for (int i = 0; i < store_count; i++) {
        if (strcmp(store[i].key, key) == 0) {
            strncpy(store[i].value, value, sizeof(store[i].value) - 1);
            store[i].value[sizeof(store[i].value) - 1] = '\0';
            store[i].expiry = ttl > 0 ? time(NULL) + ttl : 0;
            return;
        }
    }
    
    // Add new key
    if (store_count < store_capacity) {
        strncpy(store[store_count].key, key, sizeof(store[store_count].key) - 1);
        store[store_count].key[sizeof(store[store_count].key) - 1] = '\0';
        strncpy(store[store_count].value, value, sizeof(store[store_count].value) - 1);
        store[store_count].value[sizeof(store[store_count].value) - 1] = '\0';
        store[store_count].expiry = ttl > 0 ? time(NULL) + ttl : 0;
        store_count++;
    }
}

char* get_key(const char *key) {
    cleanup_expired_keys();
    for (int i = 0; i < store_count; i++) {
        if (strcmp(store[i].key, key) == 0) {
            return store[i].value;
        }
    }
    return NULL;
}

void queue_response(Client *client, const char *response) {
    int len = strlen(response);
    if (client->response_len + len >= client->response_capacity) {
        // Expand response buffer
        client->response_capacity = (client->response_len + len) * 2;
        client->response_queue = realloc(client->response_queue, client->response_capacity);
    }
    memcpy(client->response_queue + client->response_len, response, len);
    client->response_len += len;
}

int parse_resp_command(const char *buffer, int buffer_len, char **args, int max_args, int *consumed) {
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
        
        // Store argument (create null-terminated copy) - dynamic allocation for large payloads
        static char *arg_storage[MAX_ARGS];
        static int arg_storage_sizes[MAX_ARGS];
        
        if (arg_storage_sizes[i] < arg_len + 1) {
            arg_storage[i] = realloc(arg_storage[i], arg_len + 1);
            arg_storage_sizes[i] = arg_len + 1;
        }
        
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
            char *response = malloc(strlen(args[1]) + 64);
            int msg_len = strlen(args[1]);
            snprintf(response, strlen(args[1]) + 64, "$%d\r\n%s\r\n", msg_len, args[1]);
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
                char *response = malloc(strlen(value) + 64);
                snprintf(response, strlen(value) + 64, "$%ld\r\n%s\r\n", strlen(value), value);
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
            int deleted = 0;
            for (int i = 1; i < argc; i++) {
                for (int j = 0; j < store_count; j++) {
                    if (strcmp(store[j].key, args[i]) == 0) {
                        memmove(&store[j], &store[j+1], (store_count - j - 1) * sizeof(KeyValue));
                        store_count--;
                        deleted++;
                        break;
                    }
                }
            }
            char response[32];
            snprintf(response, sizeof(response), ":%d\r\n", deleted);
            queue_response(client, response);
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'del' command\r\n");
        }
    } else if (strcmp(cmd, "EXISTS") == 0) {
        if (argc >= 2) {
            int exists = 0;
            for (int i = 1; i < argc; i++) {
                if (get_key(args[i])) exists++;
            }
            char response[32];
            snprintf(response, sizeof(response), ":%d\r\n", exists);
            queue_response(client, response);
        } else {
            queue_response(client, "-ERR wrong number of arguments for 'exists' command\r\n");
        }
    } else if (strcmp(cmd, "FLUSHALL") == 0) {
        store_count = 0;
        queue_response(client, "+OK\r\n");
    } else {
        queue_response(client, "-ERR unknown command\r\n");
    }
}

void handle_client_data(Client *client) {
    int pos = 0;
    while (pos < client->buffer_len) {
        char *args[MAX_ARGS];
        int consumed;
        int argc = parse_resp_command(client->buffer + pos, client->buffer_len - pos, args, MAX_ARGS, &consumed);
        
        if (argc <= 0) {
            break; // Incomplete command or parse error
        }
        
        process_command(client, args, argc);
        pos += consumed;
    }
    
    // Remove processed data from buffer
    if (pos > 0) {
        memmove(client->buffer, client->buffer + pos, client->buffer_len - pos);
        client->buffer_len -= pos;
    }
}

int main() {
    load_config();
    
    // Allocate dynamic storage
    store = malloc(store_capacity * sizeof(KeyValue));
    clients = malloc(MAX_CLIENTS * sizeof(Client));
    
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket failed");
        exit(EXIT_FAILURE);
    }
    
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    struct sockaddr_in address;
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = inet_addr("127.0.0.1");
    address.sin_port = htons(6380);
    
    if (bind(server_fd, (struct sockaddr*)&address, sizeof(address)) < 0) {
        perror("bind failed");
        close(server_fd);
        exit(EXIT_FAILURE);
    }
    
    if (listen(server_fd, 10) < 0) {
        perror("listen failed");
        close(server_fd);
        exit(EXIT_FAILURE);
    }
    
    printf("Production Redis server listening on 127.0.0.1:6379\n");
    printf("Ready to accept connections\n");
    fflush(stdout);
    
    while (1) {
        fd_set read_fds, write_fds;
        FD_ZERO(&read_fds);
        FD_ZERO(&write_fds);
        
        int max_fd = server_fd;
        FD_SET(server_fd, &read_fds);
        
        for (int i = 0; i < client_count; i++) {
            FD_SET(clients[i].fd, &read_fds);
            if (clients[i].response_len > clients[i].response_sent) {
                FD_SET(clients[i].fd, &write_fds);
            }
            if (clients[i].fd > max_fd) {
                max_fd = clients[i].fd;
            }
        }
        
        struct timeval timeout;
        timeout.tv_sec = 1;
        timeout.tv_usec = 0;
        
        int activity = select(max_fd + 1, &read_fds, &write_fds, NULL, &timeout);
        
        if (activity < 0) {
            perror("select error");
            break;
        }
        
        // New connection
        if (FD_ISSET(server_fd, &read_fds)) {
            struct sockaddr_in client_addr;
            socklen_t client_len = sizeof(client_addr);
            int client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
            
            if (client_fd >= 0 && client_count < MAX_CLIENTS) {
                clients[client_count].fd = client_fd;
                clients[client_count].buffer = malloc(BUFFER_SIZE);
                clients[client_count].buffer_len = 0;
                clients[client_count].buffer_capacity = BUFFER_SIZE;
                clients[client_count].response_queue = malloc(BUFFER_SIZE);
                clients[client_count].response_len = 0;
                clients[client_count].response_sent = 0;
                clients[client_count].response_capacity = BUFFER_SIZE;
                client_count++;
            } else if (client_fd >= 0) {
                close(client_fd);
            }
        }
        
        // Handle existing clients
        for (int i = 0; i < client_count; i++) {
            // Read data
            if (FD_ISSET(clients[i].fd, &read_fds)) {
                // Expand buffer if needed
                if (clients[i].buffer_len + 1024 >= clients[i].buffer_capacity) {
                    clients[i].buffer_capacity *= 2;
                    clients[i].buffer = realloc(clients[i].buffer, clients[i].buffer_capacity);
                }
                
                int bytes_read = read(clients[i].fd, 
                                    clients[i].buffer + clients[i].buffer_len,
                                    clients[i].buffer_capacity - clients[i].buffer_len - 1);
                
                if (bytes_read <= 0) {
                    close(clients[i].fd);
                    free(clients[i].buffer);
                    free(clients[i].response_queue);
                    memmove(&clients[i], &clients[i+1], (client_count - i - 1) * sizeof(Client));
                    client_count--;
                    i--;
                } else {
                    clients[i].buffer_len += bytes_read;
                    clients[i].buffer[clients[i].buffer_len] = '\0';
                    handle_client_data(&clients[i]);
                }
            }
            
            // Write responses
            if (i < client_count && FD_ISSET(clients[i].fd, &write_fds) && 
                clients[i].response_len > clients[i].response_sent) {
                
                int bytes_to_send = clients[i].response_len - clients[i].response_sent;
                int bytes_sent = write(clients[i].fd, 
                                     clients[i].response_queue + clients[i].response_sent,
                                     bytes_to_send);
                
                if (bytes_sent > 0) {
                    clients[i].response_sent += bytes_sent;
                    if (clients[i].response_sent >= clients[i].response_len) {
                        clients[i].response_len = 0;
                        clients[i].response_sent = 0;
                    }
                }
            }
        }
    }
    
    close(server_fd);
    free(store);
    free(clients);
    return 0;
}