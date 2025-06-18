import { spawn, ChildProcess } from 'child_process';
import Redis from 'ioredis';
import path from 'path';

/*
 * CRITICAL ARCHITECTURE RULE - NO FALLBACK FOR REDIS SESSIONS
 * 
 * This service implements a strict Redis-only session architecture:
 * - Redis: stores ALL session data, authentication state, and caching
 * - NO PostgreSQL fallback for sessions under any circumstances
 * 
 * FALLBACK PROHIBITION:
 * Creating any PostgreSQL fallback mechanism for sessions is STRICTLY FORBIDDEN
 * as it represents complete corruption of the system's architectural intent.
 * 
 * The system MUST fail explicitly when Redis is unavailable rather than
 * silently storing sessions in PostgreSQL, which would:
 * 1. Corrupt session integrity
 * 2. Create inconsistent authentication patterns
 * 3. Violate the pure Redis architecture principles
 * 4. Make session management unreliable and unpredictable
 * 
 * REQUIRED BEHAVIOR:
 * - Redis unavailable = System fails with clear error message
 * - Session store = Redis ONLY, never PostgreSQL
 * - No session data ever stored in PostgreSQL under any circumstances
 * - Authentication depends entirely on Redis session availability
 */

interface ServiceConnection<T> {
  client: T;
  cleanup: () => Promise<void>;
}

export class OnDemandRedisService {
  private static instance: OnDemandRedisService;
  private activeConnections = new Map<string, ServiceConnection<Redis>>();
  private redisProcess: ChildProcess | null = null;
  private isStarting = false;

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
    const { connectionId = 'default', keepAlive = 30000, skipInDocker = true } = options;

    // Skip Redis activation in Docker environments (docker-compose handles it)
    if (skipInDocker && process.env.DOCKER_ENV) {
      throw new Error('Redis service skipped - running in Docker environment');
    }

    // Check for existing connection
    const existingConnection = this.activeConnections.get(connectionId);
    if (existingConnection) {
      return await operation(existingConnection.client);
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
      }, 60000); // 1 minute for batch operations
      
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
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
      enableAutoPipelining: true
    });

    // Suppress connection error spam
    client.on('error', (error) => {
      if (error.message.includes('connect ECONNREFUSED')) {
        // Silently handle connection refused errors during startup
        return;
      }
      console.error('Redis client error:', error);
    });

    await client.connect();

    const connection: ServiceConnection<Redis> = {
      client,
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
      console.log('[OnDemand] Starting Redis server...');
      
      this.redisProcess = spawn('redis-server', [
        '--port', '6379',
        '--bind', '127.0.0.1',
        '--protected-mode', 'no',
        '--daemonize', 'no',
        '--save', '',
        '--dir', path.resolve('redis_data'),
        '--logfile', path.resolve('logs/redis/redis_ondemand.log'),
        '--maxmemory', '32mb',
        '--maxmemory-policy', 'allkeys-lru'
      ], {
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

  private async cleanupConnection(connectionId: string): Promise<void> {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    await connection.cleanup();
    this.activeConnections.delete(connectionId);
    console.log(`[OnDemand] Redis connection "${connectionId}" cleaned up`);

    // If no active connections, stop Redis server
    if (this.activeConnections.size === 0 && this.redisProcess) {
      console.log('[OnDemand] Stopping Redis server (no active connections)');
      this.redisProcess.kill('SIGTERM');
      this.redisProcess = null;
    }
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