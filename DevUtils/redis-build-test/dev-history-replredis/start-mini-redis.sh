#!/bin/bash

# Start Mini Redis Server (jemalloc-free)
cd /home/runner/workspace

# Kill any existing mini-redis processes
pkill -f mini-redis 2>/dev/null

# Start mini-redis on port 6380
echo "Starting Mini Redis server on port 6380..."
./mini-redis 6380 > mini-redis.log 2>&1 &

# Wait a moment and check if it started
sleep 2

if pgrep -f mini-redis > /dev/null; then
    echo "✓ Mini Redis server started successfully"
    echo "  - Port: 6380"
    echo "  - No jemalloc dependencies"
    echo "  - Log file: mini-redis.log"
else
    echo "✗ Failed to start Mini Redis server"
    exit 1
fi