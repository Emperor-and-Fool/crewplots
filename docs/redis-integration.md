# Redis Integration Guide

## Overview
This document provides details on how to properly integrate Redis for session management and caching in the Crew Plots Pro application.

## Redis Configuration

### Docker Setup
The Redis service should be configured in `docker-compose.yml` with persistent storage:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3
```

### Redis Client Configuration

The Redis client should be set up with proper reconnection strategy and error handling:

```typescript
import Redis from 'ioredis';
import { logger } from './logger';

// Connection options with optimal settings for Replit environment
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: 3,
  connectTimeout: 10000, // 10 seconds
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Create Redis client
export const redisClient = new Redis(redisOptions);

// Set up event handlers
redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redisClient.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

// Health check method
export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
};
```

## Session Configuration

For Express sessions using Redis, configure as follows:

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';
import { redisClient } from './redis';

// Create Redis store
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'crewplots:',
  disableTouch: false,
  ttl: 86400, // 1 day in seconds
});

// Configure session middleware
export const sessionOptions = {
  store: redisStore,
  secret: process.env.SESSION_SECRET!,
  name: 'crewplots.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  }
};
```

## Using Redis for Caching

Besides session storage, Redis can be used for caching frequently accessed data:

```typescript
// Cache TTL constants
const CACHE_TTL = {
  SHORT: 60, // 1 minute in seconds
  MEDIUM: 300, // 5 minutes in seconds
  LONG: 3600, // 1 hour in seconds
};

// Cache key prefixes
const CACHE_PREFIX = {
  USER: 'user:',
  LOCATION: 'location:',
  SCHEDULE: 'schedule:',
};

// Cache helper functions
export const cacheUtils = {
  // Set data in cache with expiration
  async set(key: string, data: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      // Operation should continue even if cache fails
    }
  },

  // Get data from cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  // Delete cache entry
  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  },

  // Clear cache by pattern
  async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      logger.error(`Cache clear pattern error for ${pattern}:`, error);
    }
  }
};

// Example cache implementations
export const userCache = {
  async getById(userId: number): Promise<User | null> {
    const cacheKey = `${CACHE_PREFIX.USER}${userId}`;
    // Try to get from cache first
    const cachedUser = await cacheUtils.get<User>(cacheKey);
    if (cachedUser) return cachedUser;
    
    // If not in cache, fetch from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    // Store in cache for future requests
    if (user) {
      await cacheUtils.set(cacheKey, user, CACHE_TTL.MEDIUM);
    }
    
    return user || null;
  },
  
  async invalidateUser(userId: number): Promise<void> {
    await cacheUtils.del(`${CACHE_PREFIX.USER}${userId}`);
  }
};
```

## Monitoring Redis Health

Implement a health check endpoint to monitor Redis connection status:

```typescript
// In routes.ts
app.get('/api/health/redis', async (req, res) => {
  const isRedisHealthy = await checkRedisConnection();
  if (isRedisHealthy) {
    res.status(200).json({ status: 'healthy' });
  } else {
    res.status(503).json({ status: 'unhealthy' });
  }
});
```

## Common Redis Issues and Solutions

1. **Connection Timeouts**
   - Increase connect timeout
   - Implement proper reconnection strategy
   - Add logging around connection events

2. **Memory Issues**
   - Configure maxmemory and eviction policies in Redis configuration
   - Monitor memory usage with INFO command
   - Implement TTL for all cached items

3. **Performance Bottlenecks**
   - Use pipelining for batch operations
   - Monitor slow logs
   - Consider Redis Cluster for scaling

4. **Session Persistence**
   - Configure Redis persistence (RDB or AOF)
   - Implement proper backup strategy
   - Test recovery scenarios