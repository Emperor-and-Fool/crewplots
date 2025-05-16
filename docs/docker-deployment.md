# Docker Deployment Guide

This guide provides instructions for deploying Crew Plots Pro using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your server
- Git installed on your server
- Access to the GitHub repository containing this project

## Setup Steps

### 1. Clone the Repository

```bash
git clone <your-github-repository-url> crewplots
cd crewplots
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=crewplots

# Application Configuration
NODE_ENV=production
DATABASE_URL=postgres://postgres:your_secure_password@postgres:5432/crewplots
REDIS_URL=redis://redis:6379
SESSION_SECRET=your_secure_session_secret
```

Ensure you replace the placeholder values with secure credentials.

### 3. Start the Services

Run the Docker Compose command to build and start all services:

```bash
docker-compose up -d
```

This will start:
- The Redis server
- The PostgreSQL database
- The application server

### 4. Database Migration

The application should automatically run migrations at startup, but you can manually trigger them using:

```bash
docker-compose exec app npm run db:migrate
```

### 5. Create Admin User

If you need to create an admin user:

```bash
docker-compose exec app npm run create:admin
```

### 6. Verify Deployment

The application should now be accessible at `http://your-server-ip:3000`.

### 7. Logs and Monitoring

View logs for troubleshooting:

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs app
docker-compose logs redis
docker-compose logs postgres
```

## Redis Configuration

The system is configured to use Redis for session storage, which provides:
- Better performance for authentication operations
- Reliable session persistence
- Proper handling of authentication state

Redis runs inside a Docker container with the following configuration:
- Persistence enabled with appendonly mode
- Data volume for persistence between restarts
- Accessible only to the application within the Docker network

## Troubleshooting

### Redis Connection Issues

If you encounter Redis connection issues:

1. Check the Redis container status:
   ```bash
   docker-compose ps redis
   ```

2. Verify Redis logs:
   ```bash
   docker-compose logs redis
   ```

3. Ensure the Redis connection URL is correctly set in the environment variables

### Database Connection Issues

1. Check the PostgreSQL container status:
   ```bash
   docker-compose ps postgres
   ```

2. Verify database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Ensure the DATABASE_URL environment variable is correctly formatted

## Backup and Restore

### Database Backup

```bash
docker-compose exec postgres pg_dump -U postgres crewplots > backup.sql
```

### Database Restore

```bash
cat backup.sql | docker-compose exec -T postgres psql -U postgres crewplots
```

## Scaling and Production Considerations

For production environments, consider:
1. Using a reverse proxy like Nginx for SSL termination
2. Implementing proper backup strategies
3. Setting up monitoring for containers and services
4. Using Docker Swarm or Kubernetes for high availability