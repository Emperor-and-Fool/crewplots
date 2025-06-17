import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import net from 'net';
import Redis from 'ioredis';

export class RedisConnection {
  private redisProcess: ChildProcess | null = null;
  private proxyServer: net.Server | null = null;
  private client: Redis | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      console.log('Starting Mini Redis server (jemalloc-free)...');
      
      // Start mini-redis process
      await this.startMiniRedis();
      
      // Start TCP proxy
      await this.startTcpProxy();
      
      // Create Redis client
      this.client = new Redis({
        host: '127.0.0.1',
        port: 6380,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        connectTimeout: 10000
      });

      await this.client.connect();
      
      this.isConnected = true;
      console.log('✅ Redis connection established successfully');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  private async startMiniRedis(): Promise<void> {
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
        // Strip ANSI escape codes and check for ready message
        const cleanOutput = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
        if (cleanOutput.includes('Ready to accept connections') && !hasStarted) {
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
        this.isConnected = false;
      });

      // Timeout if Redis doesn't start within 10 seconds
      setTimeout(() => {
        if (!hasStarted) {
          reject(new Error('Mini Redis startup timeout after 10 seconds'));
        }
      }, 10000);
    });
  }

  private async startTcpProxy(): Promise<void> {
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

  getClient(): Redis | null {
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    console.log('Disconnecting from Redis...');
    
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }

    if (this.proxyServer) {
      this.proxyServer.close();
      this.proxyServer = null;
    }

    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
      this.redisProcess = null;
    }

    this.isConnected = false;
    console.log('Redis disconnected');
  }

  isConnectionActive(): boolean {
    return this.isConnected && this.client !== null;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

// Global instance - following the MongoDB pattern
export const redisConnection = new RedisConnection();