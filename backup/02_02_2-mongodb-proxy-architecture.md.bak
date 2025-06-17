# MongoDB Proxy Architecture for Constrained Environments

## Overview

This document describes the Infrastructure-as-Code (IaC) setup for running MongoDB in constrained container environments like Replit, where direct MongoDB connections fail due to networking and kernel parameter limitations.

## Problem Statement

**MongoDB Connectivity Issues in Replit:**
- MongoDB process starts successfully but client connections are refused
- `vm.max_map_count` kernel parameter cannot be tuned in container environment
- Direct database connections blocked at system networking level
- WiredTiger storage engine requires memory mapping that exceeds container limits

## Solution: Three-Server Architecture

### Service Topology

```
┌─────────────────┐    HTTP/REST    ┌──────────────────┐    Local     ┌─────────────┐
│  Main App       │ ◄──────────────► │ MongoDB Proxy    │ ◄──────────► │  MongoDB    │
│  (Port 3000)    │                 │  Service         │              │  (Port 27017)│
│                 │                 │  (Port 3001)     │              │             │
│ • Express Server│                 │ • Express Server │              │ • WiredTiger│
│ • Authentication│                 │ • MongoDB Client │              │ • Tuned Cache│
│ • PostgreSQL    │                 │ • REST Endpoints │              │ • Document  │
│ • Web Routes    │                 │ • HTTP Bridge    │              │   Storage   │
└─────────────────┘                 └──────────────────┘              └─────────────┘
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌──────────────────┐
│  PostgreSQL     │                 │  MongoDB Process │
│  Service        │                 │  Internal        │
│ • Metadata      │                 │ • --wiredTiger   │
│ • User Data     │                 │   CacheSizeGB    │
│ • Fallback Store│                 │   0.25           │
└─────────────────┘                 │ • Stable Process │
                                    └──────────────────┘
```

## Component Details

### 1. Main Application Server
**File:** `server/index.ts`
**Port:** 3000
**Responsibilities:**
- Web application routing and authentication
- PostgreSQL database operations
- Session management
- File uploads and static content
- Fallback data storage when MongoDB unavailable

### 2. MongoDB Proxy Service
**File:** `mongo-proxy-server.js`
**Port:** 3001
**Responsibilities:**
- Start and manage MongoDB process internally
- Provide REST API endpoints for MongoDB operations
- Handle connection pooling and error recovery
- Bridge HTTP requests to MongoDB collections

**Key Configuration:**
```javascript
mongodProcess = spawn('mongod', [
  '--dbpath', './mongodb_data',
  '--port', '27017',
  '--bind_ip', '127.0.0.1',
  '--wiredTigerCacheSizeGB', '0.25',  // Critical for Replit
  '--logpath', './mongodb_proxy.log',
  '--fork'
]);
```

### 3. MongoDB Internal Process
**Port:** 27017 (internal only)
**Configuration:**
- **Cache Size:** 0.25GB (minimum allowed, prevents memory mapping issues)
- **Bind IP:** 127.0.0.1 (local connections only)
- **Storage Engine:** WiredTiger with tuned parameters
- **Process Management:** Forked background process

## API Interface

### MongoDB Proxy REST Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET    | `/health` | Service health check |
| POST   | `/collections/:collection/insert` | Insert document |
| GET    | `/collections/:collection/find` | Find documents |
| GET    | `/collections/:collection/findOne` | Find single document |
| PUT    | `/collections/:collection/update` | Update document |
| DELETE | `/collections/:collection/delete` | Delete document |
| POST   | `/gridfs/:bucket/upload` | GridFS file upload |

### Example Usage

```javascript
// Insert document via proxy
const response = await fetch('http://localhost:3001/collections/messages/insert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: "Hello World",
    userId: 123,
    timestamp: new Date()
  })
});

// Find documents via proxy
const documents = await fetch('http://localhost:3001/collections/messages/find?q=' + 
  encodeURIComponent(JSON.stringify({ userId: 123 }))
).then(res => res.json());
```

