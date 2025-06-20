#!/bin/bash

# Start Redis in the background for development
echo "Starting Redis server..."
redis-server --port 6379 --bind 127.0.0.1 --protected-mode no --save "" --appendonly no &

# Wait a moment for Redis to start
sleep 2

# Test the connection
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running on port 6379"
else
    echo "❌ Redis failed to start"
fi