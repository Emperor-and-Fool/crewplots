# DevOpUtils Directory

This directory contains development operations utilities, test routes, and maintenance scripts that are separate from the core application functionality.

## Directory Structure

### `/scripts/`
Development and maintenance scripts:
- `delete-mongo-doc.js` - Utility script for MongoDB document cleanup
- `test-redis-sessions.js` - Redis session testing script

### `/test-routes/`
Development and monitoring API routes (mounted at `/api/`):
- `cache-test.ts` - Cache service testing endpoints
- `redis-test.ts` - Redis connection and operation testing
- `redis-monitor.ts` - Redis lifecycle monitoring endpoints
- `mongodb-messages.ts` - Direct MongoDB document operations (development only)

### `/utilities/`
General development utilities (currently empty)

## Usage

### Test Routes
The test routes are automatically mounted in the main application:
- `/api/cache/*` - Cache testing endpoints
- `/api/redis-test/*` - Redis testing endpoints  
- `/api/redis-monitor/*` - Redis monitoring endpoints
- `/api/mongodb/*` - Direct MongoDB document operations (development only)

### Scripts
Run scripts from the project root:
```bash
node DevOpUtils/scripts/delete-mongo-doc.js
node DevOpUtils/scripts/test-redis-sessions.js
```

## Notes

- These utilities are for development and testing purposes
- Test routes are included in production builds but should be secured appropriately
- Scripts may require authentication tokens or active sessions to function