## Deployment Configuration

### Environment Variables
```env
# MongoDB Proxy Service
MONGO_PROXY_PORT=3001
MONGODB_URL=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=crewplots_documents

# Main Application
DATABASE_URL=postgresql://...
PORT=3000
```

### Process Management
```bash
# Start MongoDB Proxy Service
nohup node mongo-proxy-server.js > mongo-proxy.log 2>&1 &

# Start Main Application
npm run dev
```

### Resource Requirements
- **Memory:** Minimum 512MB available for MongoDB cache
- **Disk:** 100MB+ for MongoDB data directory
- **CPU:** Single core sufficient for development
- **Network:** Internal localhost communication only

## Development Workflow

### Local Development Setup
1. **Start MongoDB Proxy:** `node mongo-proxy-server.js`
2. **Verify Health:** `curl http://localhost:3001/health`
3. **Start Main App:** `npm run dev`
4. **Test Integration:** Application automatically detects proxy availability

### Service Discovery
```javascript
// Main application detects MongoDB proxy
async function detectMongoDBProxy() {
  try {
    const response = await fetch('http://localhost:3001/health');
    const health = await response.json();
    return health.mongodb === 'connected';
  } catch {
    return false;
  }
}
```

## Troubleshooting

### Common Issues

**Proxy Service Won't Start:**
```bash
# Check MongoDB process
ps aux | grep mongod

# Check logs
tail -f mongo-proxy.log
tail -f mongodb_proxy.log
```

**MongoDB Connection Refused:**
- Verify cache size: `--wiredTigerCacheSizeGB 0.25` (minimum)
- Check bind IP: `--bind_ip 127.0.0.1` (localhost only)
- Ensure data directory exists and is writable

**Memory Mapping Warnings:**
```
vm.max_map_count is too low
```
- Expected in container environments
- Does not prevent operation with tuned cache size
- Process remains stable despite warning

### Performance Optimization

**Cache Tuning:**
- Minimum cache: 0.25GB (MongoDB requirement)
- Optimal for Replit: 0.25GB - 0.5GB
- Monitor with: `db.serverStatus().wiredTiger.cache`

**Connection Pooling:**
```javascript
// Proxy service internal connection
mongoClient = new MongoClient('mongodb://127.0.0.1:27017', {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 5000
});
```

## Benefits

### Operational Advantages
- **Isolation:** MongoDB failures don't crash main application
- **Scalability:** Proxy service can be horizontally scaled
- **Monitoring:** Centralized logging and health checks
- **Fallback:** Automatic PostgreSQL fallback when proxy unavailable

### Development Benefits
- **Local Testing:** Works in any container environment
- **Debugging:** Clear separation of concerns
- **Integration:** Drop-in replacement for direct MongoDB connections
- **Migration:** Easy transition to cloud MongoDB services

## Production Considerations

### Security
- Proxy service should only bind to localhost
- No external MongoDB port exposure
- Authentication handled by main application
- Consider TLS for inter-service communication

### Monitoring
```javascript
// Health check with metrics
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoDb ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});
```

### Backup Strategy
- MongoDB data directory: `./mongodb_data`
- Automatic journaling enabled
- Consider MongoDB Atlas migration for production
- PostgreSQL fallback provides data redundancy

## Migration Path

### From Development to Production
1. **Phase 1:** Use proxy architecture for development/testing
2. **Phase 2:** Deploy MongoDB Atlas or dedicated MongoDB server
3. **Phase 3:** Update connection strings to point to production MongoDB
4. **Phase 4:** Remove proxy service, maintain fallback logic

### Backward Compatibility
```javascript
// Connection strategy priority
const connectionMethods = [
  'mongodb://production-atlas-url',
  'http://localhost:3001',  // Proxy fallback
  'postgresql-fallback'     // Ultimate fallback
];
```

This architecture successfully resolves MongoDB connectivity issues in constrained environments while maintaining development velocity and providing a clear migration path to production deployments.