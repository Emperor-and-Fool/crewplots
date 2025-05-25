#!/bin/bash

# Redis Setup Script for Crew Plots Pro
echo "Setting up Redis for Crew Plots Pro..."

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "Docker found. Starting Redis container..."
    
    # Start Redis using Docker Compose
    if [ -f "docker-compose.yml" ]; then
        echo "Starting Redis service with Docker Compose..."
        docker-compose up -d redis
        
        # Wait for Redis to be ready
        echo "Waiting for Redis to start..."
        sleep 5
        
        # Test connection
        if docker-compose exec redis redis-cli ping; then
            echo "✅ Redis is running and accessible!"
            echo "Redis Status: Connected"
            echo "Host: localhost"
            echo "Port: 6379"
        else
            echo "❌ Redis failed to start"
        fi
    else
        echo "❌ docker-compose.yml not found"
    fi
else
    echo "❌ Docker not found. Please install Docker to use this script."
    echo "Alternative: Set REDIS_HOST and REDIS_PORT environment variables to connect to an existing Redis instance."
fi

echo ""
echo "Environment variables needed:"
echo "REDIS_HOST=127.0.0.1 (or your Redis host)"
echo "REDIS_PORT=6379"
echo "REDIS_PASSWORD= (optional)"