import Redis from 'ioredis';
import { spawn, ChildProcess } from 'child_process';

export class PersistentRedisService {
  private static instance: PersistentRedisService;
  private redisClient: Redis | null = null;
  private redisProcess: ChildProcess | null = null;
  private isStarting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  static getInstance(): PersistentRedisService {
    if (!PersistentRedisService.instance) {
      PersistentRedisService.instance = new PersistentRedisService();
    }
    return PersistentRedisService.instance;
  }

  async getClient(): Promise<Redis | null> {
    if (this.redisClient && this.redisClient.status === 'ready') {
      return this.redisClient;
    }

    if (this.isStarting) {
      // Wait for startup to complete
      while (this.isStarting && this.reconnectAttempts < this.maxReconnectAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      return this.redisClient?.status === 'ready' ? this.redisClient : null;
    }

    return await this.initializeConnection();
  }

  private async initializeConnection(): Promise<Redis | null> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[PersistentRedis] Max reconnection attempts reached, giving up');
      return null;
    }

    this.isStarting = true;
    this.reconnectAttempts++;

    try {
      // Ensure Redis server is running
      await this.ensureRedisServer();

      // Create persistent client with aggressive reconnection settings
      this.redisClient = new Redis({
        host: '127.0.0.1',
        port: 6379,
        enableReadyCheck: false,
        maxRetriesPerRequest: 1, // Fail fast instead of hanging
        connectTimeout: 10000,
        lazyConnect: false,
        enableAutoPipelining: false, // Disable to reduce connection complexity
        retryDelayOnFailover: 1000,
        retryDelayOnClusterDown: 1000,
        maxRetriesPerRequest: 1,
        // Aggressive keep-alive settings
        keepAlive: 30000,
        family: 4 // Force IPv4
      });

      // Set up event handlers
      this.redisClient.on('connect', () => {
        console.log('[PersistentRedis] Connected to Redis');
        this.reconnectAttempts = 0; // Reset on successful connection
      });

      this.redisClient.on('ready', () => {
        console.log('[PersistentRedis] Redis client ready');
      });

      this.redisClient.on('error', (error) => {
        console.log(`[PersistentRedis] Redis error: ${error.message}`);
        // Don't immediately reconnect on error - let the client handle it
      });

      this.redisClient.on('close', () => {
        console.log('[PersistentRedis] Redis connection closed');
      });

      this.redisClient.on('reconnecting', () => {
        console.log('[PersistentRedis] Redis reconnecting...');
      });

      // Wait for connection to be ready
      await this.redisClient.ping();
      console.log('[PersistentRedis] Connection established and tested');
      
      return this.redisClient;

    } catch (error) {
      console.log(`[PersistentRedis] Connection failed (attempt ${this.reconnectAttempts}):`, error.message);
      this.redisClient = null;
      return null;
    } finally {
      this.isStarting = false;
    }
  }

  private async ensureRedisServer(): Promise<void> {
    if (this.redisProcess && !this.redisProcess.killed) {
      return; // Already running
    }

    console.log('[PersistentRedis] Starting Redis server...');
    
    this.redisProcess = spawn('./repl-redis/production-redis', [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    this.redisProcess.on('close', (code) => {
      console.log(`[PersistentRedis] Redis server exited with code ${code}`);
      this.redisProcess = null;
    });

    this.redisProcess.on('error', (error) => {
      console.error('[PersistentRedis] Redis server error:', error);
      this.redisProcess = null;
    });

    // Wait for Redis to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async executeOperation<T>(operation: (client: Redis) => Promise<T>): Promise<T | null> {
    const client = await this.getClient();
    
    if (!client) {
      console.log('[PersistentRedis] No Redis client available, operation skipped');
      return null;
    }

    try {
      return await operation(client);
    } catch (error) {
      console.log(`[PersistentRedis] Operation failed: ${error.message}`);
      
      // If connection was reset, try once more with fresh connection
      if (error.message.includes('ECONNRESET') || error.message.includes('ECONNREFUSED')) {
        console.log('[PersistentRedis] Connection reset detected, attempting fresh connection');
        this.redisClient = null;
        
        const freshClient = await this.getClient();
        if (freshClient) {
          try {
            return await operation(freshClient);
          } catch (retryError) {
            console.log(`[PersistentRedis] Retry also failed: ${retryError.message}`);
            return null;
          }
        }
      }
      
      return null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.disconnect();
      this.redisClient = null;
    }
    
    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
      this.redisProcess = null;
    }
  }
}

export const persistentRedis = PersistentRedisService.getInstance();