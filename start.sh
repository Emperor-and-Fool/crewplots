#!/bin/bash
redis-server --daemonize no --bind 127.0.0.1 --port 6379 &
NODE_ENV=development tsx server/index.ts