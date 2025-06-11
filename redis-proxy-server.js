import express from 'express';
import { createClient } from 'redis';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RedisProxyServer {
  constructor() {
    this.app = express();
    this.redisClient = null;
    this.redisProcess = null;
    this.port = 3002; // Different port from MongoDB proxy
    this.redisPort = 6379;
    
    // Middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Setup routes
    this.setupRoutes();
  }

  async startRedisServer() {
    console.log('🚀 Starting Redis server...');
    
    // Create redis data directory
    const redisDataDir = path.join(__dirname, 'redis_data');
    if (!fs.existsSync(redisDataDir)) {
      fs.mkdirSync(redisDataDir, { recursive: true });
    }

    // Create Redis config optimized for Replit environment
    const redisConfig = `
# Redis configuration for Replit environment
port 6379
bind 127.0.0.1
dir ${redisDataDir}

# Disable daemonization for container environment
daemonize no

# Memory constraints for Replit environment
maxmemory 64mb
maxmemory-policy allkeys-lru

# Persistence settings
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error no
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb

# Connection settings
timeout 0
tcp-keepalive 300

# Logging
loglevel notice
logfile ""

# Disable potentially problematic features
protected-mode no
`;

    const configPath = path.join(__dirname, 'redis-proxy.conf');
    fs.writeFileSync(configPath, redisConfig);

    return new Promise((resolve, reject) => {
      // Start Redis server with environment variables to bypass jemalloc TLS issues
      this.redisProcess = spawn('redis-server', [configPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
        env: {
          ...process.env,
          MALLOC_CONF: 'background_thread:false,metadata_thp:disabled',
          LD_PRELOAD: '', // Clear any existing LD_PRELOAD
          JEMALLOC_SYS_WITH_LG_PAGE: '12'
        }
      });

      let started = false;
      const timeout = setTimeout(() => {
        if (!started) {
          reject(new Error('Redis server startup timeout'));
        }
      }, 10000);

      this.redisProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Redis server:', output.trim());
        
        if (output.includes('Ready to accept connections') && !started) {
          started = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      this.redisProcess.stderr.on('data', (data) => {
        console.error('Redis server error:', data.toString().trim());
      });

      this.redisProcess.on('exit', (code) => {
        console.log(`Redis server exited with code ${code}`);
        if (!started) {
          reject(new Error(`Redis server failed to start (exit code ${code})`));
        }
      });
    });
  }

  async connectToRedis() {
    console.log('🔗 Connecting to Redis...');
    
    this.redisClient = createClient({
      socket: {
        host: '127.0.0.1',
        port: this.redisPort,
        connectTimeout: 5000,
        commandTimeout: 5000
      },
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 10) {
          return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 3) {
          return new Error('Redis max retry attempts reached');
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    this.redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    this.redisClient.on('connect', () => {
      console.log('✅ Redis client connected');
    });

    await this.redisClient.connect();
    
    // Test connection
    await this.redisClient.ping();
    console.log('✅ Redis ping successful');
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        if (!this.redisClient) {
          return res.status(503).json({ 
            status: 'error', 
            message: 'Redis client not connected' 
          });
        }
        
        const pong = await this.redisClient.ping();
        res.json({ 
          status: 'healthy', 
          redis: pong,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(503).json({ 
          status: 'error', 
          message: error.message 
        });
      }
    });

    // Set key-value
    this.app.post('/set', async (req, res) => {
      try {
        const { key, value, ttl } = req.body;
        
        if (!key || value === undefined) {
          return res.status(400).json({ 
            error: 'Missing required fields: key, value' 
          });
        }

        let result;
        if (ttl && ttl > 0) {
          result = await this.redisClient.setEx(key, ttl, JSON.stringify(value));
        } else {
          result = await this.redisClient.set(key, JSON.stringify(value));
        }

        res.json({ 
          success: true, 
          key, 
          result,
          ttl: ttl || null,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Redis SET error:', error);
        res.status(500).json({ 
          error: 'Failed to set value', 
          details: error.message 
        });
      }
    });

    // Get value
    this.app.get('/get/:key', async (req, res) => {
      try {
        const { key } = req.params;
        const value = await this.redisClient.get(key);
        
        res.json({ 
          key, 
          value: value ? JSON.parse(value) : null,
          exists: value !== null,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Redis GET error:', error);
        res.status(500).json({ 
          error: 'Failed to get value', 
          details: error.message 
        });
      }
    });

    // Delete key
    this.app.delete('/del/:key', async (req, res) => {
      try {
        const { key } = req.params;
        const result = await this.redisClient.del(key);
        
        res.json({ 
          key, 
          deleted: result === 1,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Redis DELETE error:', error);
        res.status(500).json({ 
          error: 'Failed to delete key', 
          details: error.message 
        });
      }
    });

    // List keys (with pattern support)
    this.app.get('/keys/:pattern?', async (req, res) => {
      try {
        const pattern = req.params.pattern || '*';
        const keys = await this.redisClient.keys(pattern);
        
        res.json({ 
          pattern, 
          keys,
          count: keys.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Redis KEYS error:', error);
        res.status(500).json({ 
          error: 'Failed to list keys', 
          details: error.message 
        });
      }
    });

    // Redis info
    this.app.get('/info', async (req, res) => {
      try {
        const info = await this.redisClient.info();
        const dbSize = await this.redisClient.dbSize();
        
        res.json({ 
          info: info.split('\n').reduce((acc, line) => {
            const [key, value] = line.split(':');
            if (key && value) {
              acc[key.trim()] = value.trim();
            }
            return acc;
          }, {}),
          dbSize,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Redis INFO error:', error);
        res.status(500).json({ 
          error: 'Failed to get Redis info', 
          details: error.message 
        });
      }
    });
  }

  async start() {
    try {
      // Start Redis server first
      await this.startRedisServer();
      
      // Wait a moment for Redis to fully initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Connect to Redis
      await this.connectToRedis();
      
      // Start HTTP proxy server
      return new Promise((resolve) => {
        this.app.listen(this.port, '0.0.0.0', () => {
          console.log(`✅ Redis Proxy Server running on port ${this.port}`);
          console.log(`📊 Health check: http://localhost:${this.port}/health`);
          console.log(`🔧 Redis info: http://localhost:${this.port}/info`);
          resolve();
        });
      });
      
    } catch (error) {
      console.error('❌ Failed to start Redis Proxy Server:', error);
      throw error;
    }
  }

  async stop() {
    console.log('🛑 Stopping Redis Proxy Server...');
    
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
    }
  }
}

// Start the server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new RedisProxyServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
  server.start().catch((error) => {
    console.error('❌ Failed to start Redis Proxy Server:', error);
    process.exit(1);
  });
}

export default RedisProxyServer;