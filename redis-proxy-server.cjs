const express = require('express');
const { spawn } = require('child_process');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

class RedisProxyServer {
  constructor() {
    this.app = express();
    this.redisProcess = null;
    this.redisClient = null;
    this.port = 6380; // Redis proxy port
    this.redisPort = 6379; // Redis server port
    this.dataDir = path.join(__dirname, 'redis_data');
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    this.setupRoutes();
  }

  async startRedisServer() {
    console.log('🔧 Starting Redis server with memory constraints...');
    
    // Create custom Redis config file to bypass jemalloc
    const configPath = path.join(this.dataDir, 'redis-custom.conf');
    const redisConfigContent = `
# Custom Redis configuration for Replit compatibility
port ${this.redisPort}
bind 127.0.0.1
protected-mode no
daemonize no
save 60 1
dir ${this.dataDir}
maxmemory 32mb
maxmemory-policy allkeys-lru
databases 4
tcp-keepalive 300
timeout 0
tcp-backlog 128
# Disable persistence to reduce memory usage
save ""
stop-writes-on-bgsave-error no
rdbcompression no
rdbchecksum no
# Reduce memory overhead
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
stream-node-max-bytes 4096
stream-node-max-entries 100
`;
    
    fs.writeFileSync(configPath, redisConfigContent);
    
    // Use environment variable to potentially override allocator
    const env = { 
      ...process.env,
      MALLOC_ARENA_MAX: '1',
      MALLOC_MMAP_THRESHOLD_: '2048',
      MALLOC_TRIM_THRESHOLD_: '128'
    };
    
    const redisConfig = [configPath];

    return new Promise((resolve, reject) => {
      this.redisProcess = spawn('redis-server', redisConfig, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env: env
      });

      let startupOutput = '';
      
      this.redisProcess.stdout.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        console.log('Redis stdout:', output.trim());
        
        if (output.includes('Ready to accept connections')) {
          console.log('✅ Redis server started successfully');
          resolve();
        }
      });

      this.redisProcess.stderr.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        console.log('Redis stderr:', output.trim());
        
        // Check for common failure patterns
        if (output.includes('Address already in use') || 
            output.includes('Can\'t set up TLS') ||
            output.includes('jemalloc') ||
            output.includes('TLS block allocation')) {
          console.log('❌ Redis startup failed with known issue');
          reject(new Error(`Redis startup failed: ${output}`));
        }
      });

      this.redisProcess.on('error', (error) => {
        console.log('❌ Redis process error:', error.message);
        reject(error);
      });

      this.redisProcess.on('exit', (code, signal) => {
        console.log(`❌ Redis process exited with code ${code}, signal ${signal}`);
        if (code !== 0 && !startupOutput.includes('Ready to accept connections')) {
          reject(new Error(`Redis exited with code ${code}`));
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!startupOutput.includes('Ready to accept connections')) {
          reject(new Error('Redis startup timeout'));
        }
      }, 10000);
    });
  }

  async connectToRedis() {
    console.log('🔌 Connecting to Redis...');
    
    this.redisClient = new Redis({
      host: '127.0.0.1',
      port: this.redisPort,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    try {
      await this.redisClient.connect();
      await this.redisClient.ping();
      console.log('✅ Connected to Redis successfully');
      return true;
    } catch (error) {
      console.log('❌ Redis connection failed:', error.message);
      throw error;
    }
  }

  setupRoutes() {
    this.app.use(express.json());

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        redis: this.redisClient ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      });
    });

    // Redis SET operation
    this.app.post('/set', async (req, res) => {
      try {
        const { key, value, ttl } = req.body;
        
        if (!key || value === undefined) {
          return res.status(400).json({ error: 'Key and value are required' });
        }

        let result;
        if (ttl) {
          result = await this.redisClient.setex(key, ttl, JSON.stringify(value));
        } else {
          result = await this.redisClient.set(key, JSON.stringify(value));
        }

        res.json({ success: true, result });
      } catch (error) {
        console.error('Redis SET error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Redis GET operation
    this.app.get('/get/:key', async (req, res) => {
      try {
        const { key } = req.params;
        const value = await this.redisClient.get(key);
        
        if (value === null) {
          return res.status(404).json({ error: 'Key not found' });
        }

        try {
          const parsedValue = JSON.parse(value);
          res.json({ key, value: parsedValue });
        } catch {
          res.json({ key, value });
        }
      } catch (error) {
        console.error('Redis GET error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Redis DEL operation
    this.app.delete('/del/:key', async (req, res) => {
      try {
        const { key } = req.params;
        const result = await this.redisClient.del(key);
        res.json({ success: true, deleted: result });
      } catch (error) {
        console.error('Redis DEL error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Redis EXISTS operation
    this.app.get('/exists/:key', async (req, res) => {
      try {
        const { key } = req.params;
        const exists = await this.redisClient.exists(key);
        res.json({ key, exists: !!exists });
      } catch (error) {
        console.error('Redis EXISTS error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Redis KEYS operation (for development only)
    this.app.get('/keys/:pattern?', async (req, res) => {
      try {
        const pattern = req.params.pattern || '*';
        const keys = await this.redisClient.keys(pattern);
        res.json({ pattern, keys });
      } catch (error) {
        console.error('Redis KEYS error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Redis TTL operation
    this.app.get('/ttl/:key', async (req, res) => {
      try {
        const { key } = req.params;
        const ttl = await this.redisClient.ttl(key);
        res.json({ key, ttl });
      } catch (error) {
        console.error('Redis TTL error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Redis FLUSHDB operation (for development)
    this.app.post('/flush', async (req, res) => {
      try {
        await this.redisClient.flushdb();
        res.json({ success: true, message: 'Database flushed' });
      } catch (error) {
        console.error('Redis FLUSH error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  async start() {
    try {
      console.log('🚀 Starting Redis Proxy Server...');
      
      // Start Redis server
      await this.startRedisServer();
      
      // Wait a moment for Redis to fully initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Connect to Redis
      await this.connectToRedis();
      
      // Start Express server
      this.app.listen(this.port, '0.0.0.0', () => {
        console.log(`✅ Redis Proxy Server running on port ${this.port}`);
        console.log(`📊 Redis server running on port ${this.redisPort}`);
        console.log(`🔗 Proxy endpoints available at http://localhost:${this.port}`);
      });
      
    } catch (error) {
      console.error('❌ Failed to start Redis proxy server:', error.message);
      await this.stop();
      process.exit(1);
    }
  }

  async stop() {
    console.log('🛑 Shutting down Redis Proxy Server...');
    
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
    
    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
      this.redisProcess = null;
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  if (global.redisProxy) {
    await global.redisProxy.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  if (global.redisProxy) {
    await global.redisProxy.stop();
  }
  process.exit(0);
});

// Start the server
const redisProxy = new RedisProxyServer();
global.redisProxy = redisProxy;
redisProxy.start();