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
    console.log('🔧 Starting Mini Redis server (jemalloc-free)...');
    
    // Use our custom mini-redis implementation
    const miniRedisPath = path.join(__dirname, 'mini-redis');
    
    return new Promise((resolve, reject) => {
      this.redisProcess = spawn(miniRedisPath, [this.redisPort.toString()], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        cwd: __dirname
      });

      let startupOutput = '';
      
      this.redisProcess.stdout.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        console.log('Mini Redis stdout:', output.trim());
        
        if (output.includes('Ready to accept connections')) {
          console.log('✅ Mini Redis server started successfully');
          resolve();
        }
      });

      this.redisProcess.stderr.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        console.log('Mini Redis stderr:', output.trim());
      });

      this.redisProcess.on('error', (error) => {
        console.log('❌ Mini Redis process error:', error.message);
        reject(error);
      });

      this.redisProcess.on('exit', (code, signal) => {
        console.log(`❌ Mini Redis process exited with code ${code}, signal ${signal}`);
        if (code !== 0 && !startupOutput.includes('Ready to accept connections')) {
          reject(new Error(`Mini Redis exited with code ${code}`));
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!startupOutput.includes('Ready to accept connections')) {
          reject(new Error('Mini Redis startup timeout'));
        }
      }, 5000);
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
      lazyConnect: true,
      // Reduce command timeout for mini-redis compatibility
      commandTimeout: 5000,
      // Disable keepalive that might not be supported
      keepAlive: false
    });

    try {
      await this.redisClient.connect();
      // Test with a simple command instead of ping
      await this.redisClient.set('test', 'connection');
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