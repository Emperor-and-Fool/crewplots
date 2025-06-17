#!/bin/bash

# Redis Detective - Comprehensive logging to find why Redis stops
# This will give us detailed evidence of what's happening

set -e

REDIS_DIR="./Redis-replit"
REDIS_BIN="$REDIS_DIR/bin/redis-server"
REDIS_CLI="$REDIS_DIR/bin/redis-cli"
REDIS_PORT=6379
LOG_DIR="./redis-logs"
DETECTIVE_LOG="$LOG_DIR/detective.log"

# Create log directory
mkdir -p "$LOG_DIR"

# Logging function with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DETECTIVE_LOG"
}

# Function to capture system state
capture_system_state() {
    local stage="$1"
    log "=== SYSTEM STATE: $stage ==="
    
    # Process information
    log "Active Redis processes:"
    ps aux | grep redis | grep -v grep | tee -a "$DETECTIVE_LOG"
    
    # Port usage
    log "Port 6379 status:"
    netstat -tulpn 2>/dev/null | grep 6379 | tee -a "$DETECTIVE_LOG" || log "Port 6379 not in use"
    
    # Memory usage
    log "Memory usage:"
    free -h | tee -a "$DETECTIVE_LOG"
    
    # File descriptors
    log "Open file descriptors for Redis:"
    lsof -i :6379 2>/dev/null | tee -a "$DETECTIVE_LOG" || log "No file descriptors for port 6379"
    
    # System limits
    log "System limits:"
    ulimit -a | tee -a "$DETECTIVE_LOG"
    
    log "=== END SYSTEM STATE: $stage ==="
    echo "" >> "$DETECTIVE_LOG"
}

# Function to start Redis with extensive monitoring
start_redis_with_monitoring() {
    log "STARTING REDIS DETECTIVE SESSION"
    
    # Clean any existing Redis processes
    log "Cleaning existing Redis processes..."
    pkill -f "redis-server.*$REDIS_PORT" 2>/dev/null || true
    sleep 1
    
    capture_system_state "BEFORE_START"
    
    # Make binaries executable
    chmod +x "$REDIS_BIN" "$REDIS_CLI"
    
    # Create detailed Redis config
    cat > "$LOG_DIR/redis-detective.conf" << EOF
# Redis Detective Configuration
port $REDIS_PORT
bind 0.0.0.0
protected-mode no
daemonize no
pidfile $LOG_DIR/redis.pid
logfile $LOG_DIR/redis-server.log
loglevel verbose
save ""
appendonly no
timeout 0
tcp-keepalive 60
maxmemory 64mb
maxmemory-policy allkeys-lru

# Additional debugging
syslog-enabled yes
syslog-ident redis-detective
EOF

    log "Starting Redis with detailed monitoring..."
    log "Redis config: $LOG_DIR/redis-detective.conf"
    log "Redis binary: $REDIS_BIN"
    
    # Start Redis in background and capture PID
    "$REDIS_BIN" "$LOG_DIR/redis-detective.conf" &
    REDIS_PID=$!
    
    log "Redis started with PID: $REDIS_PID"
    
    # Monitor the process for 60 seconds
    for i in {1..60}; do
        if kill -0 "$REDIS_PID" 2>/dev/null; then
            log "Second $i: Redis PID $REDIS_PID still running"
            
            # Test connection every 10 seconds
            if [ $((i % 10)) -eq 0 ]; then
                if "$REDIS_CLI" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
                    log "Second $i: Connection test SUCCESS"
                else
                    log "Second $i: Connection test FAILED"
                fi
                capture_system_state "SECOND_$i"
            fi
        else
            log "Second $i: Redis PID $REDIS_PID has DIED"
            log "Exit code: $?"
            capture_system_state "AFTER_DEATH"
            
            # Check what happened
            log "Redis server log contents:"
            if [ -f "$LOG_DIR/redis-server.log" ]; then
                cat "$LOG_DIR/redis-server.log" | tee -a "$DETECTIVE_LOG"
            else
                log "No Redis server log found"
            fi
            
            # Check system logs for any kills
            log "Recent system messages about Redis:"
            dmesg | tail -20 | grep -i redis | tee -a "$DETECTIVE_LOG" || log "No Redis messages in dmesg"
            
            return 1
        fi
        sleep 1
    done
    
    log "Redis survived 60 seconds of monitoring!"
    capture_system_state "AFTER_60_SECONDS"
    
    # Stop Redis gracefully
    log "Stopping Redis gracefully..."
    kill "$REDIS_PID"
    wait "$REDIS_PID" 2>/dev/null || true
    
    return 0
}

# Run the detective investigation
log "Starting Redis Detective Investigation"
start_redis_with_monitoring

log "Investigation complete. Check logs in: $LOG_DIR"
log "Main detective log: $DETECTIVE_LOG"