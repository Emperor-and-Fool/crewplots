# Redis & MongoDB Development Readiness Guidelines

## Development Philosophy: Always Code for Production with Fallbacks

When developing in environments where Redis or MongoDB may not be available (like Replit), always write production-ready code with graceful fallbacks. This ensures your application works in limited development environments while being optimized for full production deployment.

## Core Principles

### 1. Service Layer Pattern
Always implement a service layer that abstracts database operations and can switch between storage backends:

```typescript
class MessageService {
  async createMessage(data: MessageData): Promise<Message> {
    const mongoAvailable = await this.isMongoDBAvailable();
    const redisAvailable = await this.isRedisAvailable();
    
    if (mongoAvailable) {
      return await this.createWithMongoDB(data);
    } else {
      return await this.createWithPostgreSQL(data);
    }
  }
}
```

### 2. Environment Detection
Implement robust health checks for external services:

```typescript
private async isMongoDBAvailable(): Promise<boolean> {
  try {
    await mongoConnection.ping();
    return true;
  } catch (error) {
    console.log('MongoDB unavailable, using PostgreSQL fallback');
    return false;
  }
}

private async isRedisAvailable(): Promise<boolean> {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    console.log('Redis unavailable, using PostgreSQL session storage');
    return false;
  }
}
```

### 3. Fallback Table Strategy
Create PostgreSQL tables that mirror external service functionality:

```sql
-- Virtual Redis tables (for development fallback)
CREATE TABLE redis_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Virtual MongoDB tables (for development fallback)
CREATE TABLE message_documents (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'rich-text',
  workflow TEXT,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Development Workflow

### Phase 1: Implement with Fallbacks
```typescript
// ✅ Good: Production-ready with fallback
class CacheService {
  async get(key: string): Promise<any> {
    if (await this.isRedisAvailable()) {
      return await redisClient.get(key);
    } else {
      return await this.getFromPostgreSQL(key);
    }
  }
}

// ❌ Bad: Direct implementation without fallback
class CacheService {
  async get(key: string): Promise<any> {
    return await redisClient.get(key); // Fails in Replit
  }
}
```

### Phase 2: Test Fallback Mode
In Replit or other limited environments, verify:
1. Application starts without external services
2. All features work using PostgreSQL fallbacks
3. Performance is acceptable for development
4. Data structures remain consistent

### Phase 3: Test Production Mode
When external services are available:
1. Verify automatic detection switches to optimal storage
2. Confirm performance improvements
3. Test service switching under load
4. Validate data consistency across services

## Code Review Checklist

### Before Writing New Features
- [ ] Does this feature require Redis/MongoDB?
- [ ] Have I implemented PostgreSQL fallbacks?
- [ ] Will this work in Replit development environment?
- [ ] Is the service layer abstraction in place?

### During Development
- [ ] Am I writing direct Redis/MongoDB calls?
- [ ] Should this go through the service layer?
- [ ] Does my code check service availability?
- [ ] Are fallback tables properly designed?

### Before Deployment
- [ ] Does the application work with all services available?
- [ ] Does the application work with services unavailable?
- [ ] Are environment variables properly configured?
- [ ] Do health checks accurately detect service status?

## Environment Configuration

### Development (Limited Services)
```env
# Services may be unavailable
REDIS_URL=""
MONGODB_URL=""
DATABASE_URL="postgresql://..."

# Fallback mode indicators
USE_REDIS_FALLBACK=true
USE_MONGODB_FALLBACK=true
```

### Production (Full Services)
```env
# All services available
REDIS_URL="redis://production-redis:6379"
MONGODB_URL="mongodb://production-mongo:27017/app"
DATABASE_URL="postgresql://production-db:5432/app"

# Production mode
USE_REDIS_FALLBACK=false
USE_MONGODB_FALLBACK=false
```

## Anti-Patterns to Avoid

### Direct Service Coupling
```typescript
// ❌ Bad: Direct coupling
app.use(session({
  store: new RedisStore({ client: redisClient }), // Breaks without Redis
}));

// ✅ Good: Service abstraction
app.use(session({
  store: await createSessionStore(), // Returns Redis or PostgreSQL store
}));
```

### Hardcoded Assumptions
```typescript
// ❌ Bad: Assumes MongoDB always available
const document = await mongoCollection.findOne({ _id: id });

// ✅ Good: Service layer handles availability
const document = await documentService.findById(id);
```

### Missing Health Checks
```typescript
// ❌ Bad: No availability checking
await redisClient.set(key, value);

// ✅ Good: Check before using
if (await cacheService.isAvailable()) {
  await cacheService.set(key, value);
}
```

## Production Deployment Strategy

### Docker Compose Production
```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
      - MONGODB_URL=mongodb://mongodb:27017/app
    depends_on:
      - redis
      - mongodb
      - postgres
  
  redis:
    image: redis:alpine
  
  mongodb:
    image: mongo:latest
  
  postgres:
    image: postgres:15
```

### Replit Development
- PostgreSQL virtual tables active
- Service layer automatically uses fallbacks
- All features functional for development
- Ready for production deployment

## Monitoring and Debugging

### Service Health Endpoints
```typescript
app.get('/health', async (req, res) => {
  const health = {
    redis: await redisService.isAvailable(),
    mongodb: await mongoService.isAvailable(),
    postgres: await postgresService.isAvailable(),
    fallbackMode: {
      redis: !await redisService.isAvailable(),
      mongodb: !await mongoService.isAvailable()
    }
  };
  
  res.json(health);
});
```

### Development Logging
```typescript
console.log('=== Service Status ===');
console.log(`Redis: ${redisAvailable ? 'Available' : 'Fallback Mode'}`);
console.log(`MongoDB: ${mongoAvailable ? 'Available' : 'Fallback Mode'}`);
console.log(`Session Store: ${sessionStore.constructor.name}`);
console.log(`Document Store: ${documentStore.constructor.name}`);
```

## Migration Strategy

### From Development to Production
1. **No code changes required** - Service layer handles switching
2. **Environment variables** - Configure production service URLs
3. **Data migration** - Move development data to production services
4. **Performance testing** - Verify production service performance

### Rollback Strategy
1. **Instant fallback** - Remove service URLs to force PostgreSQL mode
2. **Data preservation** - PostgreSQL contains all essential data
3. **Zero downtime** - Service layer switches automatically

This approach ensures your application is always production-ready while being fully testable in resource-limited development environments.