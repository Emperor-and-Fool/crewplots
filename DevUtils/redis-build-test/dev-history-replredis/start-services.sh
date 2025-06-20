#!/bin/bash

echo "Starting Redis and MongoDB services..."

# Kill any existing processes
pkill -f production-redis 2>/dev/null
pkill -f mongo-proxy-server 2>/dev/null

# Start Redis server
echo "Starting Redis server..."
nohup ./production-redis > /dev/null 2>&1 &
REDIS_PID=$!

# Wait for Redis to start
sleep 2

# Test Redis
echo "Testing Redis connectivity..."
node -e "
const Redis = require('ioredis');
const client = new Redis({host:'127.0.0.1',port:6379,lazyConnect:true,connectTimeout:3000});
client.connect()
  .then(() => client.ping())
  .then(r => console.log('✅ Redis:', r))
  .catch(e => console.log('❌ Redis: Failed to connect'))
  .finally(() => client.disconnect());
"

# Start MongoDB proxy
echo "Starting MongoDB proxy..."
nohup node mongo-proxy-server.js > /dev/null 2>&1 &
MONGO_PID=$!

sleep 3

echo "Services started:"
ps aux | grep -E "(production-redis|mongo-proxy)" | grep -v grep || echo "No services running"

echo "Redis PID: $REDIS_PID"
echo "MongoDB PID: $MONGO_PID"