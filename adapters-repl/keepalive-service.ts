import { spawn, ChildProcess } from 'child_process';
import Redis from 'ioredis';
import http from 'http';
import path from 'path';

interface ServiceStatus {
  redis: boolean;
  mongodb: boolean;
  lastCheck: Date;
}

export class KeepAliveService {
  private redisProcess: ChildProcess | null = null;
  private mongoProcess: ChildProcess | null = null;
  private redisClient: Redis | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private status: ServiceStatus = {
    redis: false,
    mongodb: false,
    lastCheck: new Date()
  };

  constructor() {
    // Bind methods to preserve context
    this.performHealthCheck = this.performHealthCheck.bind(this);
    this.performKeepAlive = this.performKeepAlive.bind(this);
  }

  async startServices(): Promise<void> {
    if (this.isRunning) {
      console.log('KeepAlive services already running');
      return;
    }

    console.log('Starting Redis and MongoDB services with integrated keepalive...');
    
    try {
      // Start Redis
      const redisPath = path.resolve('./production-redis');
      this.redisProcess = spawn(redisPath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.redisProcess.on('close', (code) => {
        console.log(`Redis process exited with code ${code}, restarting...`);
        this.status.redis = false;
        setTimeout(() => this.restartRedis(), 2000);
      });

      this.redisProcess.on('error', (error) => {
        console.error('Redis process error:', error);
        this.status.redis = false;
      });

      // Start MongoDB proxy
      const mongoPath = path.resolve('./mongo-proxy-server.js');
      this.mongoProcess = spawn('node', [mongoPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.mongoProcess.on('close', (code) => {
        console.log(`MongoDB proxy exited with code ${code}, restarting...`);
        this.status.mongodb = false;
        setTimeout(() => this.restartMongo(), 2000);
      });

      this.mongoProcess.on('error', (error) => {
        console.error('MongoDB proxy error:', error);
        this.status.mongodb = false;
      });

      // Wait for services to initialize
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Create Redis client for keepalive
      this.redisClient = new Redis({
        host: '127.0.0.1',
        port: 6379,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        lazyConnect: true,
        enableAutoPipelining: true,
        retryDelayOnFailover: 100
      });

      try {
        await this.redisClient.connect();
        console.log('✅ Redis client connected for keepalive monitoring');
        this.status.redis = true;
      } catch (error) {
        console.log('Redis client connection will be retried during health checks');
      }

      // Start keepalive routines
      this.startKeepAlive();
      this.isRunning = true;

      console.log('✅ Integrated keepalive service started successfully');

    } catch (error) {
      console.error('Failed to start integrated keepalive services:', error);
      throw error;
    }
  }

  private startKeepAlive(): void {
    // Lightweight activity every 45 seconds
    this.keepAliveInterval = setInterval(this.performKeepAlive, 45000);
    
    // Health check every 90 seconds  
    this.healthCheckInterval = setInterval(this.performHealthCheck, 90000);
    
    // Initial health check
    setTimeout(this.performHealthCheck, 5000);
  }

  private async performKeepAlive(): Promise<void> {
    try {
      if (this.redisClient && this.status.redis) {
        // Minimal Redis activity
        await this.redisClient.ping();
        await this.redisClient.setex('keepalive:heartbeat', 120, Date.now());
      }

      // MongoDB proxy keepalive
      if (this.status.mongodb) {
        const options = {
          hostname: 'localhost',
          port: 27018,
          path: '/health',
          method: 'GET',
          timeout: 2000
        };

        const req = http.request(options, (res) => {
          res.on('data', () => {}); // Consume response
        });

        req.on('error', () => {
          // Silent error - just want to generate activity
        });

        req.end();
      }

      console.log(`[KeepAlive] Heartbeat: ${new Date().toISOString()}`);

    } catch (error) {
      console.log('[KeepAlive] Ping failed, services may need attention');
    }
  }

  private async performHealthCheck(): Promise<void> {
    this.status.lastCheck = new Date();
    let redisHealthy = false;
    let mongoHealthy = false;

    // Check Redis
    try {
      if (this.redisClient) {
        const pingResult = await this.redisClient.ping();
        redisHealthy = pingResult === 'PONG';
      }
    } catch (error) {
      // Try to reconnect if client is disconnected
      if (this.redisClient && this.redisProcess && !this.redisProcess.killed) {
        try {
          await this.redisClient.connect();
          const pingResult = await this.redisClient.ping();
          redisHealthy = pingResult === 'PONG';
        } catch (reconnectError) {
          console.log('[KeepAlive] Redis reconnection failed');
        }
      }
    }

    // Check MongoDB proxy
    try {
      const options = {
        hostname: 'localhost',
        port: 27018,
        path: '/health',
        method: 'GET',
        timeout: 3000
      };

      mongoHealthy = await new Promise<boolean>((resolve) => {
        const req = http.request(options, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(3000, () => resolve(false));
        req.end();
      });
    } catch (error) {
      mongoHealthy = false;
    }

    // Update status
    this.status.redis = redisHealthy;
    this.status.mongodb = mongoHealthy;

    console.log(`[KeepAlive] Health: Redis=${redisHealthy ? '✅' : '❌'}, MongoDB=${mongoHealthy ? '✅' : '❌'}`);

    // Restart unhealthy services
    if (!redisHealthy && this.redisProcess && !this.redisProcess.killed) {
      console.log('[KeepAlive] Restarting Redis due to health check failure');
      this.restartRedis();
    }

    if (!mongoHealthy && this.mongoProcess && !this.mongoProcess.killed) {
      console.log('[KeepAlive] Restarting MongoDB proxy due to health check failure');
      this.restartMongo();
    }
  }

  private async restartRedis(): Promise<void> {
    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
    }

    if (this.redisClient) {
      try {
        await this.redisClient.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }

    setTimeout(async () => {
      const redisPath = path.resolve('./production-redis');
      this.redisProcess = spawn(redisPath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.redisProcess.on('close', (code) => {
        console.log(`Redis process exited with code ${code}, restarting...`);
        this.status.redis = false;
        setTimeout(() => this.restartRedis(), 2000);
      });

      // Reconnect Redis client
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        this.redisClient = new Redis({
          host: '127.0.0.1',
          port: 6379,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          connectTimeout: 5000,
          lazyConnect: true
        });
        await this.redisClient.connect();
        this.status.redis = true;
        console.log('[KeepAlive] ✅ Redis restarted successfully');
      } catch (error) {
        console.log('[KeepAlive] Redis restart completed, client will retry connection');
      }
    }, 2000);
  }

  private restartMongo(): void {
    if (this.mongoProcess) {
      this.mongoProcess.kill('SIGTERM');
    }

    setTimeout(() => {
      const mongoPath = path.resolve('./mongo-proxy-server.js');
      this.mongoProcess = spawn('node', [mongoPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.mongoProcess.on('close', (code) => {
        console.log(`MongoDB proxy exited with code ${code}, restarting...`);
        this.status.mongodb = false;
        setTimeout(() => this.restartMongo(), 2000);
      });

      console.log('[KeepAlive] ✅ MongoDB proxy restarted successfully');
    }, 2000);
  }

  async stopServices(): Promise<void> {
    console.log('[KeepAlive] Stopping services...');
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
      } catch (e) {
        // Ignore disconnect errors
      }
    }

    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
    }

    if (this.mongoProcess) {
      this.mongoProcess.kill('SIGTERM');
    }

    console.log('[KeepAlive] ✅ Services stopped');
  }

  getStatus(): ServiceStatus {
    return { ...this.status };
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const keepAliveService = new KeepAliveService();