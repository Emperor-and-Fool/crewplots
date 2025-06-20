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

int main() {
    printf("Starting minimal debug server...\n");
    
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket");
        return 1;
    }
    printf("Socket created\n");
    
    int opt = 1;
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        perror("setsockopt");
        close(server_fd);
        return 1;
    }
    printf("Socket options set\n");
    
    struct sockaddr_in addr;
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = inet_addr("127.0.0.1");
    addr.sin_port = htons(6379);
    
    if (bind(server_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("bind");
        printf("Error code: %d\n", errno);
        close(server_fd);
        return 1;
    }
    printf("Socket bound to 127.0.0.1:6379\n");
    
    if (listen(server_fd, 10) < 0) {
        perror("listen");
        close(server_fd);
        return 1;
    }
    printf("Listening for connections...\n");
    
    // Accept one connection and respond to PING
    struct sockaddr_in client_addr;
    socklen_t client_len = sizeof(client_addr);
    int client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
    
    if (client_fd >= 0) {
        printf("Client connected\n");
        
        char buffer[1024];
        int bytes = recv(client_fd, buffer, sizeof(buffer) - 1, 0);
        if (bytes > 0) {
            buffer[bytes] = '\0';
            printf("Received: %s\n", buffer);
            
            // Send PONG response
            const char *response = "+PONG\r\n";
            send(client_fd, response, strlen(response), 0);
            printf("Sent PONG\n");
        }
        
        close(client_fd);
    }
    
    close(server_fd);
    printf("Server stopped\n");
    return 0;
}