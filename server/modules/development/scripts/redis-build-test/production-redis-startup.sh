#!/bin/bash

# Production Redis Server Startup Script
# Handles large payloads (865+ bytes) for messaging system

REDIS_DIR="/tmp/redis-server"
REDIS_EXECUTABLE="$REDIS_DIR/redis-server"
REDIS_PID_FILE="$REDIS_DIR/redis.pid"
REDIS_LOG_FILE="$REDIS_DIR/redis.log"

# Environment configuration for large payloads
export REDIS_BUFFER_SIZE=32768    # 32KB buffer for large payloads
export REDIS_MAX_VALUE_SIZE=8192  # 8KB maximum value size
export REDIS_MAX_KEY_SIZE=1024    # 1KB maximum key size
export REDIS_MAX_CLIENTS=200      # Increased client capacity

# Create Redis directory
mkdir -p "$REDIS_DIR"

# Copy the production Redis server
cp "$(dirname "$0")/production-final" "$REDIS_EXECUTABLE"
chmod +x "$REDIS_EXECUTABLE"

# Function to start Redis server
start_redis() {
    if [ -f "$REDIS_PID_FILE" ] && kill -0 $(cat "$REDIS_PID_FILE") 2>/dev/null; then
        echo "Redis server is already running (PID: $(cat $REDIS_PID_FILE))"
        return 0
    fi
    
    echo "Starting production Redis server with large payload support..."
    echo "Config: BUFFER_SIZE=$REDIS_BUFFER_SIZE, MAX_VALUE_SIZE=$REDIS_MAX_VALUE_SIZE"
    
    # Start Redis server in background
    nohup "$REDIS_EXECUTABLE" > "$REDIS_LOG_FILE" 2>&1 &
    REDIS_PID=$!
    
    # Save PID
    echo $REDIS_PID > "$REDIS_PID_FILE"
    
    # Wait for server to start
    sleep 2
    
    # Verify server is running
    if kill -0 $REDIS_PID 2>/dev/null; then
        echo "✅ Redis server started successfully (PID: $REDIS_PID)"
        echo "Log file: $REDIS_LOG_FILE"
        return 0
    else
        echo "❌ Failed to start Redis server"
        return 1
    fi
}

# Function to stop Redis server
stop_redis() {
    if [ -f "$REDIS_PID_FILE" ]; then
        PID=$(cat "$REDIS_PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            echo "Stopping Redis server (PID: $PID)..."
            kill $PID
            rm -f "$REDIS_PID_FILE"
            echo "✅ Redis server stopped"
        else
            echo "Redis server not running"
            rm -f "$REDIS_PID_FILE"
        fi
    else
        echo "Redis server not running (no PID file)"
    fi
}

# Function to restart Redis server
restart_redis() {
    stop_redis
    sleep 1
    start_redis
}

# Function to check Redis server status
status_redis() {
    if [ -f "$REDIS_PID_FILE" ] && kill -0 $(cat "$REDIS_PID_FILE") 2>/dev/null; then
        echo "✅ Redis server is running (PID: $(cat $REDIS_PID_FILE))"
        echo "Log file: $REDIS_LOG_FILE"
        return 0
    else
        echo "❌ Redis server is not running"
        return 1
    fi
}

# Main script logic
case "$1" in
    start)
        start_redis
        ;;
    stop)
        stop_redis
        ;;
    restart)
        restart_redis
        ;;
    status)
        status_redis
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo
        echo "Production Redis Server for Large Payload Support"
        echo "Optimized for messaging system payloads up to 8KB"
        exit 1
        ;;
esac

exit $?