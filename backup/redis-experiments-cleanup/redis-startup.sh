#!/bin/bash

# Redis startup script for containerized environments
# This addresses the specific persistence issues we've identified

set -e

REDIS_DIR="./Redis-replit"
REDIS_BIN="$REDIS_DIR/bin/redis-server"
REDIS_CLI="$REDIS_DIR/bin/redis-cli"
REDIS_PORT=6379
REDIS_PID_FILE="/tmp/redis_$REDIS_PORT.pid"
REDIS_LOG_FILE="/tmp/redis_$REDIS_PORT.log"

# Function to check if Redis is running
check_redis() {
    if [ -f "$REDIS_PID_FILE" ]; then
        local pid=$(cat "$REDIS_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            rm -f "$REDIS_PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to stop Redis
stop_redis() {
    if check_redis; then
        local pid=$(cat "$REDIS_PID_FILE")
        echo "Stopping Redis (PID: $pid)..."
        kill "$pid"
        sleep 2
        if kill -0 "$pid" 2>/dev/null; then
            echo "Force killing Redis..."
            kill -9 "$pid"
        fi
        rm -f "$REDIS_PID_FILE"
    fi
    
    # Also kill any orphaned redis processes
    pkill -f "redis-server.*$REDIS_PORT" 2>/dev/null || true
}

# Function to start Redis
start_redis() {
    echo "Starting Redis server..."
    
    # Make sure Redis binaries are executable
    chmod +x "$REDIS_BIN" "$REDIS_CLI"
    
    # Create minimal config for containerized environment
    cat > /tmp/redis.conf << EOF
port $REDIS_PORT
bind 0.0.0.0
protected-mode no
daemonize yes
pidfile $REDIS_PID_FILE
logfile $REDIS_LOG_FILE
save ""
appendonly no
timeout 0
tcp-keepalive 60
maxmemory 128mb
maxmemory-policy allkeys-lru
EOF

    # Start Redis with our config
    "$REDIS_BIN" /tmp/redis.conf
    
    # Wait and verify
    sleep 2
    
    if check_redis; then
        echo "Redis started successfully (PID: $(cat $REDIS_PID_FILE))"
        
        # Test connection
        if "$REDIS_CLI" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
            echo "Redis connection test: SUCCESS"
            return 0
        else
            echo "Redis connection test: FAILED"
            return 1
        fi
    else
        echo "Failed to start Redis"
        return 1
    fi
}

# Main execution
case "${1:-start}" in
    start)
        stop_redis
        start_redis
        ;;
    stop)
        stop_redis
        ;;
    restart)
        stop_redis
        sleep 1
        start_redis
        ;;
    status)
        if check_redis; then
            echo "Redis is running (PID: $(cat $REDIS_PID_FILE))"
        else
            echo "Redis is not running"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac