# Replit On-Demand Database Services

Smart database service adapters that automatically start and manage MongoDB and Redis servers in Replit environments.

## Overview

These on-demand services solve the critical challenge of running database servers in Replit containers, where traditional database installations fail due to container limitations and resource constraints. The adapters provide automatic lifecycle management with intelligent keepalive mechanisms.

## Services

### MongoDB On-Demand Service
**Location**: `mongodb-ondemand/on-demand-mongodb.ts`

**What it does**:
- Automatically starts MongoDB server when needed
- Manages 5-minute keepalive sessions to minimize resource usage
- Handles graceful shutdown when inactive
- Bypasses Docker mode when running in containerized environments
- Ensures data directory initialization and permissions

**Key Features**:
- **Smart Activation**: Only starts MongoDB when actually needed by the application
- **Resource Management**: Automatically stops after 5 minutes of inactivity
- **Container Awareness**: Detects Docker environments and delegates to docker-compose
- **Data Persistence**: Maintains `mongodb_data/` directory across sessions
- **Process Monitoring**: Handles process cleanup and error recovery

**Usage Pattern**:
```typescript
const mongoService = OnDemandMongoService.getInstance();
const isReady = await mongoService.ensureReady();
// MongoDB is now available at mongodb://127.0.0.1:27017
```

### Redis On-Demand Service
**Location**: `redis-ondemand/on-demand-service.ts`

**What it does**:
- Launches custom Redis server (`repl-redis/production-redis`)
- Manages connection pooling with configurable keepalive
- Provides operation-scoped connection management
- Supports batch operations for efficiency
- Integrates with ioredis client library

**Key Features**:
- **Custom Redis Integration**: Uses our lightweight 21KB Redis implementation
- **Connection Pooling**: Maintains active connections with automatic cleanup
- **Batch Operations**: Optimizes multiple Redis operations in single session
- **Flexible Keepalive**: Configurable connection lifetime (default 30 seconds)
- **Error Recovery**: Immediate cleanup on operation failures

**Usage Patterns**:
```typescript
const redisService = OnDemandRedisService.getInstance();

// Single operation
const result = await redisService.withConnection(async (client) => {
  return await client.setex('key', 3600, 'value');
});

// Batch operations
const results = await redisService.withBatch([
  (client) => client.set('key1', 'value1'),
  (client) => client.get('key2')
]);
```

## Replit-Specific Solutions

### Why Traditional Databases Fail in Replit
1. **MongoDB**: Fails to bind ports and initialize WiredTiger storage engine
2. **Redis**: Crashes with jemalloc memory allocation errors and memory mapping issues
3. **Container Constraints**: Limited kernel parameters and resource restrictions

### How Our Adapters Solve These Issues

**MongoDB Adapter**:
- Spawns MongoDB with specific container-friendly parameters
- Manages data directory permissions automatically
- Handles process lifecycle to avoid resource exhaustion
- Provides intelligent startup detection

**Redis Adapter**:
- Uses custom Redis implementation designed for containers
- Bypasses jemalloc and memory mapping limitations
- Provides full RESP-2 protocol compatibility
- Manages connection lifecycle efficiently

## Architecture Benefits

### Development Efficiency
- **Zero Configuration**: Services start automatically when needed
- **Resource Conservation**: Databases only run when actively used
- **Clean Shutdown**: Prevents orphaned processes and resource leaks
- **Error Resilience**: Automatic recovery from connection failures

### Production Readiness
- **Container Compatibility**: Works in both development and containerized deployments
- **Environment Detection**: Automatically adapts to Docker vs native environments
- **Service Isolation**: Each service manages its own lifecycle independently
- **Monitoring**: Built-in logging and process state tracking

## Integration with Application

These adapters are integrated into the application's hybrid database architecture:

- **PostgreSQL**: Primary metadata storage (always available)
- **MongoDB**: Rich content storage via on-demand service
- **Redis**: Session and cache storage via on-demand service

The on-demand pattern ensures that applications can use multiple database technologies without the complexity of managing database servers manually in development environments.

## Service States

### MongoDB States
- **Stopped**: No MongoDB process running
- **Starting**: Initializing data directory and spawning process
- **Ready**: Available at `mongodb://127.0.0.1:27017`
- **Keepalive**: Active with 5-minute timeout reset on each operation

### Redis States
- **Stopped**: No Redis process running
- **Starting**: Launching custom Redis server
- **Connected**: Client connections active with configurable keepalive
- **Cleanup**: Automatic connection termination after timeout

This architecture enables full-stack development with multiple databases in Replit without the traditional setup complexity or resource management concerns.