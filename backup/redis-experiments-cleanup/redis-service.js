const { spawn } = require('child_process');
const Redis = require('ioredis');
const express = require('express');

class RedisService {
  constructor() {
    this.redisProcess = null;
    this.redisClient = null;
    this.proxyApp = null;
    this.proxyServer = null;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('Redis service already running');
      return;
    }

    try {
      // Start production Redis server
      console.log('Starting production Redis server...');
      this.redisProcess = spawn('./production-redis', [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.redisProcess.stdout.on('data', (data) => {
        console.log(`Redis: ${data.toString().trim()}`);
      });

      this.redisProcess.stderr.on('data', (data) => {
        console.error(`Redis Error: ${data.toString().trim()}`);
      });

      this.redisProcess.on('close', (code) => {
        console.log(`Redis process exited with code ${code}`);
        this.isRunning = false;
      });

      // Wait for Redis to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create Redis client
      this.redisClient = new Redis({
        host: '127.0.0.1',
        port: 6379,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
        lazyConnect: true
      });

      await this.redisClient.connect();
      console.log('✅ Redis client connected successfully');

      // Create Express proxy for HTTP access
      this.proxyApp = express();
      this.proxyApp.use(express.json());

      // GET /redis/:key
      this.proxyApp.get('/redis/:key', async (req, res) => {
        try {
          const value = await this.redisClient.get(req.params.key);
          res.json({ success: true, value });
        } catch (error) {
          res.status(500).json({ success: false, error: error.message });
        }
      });

      // POST /redis/:key
      this.proxyApp.post('/redis/:key', async (req, res) => {
        try {
          const { value, ttl } = req.body;
          if (ttl) {
            await this.redisClient.setex(req.params.key, ttl, value);
          } else {
            await this.redisClient.set(req.params.key, value);
          }
          res.json({ success: true });
        } catch (error) {
          res.status(500).json({ success: false, error: error.message });
        }
      });

      // DELETE /redis/:key
      this.proxyApp.delete('/redis/:key', async (req, res) => {
        try {
          const result = await this.redisClient.del(req.params.key);
          res.json({ success: true, deleted: result });
        } catch (error) {
          res.status(500).json({ success: false, error: error.message });
        }
      });

      // POST /redis/ping
      this.proxyApp.post('/redis/ping', async (req, res) => {
        try {
          const result = await this.redisClient.ping();
          res.json({ success: true, result });
        } catch (error) {
          res.status(500).json({ success: false, error: error.message });
        }
      });

      // Start proxy server
      this.proxyServer = this.proxyApp.listen(6381, '127.0.0.1', () => {
        console.log('✅ Redis HTTP proxy listening on port 6381');
      });

      this.isRunning = true;
      console.log('🚀 Redis service started successfully');

    } catch (error) {
      console.error('❌ Failed to start Redis service:', error);
      await this.stop();
      throw error;
    }
  }

  async stop() {
    console.log('Stopping Redis service...');
    
    if (this.redisClient) {
      await this.redisClient.disconnect();
      this.redisClient = null;
    }

    if (this.proxyServer) {
      this.proxyServer.close();
      this.proxyServer = null;
    }

    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
      this.redisProcess = null;
    }

    this.isRunning = false;
    console.log('✅ Redis service stopped');
  }

  getClient() {
    return this.redisClient;
  }
}

module.exports = RedisService;