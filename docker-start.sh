#!/bin/bash

# Wait for Redis to be ready
echo "Waiting for Redis..."
until redis-cli -h redis ping; do
  echo "Redis not available yet - waiting..."
  sleep 1
done
echo "Redis is ready!"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until pg_isready -h postgres -U postgres; do
  echo "PostgreSQL not available yet - waiting..."
  sleep 1
done
echo "PostgreSQL is ready!"

# Run migrations if needed
echo "Running database migrations..."
npm run db:migrate

# Start the application
echo "Starting the application..."
npm run start