# Infrastructure Requirements for Production Deployment

## Overview
This document outlines the server infrastructure requirements for deploying the Crew Plots Pro application in a docker-compose environment on an existing Ubuntu server with Docker and Traefik edge router.

## Container Architecture

### Required Containers

#### 1. Application Container (Node.js)
**Purpose**: Main application server running Express.js with React frontend
- **Base Image**: `node:20-alpine`
- **Runtime**: Node.js 20.x with npm
- **Port**: 5000 (internal)
- **Dependencies**: All npm packages as defined in package.json

#### 2. PostgreSQL Database Container
**Purpose**: Primary database for user data, metadata, and relational information
- **Base Image**: `postgres:15-alpine`
- **Port**: 5432 (internal)
- **Required Environment Variables**:
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
- **Persistent Storage**: Database volume mount required

#### 3. MongoDB Container
**Purpose**: Document storage for encrypted sensitive content
- **Base Image**: `mongo:7.0`
- **Port**: 27017 (internal)
- **Required Environment Variables**:
  - `MONGO_INITDB_ROOT_USERNAME`
  - `MONGO_INITDB_ROOT_PASSWORD`
  - `MONGO_INITDB_DATABASE`
- **Persistent Storage**: Data volume mount required
- **Features**: GridFS enabled for large document storage

#### 4. Redis Container
**Purpose**: Session storage and caching layer
- **Base Image**: `redis:7.2-alpine`
- **Port**: 6379 (internal)
- **Configuration**: Persistent storage for session data
- **Memory Optimization**: jemalloc disabled for Replit compatibility

## Application Dependencies

### Core Runtime Packages
```json
{
  "node": "20.x",
  "npm": "10.x",
  "typescript": "^5.0.0",
  "tsx": "latest"
}
```

### Database Drivers
```json
{
  "pg": "PostgreSQL driver",
  "drizzle-orm": "Type-safe ORM",
  "mongodb": "MongoDB driver"
}
```

### Security & Encryption
```json
{
  "bcryptjs": "Password hashing",
  "passport": "Authentication middleware",
  "express-session": "Session management",
  "crypto": "Built-in encryption for sensitive documents"
}
```

### Web Framework
```json
{
  "express": "Web server",
  "vite": "Frontend build tool",
  "react": "Frontend framework"
}
```

## Environment Variables Required

### Application Configuration
- `NODE_ENV=production`
- `PORT=5000`
- `SESSION_SECRET` (secure random string)

### Database Connections
- `DATABASE_URL` (PostgreSQL connection string)
- `MONGODB_URL` (MongoDB connection string)
- `MONGODB_DB_NAME` (MongoDB database name)
- `REDIS_URL` (Redis connection string)

### Security Configuration
- `ENCRYPTION_KEY` (for document encryption)
- `JWT_SECRET` (if implementing JWT)

## Volume Mounts Required

### PostgreSQL Data Persistence
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```

### MongoDB Data Persistence
```yaml
volumes:
  - mongodb_data:/data/db
```

### Redis Data Persistence
```yaml
volumes:
  - redis_data:/data
```

### Application Uploads (Optional)
```yaml
volumes:
  - app_uploads:/app/uploads
```

## Network Configuration

### Internal Container Network
- All containers should be on the same Docker network
- No external ports exposed except through Traefik
- Container-to-container communication via service names

### Traefik Integration
- Application container should expose port 5000
- Traefik handles SSL termination and routing
- Domain routing configured in Traefik
- Health checks on `/health` endpoint

## Resource Requirements

### Minimum Specifications
- **Application Container**: 512MB RAM, 1 CPU core
- **PostgreSQL**: 256MB RAM, 0.5 CPU core
- **MongoDB**: 512MB RAM, 0.5 CPU core
- **Redis**: 128MB RAM, 0.25 CPU core

### Recommended Specifications
- **Application Container**: 1GB RAM, 2 CPU cores
- **PostgreSQL**: 512MB RAM, 1 CPU core
- **MongoDB**: 1GB RAM, 1 CPU core
- **Redis**: 256MB RAM, 0.5 CPU core

## Docker Compose Structure

### Service Dependencies
```yaml
services:
  app:
    depends_on:
      - postgres
      - mongodb
      - redis
```

### Health Checks
All containers should implement health checks:
- **PostgreSQL**: `pg_isready`
- **MongoDB**: `mongosh --eval "db.adminCommand('ping')"`
- **Redis**: `redis-cli ping`
- **Application**: HTTP GET `/health`

## Security Considerations

### Container Security
- Run containers as non-root users
- Use Alpine-based images for smaller attack surface
- Regular security updates for base images

### Data Security
- All sensitive data encrypted at rest in MongoDB
- PostgreSQL data contains no sensitive personal information
- Session data stored in Redis with appropriate TTL

### Network Security
- Internal container network isolated
- No direct database access from external networks
- All external traffic routed through Traefik

## Backup Strategy

### Database Backups
- **PostgreSQL**: Daily pg_dump to external storage
- **MongoDB**: Daily mongodump with GridFS support
- **Redis**: Periodic RDB snapshots for session recovery

### Application Backups
- Source code in version control
- Environment variables in secure configuration management
- Upload files backed up if using local storage

## Monitoring & Logging

### Container Monitoring
- Resource usage monitoring for all containers
- Health check status monitoring
- Container restart policies configured

### Application Logging
- Structured logging to stdout/stderr
- Log aggregation via Docker logging drivers
- Error tracking and alerting configured

## Deployment Notes

### Initial Setup
1. Containers start in dependency order
2. Database migrations run automatically
3. MongoDB indexes created on first run
4. Application serves both API and frontend

### Updates & Maintenance
- Rolling updates supported
- Database migrations handled by ORM
- Zero-downtime deployments possible with proper health checks

This infrastructure supports the hybrid PostgreSQL/MongoDB architecture with encrypted document storage, session management, and the complete backend data compilation philosophy implemented in the application.