#!/bin/bash

# Kill any existing Redis processes
pkill redis-server 2>/dev/null || true

# Start Redis with minimal configuration for development
redis-server --port 6379 --bind 0.0.0.0 --protected-mode no --save "" --appendonly no --daemonize yes

# Wait a moment for Redis to start
sleep 2

# Test the connection
if redis-cli ping > /dev/null 2>&1; then
    echo "Redis server started successfully on port 6379"
else
    echo "Failed to start Redis server"
    exit 1
fi