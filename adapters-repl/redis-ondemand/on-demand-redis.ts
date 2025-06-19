import { spawn, ChildProcess } from 'child_process';
import Redis from 'ioredis';
import path from 'path';

interface ServiceConnection<T> {
  client: T;
  cleanup: () => Promise<void>;
  lastUsed: number;
  isInUse: boolean;
}

export class OnDemandRedisService {
  private static instance: OnDemandRedisService;
  private activeConnections = new Map<string, ServiceConnection<Redis>>();
  private redisProcess: ChildProcess | null = null;
  private isStarting = false;
  private connectionPool: Redis | null = null;
  private readonly MAX_CONNECTIONS = 3; // Limit connections to prevent overwhelming Redis binary

  static getInstance(): OnDemandRedisService {
    if (!OnDemandRedisService.instance) {
      OnDemandRedisService.instance = new OnDemandRedisService();
    }
    return OnDemandRedisService.instance;
  }

  async withConnection<T>(
    operation: (client: Redis) => Promise<T>,
    options: { 
      connectionId?: string; 
      keepAlive?: number; // milliseconds to keep connection alive after operation
      skipInDocker?: boolean; // skip Redis activation if running in Docker
    } = {}
  ): Promise<T> {
    const { connectionId = 'default', keepAlive = 300000, skipInDocker = true } = options; // 5 minutes default

    // Skip Redis activation in Docker environments (docker-compose handles it)
    if (skipInDocker && process.env.DOCKER_ENV) {
      throw new Error('Redis service skipped - running in Docker environment');
    }

    // Check for existing connection
    const existingConnection = this.activeConnections.get(connectionId);
    if (existingConnection) {
      existingConnection.lastUsed = Date.now();
      existingConnection.isInUse = true;
      try {
        const result = await operation(existingConnection.client);
        existingConnection.isInUse = false;
        return result;
      } catch (error) {
        existingConnection.isInUse = false;
        throw error;
      }
    }

    // Enforce connection limit to prevent overwhelming Redis binary
    if (this.activeConnections.size >= this.MAX_CONNECTIONS) {
      throw new Error(`Redis connection limit reached (${this.MAX_CONNECTIONS}). Custom Redis binary cannot handle more connections.`);
    }

    // Start Redis and create connection
    const connection = await this.createConnection(connectionId);
    
    try {
      const result = await operation(connection.client);
      
      // Schedule cleanup after keepAlive period
      setTimeout(async () => {
        await this.cleanupConnection(connectionId);
      }, keepAlive);
      
      return result;
    } catch (error) {
      // Immediate cleanup on error
      await this.cleanupConnection(connectionId);
      throw error;
    }
  }

  async withBatch<T>(
    operations: Array<(client: Redis) => Promise<T>>,
    options: { connectionId?: string; skipInDocker?: boolean } = {}
  ): Promise<T[]> {
    const { connectionId = 'batch', skipInDocker = true } = options;

    if (skipInDocker && process.env.DOCKER_ENV) {
      throw new Error('Redis service skipped - running in Docker environment');
    }

    const connection = await this.createConnection(connectionId);
    
    try {
      const results = await Promise.all(
        operations.map(op => op(connection.client))
      );
      
      // Keep connection alive for potential follow-up operations
      setTimeout(async () => {
        await this.cleanupConnection(connectionId);
      }, 600000); // 10 minutes for batch operations
      
      return results;
    } catch (error) {
      await this.cleanupConnection(connectionId);
      throw error;
    }
  }

  private async createConnection(connectionId: string): Promise<ServiceConnection<Redis>> {
    // Ensure Redis server is running
    await this.ensureRedisServer();

    // Create Redis client
    const client = new Redis({
      host: '127.0.0.1',
      port: 6379,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
      enableAutoPipelining: true
    });

    await client.connect();

    const connection: ServiceConnection<Redis> = {
      client,
      lastUsed: Date.now(),
      isInUse: false,
      cleanup: async () => {
        try {
          await client.disconnect();
        } catch (error) {
          console.log('Redis client disconnect error (ignored):', error);
        }
      }
    };

    this.activeConnections.set(connectionId, connection);
    console.log(`[OnDemand] Redis connection "${connectionId}" established`);
    
    return connection;
  }

