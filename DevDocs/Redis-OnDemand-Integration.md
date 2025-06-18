# IMPLEMENTATION PLAN: HYBRID REDIS-POSTGRESQL SESSION ARCHITECTURE

## Core Strategy
Implement a **read-through/write-through cache** pattern where:
- **PostgreSQL** = Durable session store (source of truth)
- **Redis** = Fast cache layer (when available)
- **Fallback behavior** = Graceful degradation when Redis unavailable

## Files and Components Involved

### 1. **Session Store Infrastructure** (`server/routes.ts`)
**Current state**: Official Redis client with infinite reconnection loop
**Target state**: Custom `HybridSessionStore` class extending `session.Store`

**Components**:
- `HybridSessionStore` class with Redis + PostgreSQL backends
- Read-through cache logic (Redis first, PostgreSQL fallback)
- Write-through logic (PostgreSQL first, Redis cache update)
- Connection management for both stores

### 2. **PostgreSQL Session Schema** (`shared/schema.ts`)
**New addition**: Session table definition
```typescript
sessions: {
  sid: varchar (primary key)
  sess: json
  expire: timestamp
}
```

### 3. **Database Storage Layer** (`server/database/storage.ts`)
**Enhancement**: Add session CRUD operations to `IStorage` interface
- `getSession(sid: string)`
- `setSession(sid: string, session: any, expire: Date)`
- `destroySession(sid: string)`

### 4. **Redis On-Demand Integration** (`adapters-repl/redis-ondemand/on-demand-service.ts`)
**Current issue**: Service shuts down when no connections
**Target**: Modify for session store compatibility
- Keep Redis alive during session operations
- Graceful fallback when Redis unavailable
- Connection pooling for session store vs cache operations

### 5. **Package Dependencies**
**Add**: `connect-pg-simple` for PostgreSQL session store
**Keep**: `redis` for caching layer
**Keep**: `ioredis` for on-demand service operations

## Implementation Sequence

### Phase 1: PostgreSQL Session Foundation
1. Add session table to schema
2. Implement session storage methods in storage layer
3. Add `connect-pg-simple` dependency
4. Test basic PostgreSQL session storage

### Phase 2: Hybrid Store Implementation
1. Create `HybridSessionStore` class in `server/routes.ts`
2. Implement read-through logic (Redis → PostgreSQL → cache)
3. Implement write-through logic (PostgreSQL → Redis)
4. Handle Redis connection failures gracefully

### Phase 3: Redis Integration
1. Modify on-demand Redis service for session compatibility
2. Implement separate Redis connection for sessions vs caching
3. Add session-specific keepalive logic
4. Test hybrid store under Redis restarts

### Phase 4: Fallback Testing
1. Test session persistence through Redis restarts
2. Verify authentication flow with cache misses
3. Validate session data consistency
4. Performance testing of dual-write operations

## Architecture Benefits
- **Session continuity** through Redis restarts
- **Performance** from Redis cache hits
- **Reliability** from PostgreSQL durability
- **No data loss** when Redis unavailable
- **Maintains current authentication flow** with improved persistence

## Key Technical Decisions
1. **PostgreSQL as source of truth** prevents session loss
2. **Redis as performance layer** when available
3. **Graceful degradation** maintains functionality
4. **Separate connection pools** for sessions vs general caching
5. **Write-through pattern** ensures consistency

## Detailed Implementation Example

### HybridSessionStore Class Structure
```typescript
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import connectRedis from 'connect-redis';
import { createClient } from 'redis';
import { pool } from './database/db';

const RedisStore = connectRedis(session);
const PgStore = connectPgSimple(session);

class HybridSessionStore extends session.Store {
  private redis: any;
  private pg: any;
  private redisClient: any;

  constructor() {
    super();
    this.pg = new PgStore({ pool });
    // Redis client initialized when available
  }

  // Read: try Redis → fallback PostgreSQL → cache
  async get(sid: string, cb: Function) {
    if (this.redis) {
      this.redis.get(sid, async (err: any, sess: any) => {
        if (sess || err) return cb(err, sess);
        // Cache miss, try PostgreSQL
        this.pg.get(sid, async (err2: any, sess2: any) => {
          if (sess2 && this.redisClient) {
            // Repopulate cache
            await this.redisClient.set(`sess:${sid}`, JSON.stringify(sess2));
          }
          cb(err2, sess2);
        });
      });
    } else {
      // Redis unavailable, use PostgreSQL directly
      this.pg.get(sid, cb);
    }
  }

  // Write: durable store then cache
  async set(sid: string, sess: any, cb: Function) {
    this.pg.set(sid, sess, (err: any) => {
      if (err) return cb(err);
      if (this.redisClient) {
        this.redisClient.set(`sess:${sid}`, JSON.stringify(sess), 'PX', sess.cookie?.maxAge || 86400000)
          .then(() => cb(null))
          .catch(() => cb(null)); // Don't fail if Redis cache fails
      } else {
        cb(null);
      }
    });
  }

  // Delegate destroy to both
  async destroy(sid: string, cb: Function) {
    if (this.redisClient) {
      await this.redisClient.del(`sess:${sid}`).catch(() => {});
    }
    this.pg.destroy(sid, cb);
  }
}
```

This approach solves the current infinite reconnection issue while providing the robust session management required for the authentication system.