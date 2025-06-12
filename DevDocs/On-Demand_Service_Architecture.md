# On-Demand Service Architecture

## Overview

This architecture provides Redis caching services that automatically start when needed and can be bypassed in Docker environments where external services are properly managed.

## Key Components

### OnDemandRedisService
- **Location**: `server/services/on-demand-service.ts`
- **Purpose**: Manages Redis server lifecycle and connection pooling
- **Features**:
  - Automatic Redis server startup on first use
  - Connection pooling with automatic cleanup
  - Environment detection for Docker environments
  - Graceful shutdown handling

### CacheService
- **Location**: `server/services/cache-service.ts`
- **Purpose**: High-level caching interface for application data
- **Features**:
  - Session caching with fallback to PostgreSQL
  - Message caching for performance
  - Profile caching
  - Batch operations for cache warming

## Environment Detection

The system detects deployment environment through the `DOCKER_ENV` environment variable:

```javascript
// Skip Redis activation in Docker environments
if (skipInDocker && process.env.DOCKER_ENV) {
  throw new Error('Redis service skipped - running in Docker environment');
}
```

## Usage Patterns

### Basic Cache Operations
```javascript
import { cacheService } from '../services/cache-service';

// Cache session data
await cacheService.cacheSession(sessionId, userData);

// Retrieve cached session
const session = await cacheService.getSession(sessionId);

// Cache user messages
await cacheService.cacheMessages(userId, messages);
```

### Batch Operations
```javascript
// Warm up cache for user
await cacheService.warmupUserCache(userId, {
  session: userData,
  messages: userMessages,
  profile: userProfile
});
```

### Connection Management
```javascript
// Direct Redis operations with auto-cleanup
await onDemandRedis.withConnection(async (redis) => {
  await redis.set('key', 'value');
  return await redis.get('key');
}, { keepAlive: 30000 });
```

## Deployment Scenarios

### Replit Environment
- Services start on-demand when cache operations are requested
- Redis server spawned as child process
- Automatic cleanup after inactivity period
- Fallback to PostgreSQL when Redis unavailable

### Docker Compose Environment
- External Redis service managed by Docker
- On-demand service layer bypassed with `skipInDocker: true`
- Direct connection to external Redis instance
- Full service persistence managed by Docker

## Configuration Options

### CacheOptions Interface
```typescript
interface CacheOptions {
  ttl?: number;           // Time to live in seconds
  connectionId?: string;  // Connection identifier for pooling
  skipInDocker?: boolean; // Skip activation in Docker environments
}
```

### Connection Options
```typescript
{
  connectionId: 'session',    // Named connection for pooling
  keepAlive: 30000,          // Keep connection alive for 30 seconds
  skipInDocker: true         // Skip in Docker environments
}
```

## Testing

Cache functionality can be tested through dedicated endpoints:

- `GET /api/cache/test` - Basic cache performance test
- `POST /api/cache/session/test` - Session caching test
- `POST /api/cache/batch/test` - Batch operations test
- `GET /api/cache/status` - Service status information

## Benefits

1. **Replit Compatibility**: Works within Replit's process management constraints
2. **Docker Ready**: Seamlessly integrates with proper Docker deployments
3. **Performance**: Provides Redis performance benefits when available
4. **Resilience**: Graceful fallback to PostgreSQL when Redis unavailable
5. **Resource Efficient**: Only consumes resources when actively needed

## Implementation Notes

- Redis server automatically starts with 3-second initialization period
- Connections automatically cleaned up after configured keepAlive period
- All cache operations include fallback error handling
- Service status monitoring available through status endpoints
- Graceful shutdown handling prevents resource leaks