#!/bin/bash

# Kill any existing proxy processes
pkill -f "start-proxy.js" 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

# Start the MongoDB proxy server in the background
cd adapters-repl/mongodb-proxy
nohup node start-proxy.js > ../../logs/mongodb-proxy.log 2>&1 &

# Get the PID and save it
PROXY_PID=$!
echo $PROXY_PID > ../../logs/mongodb-proxy.pid

echo "MongoDB proxy server started with PID: $PROXY_PID"

# Wait a moment and check if it's running
sleep 5
if ps -p $PROXY_PID > /dev/null; then
    echo "MongoDB proxy server is running successfully"
    curl -s http://localhost:3001/health || echo "Health check failed"
else
    echo "MongoDB proxy server failed to start"
    cat ../../logs/mongodb-proxy.log
fi