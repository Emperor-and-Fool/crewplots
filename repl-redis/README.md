# Repl-Redis v1.0.0

A lightweight, custom Redis implementation specifically designed to run in Replit's containerized environment.

## What is Repl-Redis?

Repl-Redis is a **21KB standalone Redis server** that solves the persistent challenge of running Redis in Replit containers. While standard Redis implementations fail due to memory mapping constraints and jemalloc allocator issues in containerized environments, Repl-Redis provides a working solution with full RESP-2 protocol compliance and ioredis compatibility.

## The Problem We Solved

Standard Redis servers consistently fail in Replit with:
- Exit code 1 (jemalloc memory allocation failures)
- Memory mapping errors (`vm.max_map_count` kernel parameter restrictions)
- Protocol compatibility issues with Node.js Redis clients

No existing solutions could maintain persistent Redis functionality in Replit's environment.

## Our Solution

**Custom C Implementation**:
- Pure in-memory storage (no disk persistence)
- No jemalloc dependency (uses system malloc)
- Complete RESP-2 protocol implementation
- Native ioredis client compatibility
- Handles up to 10,000 key-value pairs
- Automatic TTL (Time To Live) support

## Technical Specifications

- **Binary Size**: 21,864 bytes (~21KB)
- **Storage**: In-memory array with 10,000 key capacity
- **Protocol**: Full RESP-2 compliance
- **Commands**: PING, SET, GET, SETEX, DEL, EXISTS, AUTH, SELECT, INFO
- **Networking**: TCP socket on port 6379
- **Concurrency**: Multi-client connection support with select() multiplexing
- **Dependencies**: Zero external dependencies

## Key Features

### RESP-2 Protocol Implementation
- Array command parsing (`*N\r\n` format)
- Bulk string handling (`$length\r\ndata\r\n`)
- Proper protocol frame boundaries
- Error response formatting (`-ERR message\r\n`)
- Integer responses (`:number\r\n`)

### ioredis Compatibility
- **SETEX command** (essential for session management with TTL)
- **Auto-pipelining support**
- **Concurrent connection handling**
- **Buffered I/O** for performance
- No "Protocol error, got '.' as reply type byte" issues

### Session Management Ready
- TTL support for session expiration
- Atomic operations for session state
- Multiple concurrent client connections
- Graceful connection cleanup

## Usage

### Direct Server Launch
```bash
./repl-redis/production-redis
```

The server automatically:
- Binds to 127.0.0.1:6379
- Handles SIGTERM for graceful shutdown
- Supports up to 100 concurrent connections
- Manages automatic key expiration

### On-Demand Service Integration
For production applications, use the on-demand service adapter (`../adapters-repl/redis-ondemand/`) which provides:
- Automatic server lifecycle management
- Connection pooling with configurable keepalive
- Resource conservation through smart activation
- Integration with application session management

```typescript
import { OnDemandRedisService } from '../adapters-repl/redis-ondemand/on-demand-redis';

const redisService = OnDemandRedisService.getInstance();
const result = await redisService.withConnection(async (client) => {
  return await client.setex('session:123', 3600, 'user_data');
});
```

### Integration with Node.js
```javascript
import Redis from 'ioredis';

const client = new Redis({
  host: '127.0.0.1',
  port: 6379,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3
});

// Full ioredis compatibility
await client.setex('session:123', 3600, 'user_data');
const value = await client.get('session:123');
```

## Replit-Specific Advantages

1. **Container Compatibility**: Bypasses kernel parameter restrictions
2. **Memory Efficiency**: No jemalloc overhead or memory mapping
3. **Quick Startup**: Instant server initialization
4. **Persistent Connections**: Stays alive throughout development sessions
5. **Zero Configuration**: Works out-of-the-box with no setup

## Limitations

- **No Persistence**: Data is lost on server restart (by design for development)
- **Limited Commands**: Implements core Redis commands only
- **Fixed Capacity**: 10,000 keys maximum
- **No Clustering**: Single-instance operation only

## Version History

### v1.0.0 (Current)
- Initial release
- Full RESP-2 protocol implementation
- ioredis compatibility layer
- Multi-client connection support
- TTL/SETEX command support
- Replit container optimization

## Development Context

This implementation was created to enable Redis-based session management and caching in Replit development environments where standard Redis installations consistently fail. It provides the essential Redis functionality needed for web application development without the complexity and compatibility issues of full Redis installations.

## License

Custom implementation for Replit development environments.