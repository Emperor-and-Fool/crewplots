# On-Demand Services Development Guide

## Development Environment Setup

### Prerequisites
- Node.js 18+ environment
- PostgreSQL database access
- Replit environment (for on-demand features) or Docker

### Environment Configuration

#### Development (Limited Services)
```env
# Services may be unavailable - fallback mode
REDIS_URL=""
MONGODB_URL=""
DATABASE_URL="postgresql://..."

# Fallback mode indicators
USE_REDIS_FALLBACK=true
USE_MONGODB_FALLBACK=true
```

#### Production (Full Services)
```env
# All services available
REDIS_URL="redis://production-redis:6379"
MONGODB_URL="mongodb://production-mongo:27017/app"
DATABASE_URL="postgresql://production-db:5432/app"

# Production mode
USE_REDIS_FALLBACK=false
USE_MONGODB_FALLBACK=false
```

## Development Workflow

### Phase 1: Basic Development (PostgreSQL Only)
Start with core functionality using only PostgreSQL:
1. Implement business logic with PostgreSQL storage
2. Design service abstractions for future Redis/MongoDB integration
3. Create fallback table structures in PostgreSQL
4. Test core functionality without external services

### Phase 2: Service Integration
Add on-demand services when ready:
1. Implement service layer abstractions
2. Add Redis caching for performance-critical operations
3. Integrate MongoDB for rich content storage
4. Test hybrid storage scenarios

### Phase 3: Test Production Mode
When external services are available:
1. Verify automatic detection switches to optimal storage
2. Confirm performance improvements
3. Test service switching under load
4. Validate data consistency across services

## Code Review Checklist

### Before Writing New Features
- [ ] Does this feature require Redis/MongoDB?
- [ ] Have I implemented PostgreSQL fallbacks (for Redis only)?
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

## Anti-Patterns to Avoid

### ❌ Direct Service Calls
```typescript
// DON'T: Direct Redis calls
const redis = new Redis();
await redis.set('key', 'value');
```

### ✅ Service Layer Abstraction
```typescript
// DO: Use service layer
await cacheService.set('key', 'value');
```

### ❌ Hardcoded Service Dependencies
```typescript
// DON'T: Assume services are always available
const data = await redis.get('session:' + id);
```

### ✅ Graceful Degradation
```typescript
// DO: Handle service unavailability
const data = await sessionStore.get(id); // Falls back automatically
```

## Testing Guidelines

### Local Testing
```bash
# Test with services disabled
npm run test:no-services

# Test with Redis only
npm run test:redis-only

# Test with all services
npm run test:full-services
```

### Service Availability Testing
```typescript
// Test Redis fallback behavior
await onDemandRedis.disableAutoRestart();
// ... test fallback scenarios
await onDemandRedis.enableAutoRestart();

// Test MongoDB explicit failures
await mongoService.simulateFailure();
// ... verify error handling
```

### Performance Testing
```bash
# Redis performance validation
node DevUtils/redis-build-test/redis-performance-analyzer.js

# MongoDB connection testing
node DevUtils/mongodb-utils/connection-test.js
```

## Debugging Common Issues

### Redis Connection Problems
1. **Check port availability**: `netstat -tlnp | grep 6379`
2. **Verify process status**: `ps aux | grep redis`
3. **Review logs**: Check console for Redis startup messages
4. **Test direct connection**: Use `redis-cli` if available

### MongoDB Connection Issues
1. **Verify data directory**: Ensure `mongodb_data/` exists and is writable
2. **Check process**: `ps aux | grep mongod`
3. **Port conflicts**: Ensure MongoDB port is available
4. **Review startup logs**: Check MongoDB process output

### Service Activation Delays
- **Redis**: 2-3 second startup is normal
- **MongoDB**: 15-100ms startup is normal
- **Timeout issues**: Increase connection timeout in service configuration

## Development Best Practices

### Service Layer Design
```typescript
interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}
```

### Error Handling Patterns
```typescript
try {
  await serviceOperation();
} catch (error) {
  if (error.code === 'SERVICE_UNAVAILABLE') {
    // Handle graceful degradation
    await fallbackOperation();
  } else {
    // Handle unexpected errors
    throw error;
  }
}
```

### Configuration Management
```typescript
const config = {
  redis: {
    enabled: process.env.REDIS_URL ? true : false,
    fallback: process.env.USE_REDIS_FALLBACK === 'true'
  },
  mongodb: {
    enabled: process.env.MONGODB_URL ? true : false,
    fallback: false // MongoDB never falls back per guidelines
  }
};
```

## Monitoring and Observability

### Health Check Implementation
```typescript
app.get('/api/health/services', async (req, res) => {
  const status = {
    redis: await redisService.health(),
    mongodb: await mongoService.health(),
    database: await dbService.health()
  };
  res.json(status);
});
```

### Performance Monitoring
```typescript
const metrics = {
  redis: {
    connectionTime: await measureConnectionTime(),
    operationsPerSecond: await measureThroughput(),
    memoryUsage: await getMemoryStats()
  }
};
```

### Logging Best Practices
```typescript
logger.info('Service activation', {
  service: 'redis',
  startupTime: '2.3s',
  port: 6379,
  environment: 'development'
});
```

## Deployment Considerations

### Environment Detection
The system automatically detects deployment environment:
- **Replit**: Enables on-demand services
- **Docker**: Uses external service connections
- **Production**: Optimizes for external service availability

### Service Scaling
- **Redis**: Single instance with connection pooling
- **MongoDB**: Supports replica sets in production
- **PostgreSQL**: Primary database with read replicas

### Backup and Recovery
- **PostgreSQL**: Primary data source, regular backups required
- **Redis**: Cache only, data loss acceptable
- **MongoDB**: Document storage, backup recommended for production