  private async ensureRedisServer(): Promise<void> {
    if (this.redisProcess && !this.redisProcess.killed) {
      return; // Already running
    }

    if (this.isStarting) {
      // Wait for ongoing startup
      while (this.isStarting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isStarting = true;
    
    try {
      console.log('[OnDemand] Starting Redis server with config file...');
      
      this.redisProcess = spawn('./repl-redis/production-redis', [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.redisProcess.on('close', (code) => {
        console.log(`[OnDemand] Redis server exited with code ${code}`);
        this.redisProcess = null;
      });

      this.redisProcess.on('error', (error) => {
        console.error('[OnDemand] Redis server error:', error);
        this.redisProcess = null;
        this.isStarting = false;
      });

      // Wait for Redis to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test connection
      const testClient = new Redis({
        host: '127.0.0.1',
        port: 6379,
        connectTimeout: 2000,
        lazyConnect: true
      });

      await testClient.connect();
      const pingResult = await testClient.ping();
      await testClient.disconnect();

      if (pingResult !== 'PONG') {
        throw new Error('Redis server not responding correctly');
      }

      console.log('[OnDemand] ✅ Redis server ready');
    } finally {
      this.isStarting = false;
    }
  }

  private async smartCleanup(connectionId: string): Promise<void> {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    // Don't cleanup if connection is currently in use
    if (connection.isInUse) {
      console.log(`[OnDemand] Delaying cleanup for active connection "${connectionId}"`);
      // Reschedule cleanup in 30 seconds
      setTimeout(async () => {
        await this.smartCleanup(connectionId);
      }, 30000);
      return;
    }

    // Don't cleanup if connection was used recently (within 60 seconds)
    const timeSinceLastUse = Date.now() - connection.lastUsed;
    if (timeSinceLastUse < 60000) {
      console.log(`[OnDemand] Delaying cleanup for recently used connection "${connectionId}"`);
      // Reschedule cleanup for remaining time + buffer
      setTimeout(async () => {
        await this.smartCleanup(connectionId);
      }, 60000 - timeSinceLastUse + 10000);
      return;
    }

    // Safe to cleanup
    await this.cleanupConnection(connectionId);
  }

  private async cleanupConnection(connectionId: string): Promise<void> {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    // Don't cleanup session-related connections during testing phase
    if (connectionId.includes('session-') || connectionId.includes('notes-') || connectionId.includes('cache-')) {
      console.log(`[OnDemand] Skipping cleanup for critical connection "${connectionId}"`);
      return;
    }

    await connection.cleanup();
    this.activeConnections.delete(connectionId);
    console.log(`[OnDemand] Redis connection "${connectionId}" cleaned up`);

    // Never stop Redis server during active testing
    // if (this.activeConnections.size === 0 && this.redisProcess) {
    //   console.log('[OnDemand] Stopping Redis server (no active connections)');
    //   this.redisProcess.kill('SIGTERM');
    //   this.redisProcess = null;
    // }
  }

  async shutdown(): Promise<void> {
    console.log('[OnDemand] Shutting down Redis service...');
    
    // Cleanup all connections
    const cleanupPromises = Array.from(this.activeConnections.keys()).map(
      connectionId => this.cleanupConnection(connectionId)
    );
    await Promise.all(cleanupPromises);

    // Stop Redis server
    if (this.redisProcess) {
      this.redisProcess.kill('SIGTERM');
      this.redisProcess = null;
    }
  }

  getStatus(): { 
    activeConnections: number; 
    serverRunning: boolean; 
    dockerMode: boolean;
  } {
    return {
      activeConnections: this.activeConnections.size,
      serverRunning: this.redisProcess !== null && !this.redisProcess.killed,
      dockerMode: !!process.env.DOCKER_ENV
    };
  }
}

// Export singleton instance
export const onDemandRedis = OnDemandRedisService.getInstance();