#!/bin/bash

echo "Starting persistent Redis and MongoDB services..."

# Kill any existing processes
pkill -f production-redis 2>/dev/null
pkill -f mongo-proxy-server 2>/dev/null
pkill -f keepalive-manager 2>/dev/null

# Start the keepalive manager
echo "Starting keepalive manager..."
nohup node keepalive-manager.js > keepalive.log 2>&1 &
MANAGER_PID=$!

echo "Keepalive manager started with PID: $MANAGER_PID"
echo "Services will start automatically and restart if they fail"
echo ""
echo "To monitor:"
echo "  tail -f keepalive.log"
echo ""
echo "To stop:"
echo "  pkill -f keepalive-manager"

sleep 5
echo "Current status:"
ps aux | grep -E "(keepalive-manager|production-redis|mongo-proxy)" | grep -v grep