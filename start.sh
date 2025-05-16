#!/bin/bash
# Start.sh - Application Startup Script with Redis Management
#
# This script handles the startup of both Redis and the Node.js application
# for the Crew Plots Pro hospitality management platform.
#
# Purpose:
# - Starts Redis server (required for session management)
# - Launches the Node.js application server
# - Ensures proper environment setup

# Start Redis in the foreground but in the background of this script
# Parameters:
# --daemonize no     - Keep Redis in foreground (for proper monitoring by Replit)
# --bind 127.0.0.1   - Only accept connections from localhost for security
# --port 6379        - Use the default Redis port
redis-server --daemonize no --bind 127.0.0.1 --port 6379 &
REDIS_PID=$!

# Start the Node.js application with TypeScript support
# Sets development environment for proper debugging and hot reloading
NODE_ENV=development tsx server/index.ts

# Note: When the Node.js application exits, the script will terminate
# and Replit will automatically kill any remaining processes (Redis)