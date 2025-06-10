# Infrastructure Requirements for Production Deployment

## Overview
This document outlines the server infrastructure requirements for deploying the Crew Plots Pro application in a docker-compose environment on an existing Ubuntu server with Docker and Traefik edge router.

## Container Architecture

### Required Containers

#### 1. Application Container (Node.js)
**Purpose**: Main application server running Express.js with React frontend
- **Base Image**: `node:20-alpine` (Alpine Linux 3.18+)
- **Runtime**: Node.js 20.x with npm 10.x
- **Port**: 5000 (internal)
- **System Packages**: git, python3, make, g++ (for native module compilation)
- **Dependencies**: Complete npm package list below

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

## Complete Package Manifest

### Production Dependencies
```json
{
  "@hookform/resolvers": "^3.x",
  "@jridgewell/trace-mapping": "^0.x",
  "@neondatabase/serverless": "^0.x",
  "@radix-ui/react-accordion": "^1.x",
  "@radix-ui/react-alert-dialog": "^1.x",
  "@radix-ui/react-aspect-ratio": "^1.x",
  "@radix-ui/react-avatar": "^1.x",
  "@radix-ui/react-checkbox": "^1.x",
  "@radix-ui/react-collapsible": "^1.x",
  "@radix-ui/react-context-menu": "^2.x",
  "@radix-ui/react-dialog": "^1.x",
  "@radix-ui/react-dropdown-menu": "^2.x",
  "@radix-ui/react-hover-card": "^1.x",
  "@radix-ui/react-label": "^2.x",
  "@radix-ui/react-menubar": "^1.x",
  "@radix-ui/react-navigation-menu": "^1.x",
  "@radix-ui/react-popover": "^1.x",
  "@radix-ui/react-progress": "^1.x",
  "@radix-ui/react-radio-group": "^1.x",
  "@radix-ui/react-scroll-area": "^1.x",
  "@radix-ui/react-select": "^2.x",
  "@radix-ui/react-separator": "^1.x",
  "@radix-ui/react-slider": "^1.x",
  "@radix-ui/react-slot": "^1.x",
  "@radix-ui/react-switch": "^1.x",
  "@radix-ui/react-tabs": "^1.x",
  "@radix-ui/react-toast": "^1.x",
  "@radix-ui/react-toggle": "^1.x",
  "@radix-ui/react-toggle-group": "^1.x",
  "@radix-ui/react-tooltip": "^1.x",
  "@tanstack/react-query": "^5.x",
  "bcryptjs": "^2.x",
  "class-variance-authority": "^0.x",
  "clsx": "^2.x",
  "cmdk": "^0.x",
  "connect-pg-simple": "^9.x",
  "date-fns": "^3.x",
  "drizzle-orm": "^0.x",
  "drizzle-zod": "^0.x",
  "embla-carousel-react": "^8.x",
  "express": "^4.x",
  "express-session": "^1.x",
  "framer-motion": "^11.x",
  "input-otp": "^1.x",
  "ioredis": "^5.x",
  "lucide-react": "^0.x",
  "memoizee": "^0.x",
  "memorystore": "^1.x",
  "mongodb": "^6.x",
  "multer": "^1.x",
  "next-themes": "^0.x",
  "openid-client": "^5.x",
  "passport": "^0.x",
  "passport-local": "^1.x",
  "react": "^18.x",
  "react-day-picker": "^8.x",
  "react-dom": "^18.x",
  "react-hook-form": "^7.x",
  "react-icons": "^5.x",
  "react-resizable-panels": "^2.x",
  "recharts": "^2.x",
  "tailwind-merge": "^2.x",
  "tailwindcss": "^3.x",
  "tailwindcss-animate": "^1.x",
  "tsx": "^4.x",
  "tw-animate-css": "^0.x",
  "typescript": "^5.x",
  "vaul": "^0.x",
  "wouter": "^3.x",
  "ws": "^8.x",
  "zod": "^3.x",
  "zod-validation-error": "^3.x"
}
```

### Development Dependencies
```json
{
  "@replit/vite-plugin-cartographer": "^2.x",
  "@replit/vite-plugin-runtime-error-modal": "^2.x",
  "@tailwindcss/typography": "^0.x",
  "@tailwindcss/vite": "^4.x",
  "@types/bcryptjs": "^2.x",
  "@types/connect-pg-simple": "^7.x",
  "@types/express": "^4.x",
  "@types/express-session": "^1.x",
  "@types/memoizee": "^0.x",
  "@types/multer": "^1.x",
  "@types/node": "^20.x",
  "@types/passport": "^1.x",
  "@types/passport-local": "^1.x",
  "@types/react": "^18.x",
  "@types/react-dom": "^18.x",
  "@types/ws": "^8.x",
  "@vitejs/plugin-react": "^4.x",
  "autoprefixer": "^10.x",
  "drizzle-kit": "^0.x",
  "esbuild": "^0.x",
  "postcss": "^8.x",
  "vite": "^5.x"
}
```

### Core System Requirements
- **Base OS**: Alpine Linux 3.18+ (from node:20-alpine)
- **Node.js**: v20.x LTS
- **npm**: v10.x
- **Python**: v3.11+ (for native module compilation)
- **Build Tools**: make, g++, git

### Database Drivers & ORMs
- **PostgreSQL**: Native pg driver with connection pooling
- **MongoDB**: Official MongoDB driver with GridFS support
- **Redis**: ioredis client with cluster support
- **Drizzle ORM**: Type-safe database operations with Zod integration

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