const { spawn } = require('child_process');
const Redis = require('ioredis');

class KeepAliveManager {
  constructor() {
    this.redisProcess = null;
    this.mongoProcess = null;
    this.redisClient = null;
    this.keepAliveInterval = null;
    this.healthCheckInterval = null;
    this.isRunning = false;
  }

  async startServices() {
    console.log('Starting Redis and MongoDB services with keepalive...');
    
    try {
      // Start Redis
      this.redisProcess = spawn('./production-redis', [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.redisProcess.on('close', (code) => {
        console.log(`Redis process exited with code ${code}, restarting...`);
        setTimeout(() => this.restartRedis(), 1000);
      });

      // Start MongoDB proxy
      this.mongoProcess = spawn('node', ['mongo-proxy-server.js'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.mongoProcess.on('close', (code) => {
        console.log(`MongoDB proxy exited with code ${code}, restarting...`);
        setTimeout(() => this.restartMongo(), 1000);
      });

      // Wait for services to start
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Create Redis client for keepalive
      this.redisClient = new Redis({
        host: '127.0.0.1',
        port: 6379,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        lazyConnect: true,
        enableAutoPipelining: true
      });

      await this.redisClient.connect();
      console.log('✅ Services started with keepalive monitoring');

      // Start keepalive routines
      this.startKeepAlive();
      this.isRunning = true;

    } catch (error) {
      console.error('Failed to start services:', error);
    }
  }

  startKeepAlive() {
    // Lightweight activity every 30 seconds to prevent idle detection
    this.keepAliveInterval = setInterval(async () => {
      try {
        // Redis keepalive - very minimal operation
        await this.redisClient.ping();
        
        // Touch a keepalive key with 60-second TTL
        await this.redisClient.setex('keepalive:heartbeat', 60, Date.now());
        
        // MongoDB proxy keepalive - HTTP health check
        const http = require('http');
        const options = {
          hostname: 'localhost',
          port: 27018,
          path: '/health',
          method: 'GET',
          timeout: 1000
        };

        const req = http.request(options, (res) => {
          // Just consume the response to complete the request
          res.on('data', () => {});
        });

        req.on('error', () => {
          // Silently ignore errors - just want to generate activity
        });

        req.end();

        console.log(`Keepalive heartbeat: ${new Date().toISOString()}`);

      } catch (error) {
        console.log('Keepalive ping failed, services may need restart');
      }
    }, 30000); // Every 30 seconds

    // Health check every 2 minutes
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 120000); // Every 2 minutes
  }

  async performHealthCheck() {
    let redisHealthy = false;
    let mongoHealthy = false;

    try {
      // Check Redis
      const pingResult = await this.redisClient.ping();
      redisHealthy = pingResult === 'PONG';
    } catch (error) {
      console.log('Redis health check failed');
    }

    try {
      // Check MongoDB proxy
      const http = require('http');
      const options = {
        hostname: 'localhost',
        port: 27018,
        path: '/health',
        method: 'GET',
        timeout: 2000
      };

      mongoHealthy = await new Promise((resolve) => {
        const req = http.request(options, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => resolve(false));
        req.end();
      });
    } catch (error) {
      console.log('MongoDB proxy health check failed');
    }

    console.log(`Health check: Redis=${redisHealthy ? '✅' : '❌'}, MongoDB=${mongoHealthy ? '✅' : '❌'}`);

    // Restart unhealthy services
    if (!redisHealthy && this.redisProcess) {
      console.log('Restarting unhealthy Redis service...');
      this.restartRedis();
    }

    if (!mongoHealthy && this.mongoProcess) {
      console.log('Restarting unhealthy MongoDB proxy...');
      this.restartMongo();
    }
  }

  async restartRedis() {
    if (this.redisProcess) {
      this.redisProcess.kill();
    }

    if (this.redisClient) {
      try {
        await this.redisClient.disconnect();
      } catch (e) {}
    }

    setTimeout(async () => {
      this.redisProcess = spawn('./production-redis', [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.redisProcess.on('close', (code) => {
        console.log(`Redis process exited with code ${code}, restarting...`);
        setTimeout(() => this.restartRedis(), 1000);
      });

      // Reconnect Redis client
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        this.redisClient = new Redis({
          host: '127.0.0.1',
          port: 6379,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          connectTimeout: 5000,
          lazyConnect: true,
          enableAutoPipelining: true
        });
        await this.redisClient.connect();
        console.log('✅ Redis restarted successfully');
      } catch (error) {
        console.log('Failed to reconnect Redis client');
      }
    }, 1000);
  }

  async restartMongo() {
    if (this.mongoProcess) {
      this.mongoProcess.kill();
    }

    setTimeout(() => {
      this.mongoProcess = spawn('node', ['mongo-proxy-server.js'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.mongoProcess.on('close', (code) => {
        console.log(`MongoDB proxy exited with code ${code}, restarting...`);
        setTimeout(() => this.restartMongo(), 1000);
      });

      console.log('✅ MongoDB proxy restarted successfully');
    }, 1000);
  }

  async stop() {
    console.log('Stopping keepalive manager...');
    this.isRunning = false;

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.redisClient) {
      try {
        await this.redisClient.disconnect();
      } catch (e) {}
    }

    if (this.redisProcess) {
      this.redisProcess.kill();
    }

    if (this.mongoProcess) {
      this.mongoProcess.kill();
    }

    console.log('✅ Keepalive manager stopped');
  }

  getStatus() {
    return {
      running: this.isRunning,
      redis: this.redisProcess && !this.redisProcess.killed,
      mongo: this.mongoProcess && !this.mongoProcess.killed
    };
  }
}

// Start the manager
const manager = new KeepAliveManager();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await manager.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await manager.stop();
  process.exit(0);
});

// Start services
manager.startServices().catch(console.error);

// Keep the process alive
setInterval(() => {
  const status = manager.getStatus();
  if (status.running) {
    process.stdout.write('.');
  }
}, 60000); // Status dot every minute