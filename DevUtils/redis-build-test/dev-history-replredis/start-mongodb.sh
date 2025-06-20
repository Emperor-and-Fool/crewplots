#!/bin/bash

# MongoDB startup script for Replit environment
MONGODB_DATA_DIR="./mongodb_data"
MONGODB_LOG_FILE="./mongodb.log"
MONGODB_PID_FILE="./mongodb.pid"

# Clean up any existing lock files
rm -f "$MONGODB_DATA_DIR/mongod.lock"

# Create data directory if it doesn't exist
mkdir -p "$MONGODB_DATA_DIR"

# Kill any existing MongoDB processes
pkill -f mongod || true

# Start MongoDB in background
mongod \
  --dbpath "$MONGODB_DATA_DIR" \
  --port 27017 \
  --bind_ip 127.0.0.1 \
  --logpath "$MONGODB_LOG_FILE" \
  --pidfilepath "$MONGODB_PID_FILE" \
  --fork \
  --quiet

# Wait for MongoDB to start
sleep 2

# Check if MongoDB is running
if pgrep -f mongod > /dev/null; then
  echo "MongoDB started successfully"
  exit 0
else
  echo "Failed to start MongoDB"
  exit 1
fi