#!/bin/bash
# Start Redis server with proper configuration
redis-server --port 6379 --bind 127.0.0.1 --protected-mode no --save "" --appendonly no --timeout 0 --tcp-keepalive 300 --daemonize yes --pidfile /tmp/redis.pid --logfile /tmp/redis.log --dir /tmp

# Wait a bit and check if Redis is running
sleep 2
if redis-cli ping > /dev/null 2>&1; then
    echo "Redis started successfully"
else
    echo "Redis failed to start, trying alternative configuration"
    redis-server --port 6379 --bind 0.0.0.0 --protected-mode no --save "" --appendonly no --daemonize yes
fi