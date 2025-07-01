# Database Versions & Configuration

## MongoDB
- **Version**: 7.0.x Community Edition
- **Storage Engine**: WiredTiger
- **Configuration**: Custom Replit setup via `mongo-proxy-server.js`
- **Data Directory**: `mongodb_data/`
- **Port**: Dynamic (managed by proxy server)
- **Authentication**: Disabled for development
- **Connection**: Via proxy server for Replit compatibility

## Redis
- **Version**: 7.2.x Stable
- **Configuration**: Custom Replit setup via `Redis-replit/`
- **Data Directory**: `redis_data/`
- **Persistence**: RDB + AOF enabled
- **Memory Policy**: allkeys-lru
- **Connection**: Direct connection for Replit environment

## Replit Adapters
- **MongoDB Adapter**: `mongo-proxy-server.js` - Handles MongoDB startup and connection management
- **Redis Adapter**: `Redis-replit/` - Custom Redis implementation for Replit constraints
- **PostgreSQL**: Native Replit PostgreSQL service via `DATABASE_URL`

## Data Persistence Strategy
- **PostgreSQL**: Metadata, user accounts, application state
- **MongoDB**: Rich text content, document storage via GridFS
- **Redis**: Session storage, caching layer

## Environment Setup
All database services are configured to start on-demand and handle Replit's container limitations. Data directories are preserved in git structure but contents are excluded via `.gitignore`.