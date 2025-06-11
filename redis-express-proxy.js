const express = require('express');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

class RedisExpressProxy {
  constructor() {
    this.app = express();
    this.redisProcess = null;
    this.proxyServer = null;
    this.isRunning = false;
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: this.isRunning ? 'running' : 'stopped',
        redis: this.redisProcess ? 'active' : 'inactive',
        proxy: this.proxyServer ? 'active' : 'inactive'
      });
    });

    // Start Redis service
    this.app.post('/start', async (req, res) => {
      try {
        if (this.isRunning) {
          return res.json({ success: true, message: 'Redis already running' });
        }

        await this.startMiniRedis();
        await this.startTcpProxy();
        this.isRunning = true;

        res.json({ success: true, message: 'Redis service started successfully' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Stop Redis service
    this.app.post('/stop', async (req, res) => {
      try {
        await this.stop();
        res.json({ success: true, message: 'Redis service stopped' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Test Redis connection
    this.app.get('/test', async (req, res) => {
      try {
        const Redis = require('ioredis');
        const client = new Redis({
          host: '127.0.0.1',
          port: 6380,
          lazyConnect: true,
          connectTimeout: 5000,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3
        });

        await client.connect();
        await client.set('test:health', 'ok');
        const result = await client.get('test:health');
        const ping = await client.ping();
        await client.quit();

        res.json({ 
          success: true, 
          test: result, 
          ping: ping,
          message: 'Redis connection successful'
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  async startMiniRedis() {
    return new Promise((resolve, reject) => {
      const miniRedisPath = path.join(process.cwd(), 'mini-redis');
      
      this.redisProcess = spawn(miniRedisPath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      let hasStarted = false;

      this.redisProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('Mini Redis:', output.trim());
        if (output.includes('Ready to accept connections') && !hasStarted) {
          hasStarted = true;
          resolve();
        }
      });

      this.redisProcess.stderr?.on('data', (data) => {
        console.error('Mini Redis stderr:', data.toString());
      });

      this.redisProcess.on('error', (error) => {
        if (!hasStarted) {
          reject(error);
        }
      });

      this.redisProcess.on('close', (code) => {
        console.log(`Mini Redis process exited with code ${code}`);
        this.isRunning = false;
      });

      // Timeout if Redis doesn't start within 10 seconds
      setTimeout(() => {
        if (!hasStarted) {
          reject(new Error('Mini Redis startup timeout after 10 seconds'));
        }
      }, 10000);
    });
  }

  async startTcpProxy() {
    return new Promise((resolve, reject) => {
      this.proxyServer = net.createServer((clientSocket) => {
        const redisSocket = net.createConnection(6379, '127.0.0.1');
        
        clientSocket.pipe(redisSocket);
        redisSocket.pipe(clientSocket);
        
        clientSocket.on('error', (err) => {
          console.log('Client socket error:', err.message);
          redisSocket.destroy();
        });
        
        redisSocket.on('error', (err) => {
          console.log('Redis socket error:', err.message);
          clientSocket.destroy();
        });
      });

      this.proxyServer.listen(6380, '127.0.0.1', () => {
        console.log('✅ Redis TCP proxy listening on port 6380');
        resolve();
      });

      this.proxyServer.on('error', (error) => {
        console.error('Proxy server error:', error);
        reject(error);
      });
    });
  }

  async stop() {
    console.log('Stopping Redis services...');
    
    if (this.proxyServer) {
      this.proxyServer.close();
      this.proxyServer = null;
    }

    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
      this.redisProcess = null;
    }

    this.isRunning = false;
    console.log('Redis services stopped');
  }

  listen(port = 3001) {
    return new Promise((resolve) => {
      this.app.listen(port, '127.0.0.1', () => {
        console.log(`🚀 Redis Express Proxy running on port ${port}`);
        resolve();
      });
    });
  }
}

// Auto-start if run directly
if (require.main === module) {
  const proxy = new RedisExpressProxy();
  
  proxy.listen(3001).then(async () => {
    console.log('Starting Redis service automatically...');
    try {
      await proxy.startMiniRedis();
      await proxy.startTcpProxy();
      proxy.isRunning = true;
      console.log('✅ Redis service started successfully');
    } catch (error) {
      console.error('❌ Failed to start Redis service:', error.message);
    }
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await proxy.stop();
    process.exit(0);
  });
}

module.exports = RedisExpressProxy;