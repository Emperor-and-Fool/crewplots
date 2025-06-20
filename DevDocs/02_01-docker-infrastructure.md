# Docker Infrastructure Requirements

## Container Architecture Overview

Deployment strategy for Ubuntu server with existing Docker and Traefik edge router.

## Required Containers

### 1. PostgreSQL Database
**Purpose**: Primary database for user data, metadata, and relational information
- **Image**: `postgres:15-alpine`
- **Internal Port**: 5432
- **Environment Variables**:
  - `POSTGRES_DB=crewplots`
  - `POSTGRES_USER=crewplots_user`
  - `POSTGRES_PASSWORD=<secure_password>`
- **Volumes**: `postgres_data:/var/lib/postgresql/data`
- **Health Check**: `pg_isready -U crewplots_user -d crewplots`

### 2. MongoDB Document Store
**Purpose**: Encrypted document storage with GridFS
- **Image**: `mongo:7.0`
- **Internal Port**: 27017
- **Environment Variables**:
  - `MONGO_INITDB_ROOT_USERNAME=root`
  - `MONGO_INITDB_ROOT_PASSWORD=<secure_password>`
  - `MONGO_INITDB_DATABASE=crewplots_documents`
- **Volumes**: `mongodb_data:/data/db`
- **Health Check**: `mongosh --eval "db.adminCommand('ping')"`
- **Features**: GridFS enabled, encryption at application layer

### 3. Redis Cache
**Purpose**: Session storage and application caching
- **Image**: `redis:7.2-alpine`
- **Internal Port**: 6379
- **Configuration**: Persistent storage enabled
- **Volumes**: `redis_data:/data`
- **Health Check**: `redis-cli ping`
- **Memory**: jemalloc disabled for compatibility

### 4. Application Server
**Purpose**: Node.js application with Express backend and React frontend
- **Image**: `node:20-alpine`
- **Internal Port**: 5000
- **Build Context**: Application root directory
- **Dependencies**: Full package manifest (see application container doc)
- **Health Check**: `curl -f http://localhost:5000/health || exit 1`

## Network Configuration

### Internal Docker Network
```yaml
networks:
  crewplots_network:
    driver: bridge
    internal: false
```

### Service Communication
- All containers communicate via service names
- No external ports exposed except through Traefik
- Internal DNS resolution handled by Docker

### Traefik Integration
- Application container exposed on port 5000
- SSL termination at Traefik level
- Domain routing configured in Traefik labels
- Health checks integrated with Traefik

## Volume Management

### Persistent Data Volumes
```yaml
volumes:
  postgres_data:
    driver: local
  mongodb_data:
    driver: local
  redis_data:
    driver: local
```

### Backup Considerations
- Volumes should be backed up regularly
- Database dumps scheduled independently
- Application uploads handled separately if needed

## Environment Variables

### Database Connections
- `DATABASE_URL=postgresql://user:pass@postgres:5432/crewplots`
- `MONGODB_URL=mongodb://root:pass@mongodb:27017`
- `MONGODB_DB_NAME=crewplots_documents`
- `REDIS_URL=redis://redis:6379`

### Application Configuration
- `NODE_ENV=production`
- `PORT=5000`
- `SESSION_SECRET=<secure_random_string>`
- `ENCRYPTION_KEY=<32_byte_hex_string>`

## Resource Allocation

### Memory Limits
- **PostgreSQL**: 512MB
- **MongoDB**: 1GB
- **Redis**: 256MB
- **Application**: 1GB

### CPU Limits
- **PostgreSQL**: 1.0 cores
- **MongoDB**: 1.0 cores
- **Redis**: 0.5 cores
- **Application**: 2.0 cores

## Security Configuration

### Container Security
- All containers run as non-root users
- Alpine-based images for minimal attack surface
- No unnecessary packages installed
- Regular security updates

### Network Security
- Internal network isolation
- No direct database access from external networks
- All external traffic routed through Traefik
- SSL/TLS termination at edge

### Data Security
- Sensitive documents encrypted in MongoDB
- PostgreSQL contains no sensitive personal data
- Session data in Redis with appropriate TTL
- Environment variables managed securely

## Startup Dependencies

### Service Order
```yaml
depends_on:
  postgres:
    condition: service_healthy
  mongodb:
    condition: service_healthy
  redis:
    condition: service_healthy
```

### Initialization
- Databases start first with health checks
- Application waits for all dependencies
- Automatic schema migrations on startup
- MongoDB indexes created automatically

## Monitoring & Health Checks

### Health Check Endpoints
- **Application**: `GET /health`
- **PostgreSQL**: `pg_isready`
- **MongoDB**: `db.adminCommand('ping')`
- **Redis**: `redis-cli ping`

### Restart Policies
```yaml
restart: unless-stopped
```

### Logging Configuration
- All containers log to stdout/stderr
- Log rotation handled by Docker
- Structured logging in application
- Error tracking and alerting

## Deployment Strategy

### Rolling Updates
- Zero-downtime deployments supported
- Health checks prevent traffic to unhealthy containers
- Database migrations handled gracefully
- Rollback strategy available

### Scaling Considerations
- Application container can be horizontally scaled
- Databases require vertical scaling
- Session affinity not required (Redis-backed sessions)
- Load balancing handled by Traefik

This infrastructure supports the complete hybrid PostgreSQL/MongoDB architecture with encrypted document storage, session management, and backend data compilation.