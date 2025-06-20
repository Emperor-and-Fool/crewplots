# Redis Development History Archive

This directory contains the complete development history and experimental code for the custom Redis implementation used in CrewPlots.

## Contents

### Source Code Evolution
- **production-redis.c** - Original production version (13,747 bytes)
- **mini-redis.c** - Minimal implementation attempt (16,836 bytes)
- **simple-redis.c** - Simplified version (12,048 bytes)

### Full Redis Distribution
- **redis-stable/** - Complete Redis 7.0 source code for reference
- **Redis-replit/** - Replit-specific Redis adaptation attempts

### Development Tools
- **redis-detective.sh** - Debugging and analysis scripts
- **redis-stability-test.cjs** - Stability testing utilities
- **redis-protocol-test.cjs** - Protocol compliance testing
- **start-*.sh** - Various startup scripts and configurations

### Service Integration
- **redis-service.ts** - TypeScript service implementations
- **redis-supervisor.ts** - Process supervision attempts
- **keepalive-manager.js** - Connection management experiments

### Configuration & Data
- **redis_data/** - Configuration files and data persistence experiments
- **redis.conf** - Various Redis configuration attempts

## Development Timeline

This archive represents months of Redis adaptation work for Replit's container environment, including:

1. Initial Redis compilation attempts
2. Memory allocation workarounds (jemalloc issues)
3. Container constraint adaptations
4. Custom protocol implementation
5. On-demand service architecture development

## Current Production

The active Redis implementation is located in the parent directory as `production-redis.c` (16,666 bytes), which represents the final optimized version with:
- Doubled buffer sizes (16384 vs 8192)
- Increased value storage (4096 vs 2048)
- Enhanced store capacity (15000 vs 10000)

## Usage

This archive serves as historical reference and debugging resource. The production system should continue using the parent directory's `production-redis.c` and related build artifacts.