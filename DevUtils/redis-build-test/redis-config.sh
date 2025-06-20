#!/bin/bash

# Redis Configuration Script for Large Payload Support
# Sets environment variables for configurable Redis server

export REDIS_BUFFER_SIZE=32768      # 32KB I/O buffers (was 8192)
export REDIS_MAX_VALUE_SIZE=8192    # 8KB max value (was 2048)
export REDIS_MAX_KEY_SIZE=1024      # 1KB max key (was 512)
export REDIS_MAX_CLIENTS=50         # Reduced for stability

echo "Redis Configuration Set:"
echo "  BUFFER_SIZE: $REDIS_BUFFER_SIZE bytes"
echo "  MAX_VALUE_SIZE: $REDIS_MAX_VALUE_SIZE bytes"
echo "  MAX_KEY_SIZE: $REDIS_MAX_KEY_SIZE bytes"
echo "  MAX_CLIENTS: $REDIS_MAX_CLIENTS"

# Compile the configurable Redis server
echo "Compiling configurable Redis server..."
gcc -o configurable-redis configurable-redis.c -std=c99 -O2

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
    echo "Starting Redis server with large payload support..."
    ./configurable-redis
else
    echo "❌ Compilation failed"
    exit 1
fi