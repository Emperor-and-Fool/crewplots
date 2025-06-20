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
  private readonly MAX_CONNECTIONS = 32; // Increased limit for normal application usage
  private readonly PREWARMED_CONNECTIONS = 4; // Number of connections to keep warm
  private prewarmedConnections: string[] = ['prewarmed-1', 'prewarmed-2', 'prewarmed-3', 'prewarmed-4'];
  private isPrewarming = false;
  private autoRestartEnabled = true; // Flag to control automatic Redis restart
  
  // Connection monitoring
  private connectionAttempts = 0;
  private successfulConnections = 0;
  private failedConnections = 0;
  private connectionHistory: Array<{timestamp: number, connectionId: string, status: 'attempt' | 'success' | 'failed', activeCount: number}> = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  static getInstance(): OnDemandRedisService {
    if (!OnDemandRedisService.instance) {
      OnDemandRedisService.instance = new OnDemandRedisService();
      // Initialize prewarming after first Redis operation
      setTimeout(async () => {
        try {
          await OnDemandRedisService.instance.prewarmConnections();
        } catch (error) {
          console.log('[OnDemand] Initial prewarming failed:', error);
        }
      }, 2000); // Wait 2 seconds after service creation
    }
    return OnDemandRedisService.instance;
  }

  private logConnectionEvent(connectionId: string, status: 'attempt' | 'success' | 'failed') {
    this.connectionHistory.push({
      timestamp: Date.now(),
      connectionId,
      status,
      activeCount: this.activeConnections.size
    });
    
    // Keep only last 50 events
    if (this.connectionHistory.length > 50) {
      this.connectionHistory = this.connectionHistory.slice(-50);
    }
  }

  getConnectionStats() {
    return {
      attempts: this.connectionAttempts,
      successful: this.successfulConnections,
      failed: this.failedConnections,
      currentActive: this.activeConnections.size,
      maxAllowed: this.MAX_CONNECTIONS,
      recentHistory: this.connectionHistory.slice(-10)
    };
  }

  async withConnection<T>(
    operation: (client: Redis) => Promise<T>,
    options: { 
      connectionId?: string; 
      keepAlive?: number; // milliseconds to keep connection alive after operation
      skipInDocker?: boolean; // skip Redis activation if running in Docker
    } = {}
  ): Promise<T> {
    const { connectionId = 'default', keepAlive = 540000, skipInDocker = true } = options; // 9 minutes default

    // Skip Redis activation in Docker environments (docker-compose handles it)
    if (skipInDocker && process.env.DOCKER_ENV) {
      throw new Error('Redis service skipped - running in Docker environment');
    }

    // Check for existing connection
    const existingConnection = this.activeConnections.get(connectionId);
    if (existingConnection) {
      console.log(`[OnDemand] 🔄 REUSE DEBUG: Attempting to reuse connection "${connectionId}"`);
      console.log(`[OnDemand] 🔄 REUSE DEBUG: Connection age: ${Date.now() - existingConnection.lastUsed}ms, inUse: ${existingConnection.isInUse}`);
      
      existingConnection.lastUsed = Date.now();
      existingConnection.isInUse = true;
      
      try {
        // Test connection health before reuse
        console.log(`[OnDemand] 🔄 REUSE DEBUG: Testing connection health for "${connectionId}"`);
        const healthStart = Date.now();
        await existingConnection.client.ping();
        const healthTime = Date.now() - healthStart;
        console.log(`[OnDemand] 🔄 REUSE DEBUG: Health check passed for "${connectionId}" in ${healthTime}ms`);
        
        const opStart = Date.now();
        const result = await operation(existingConnection.client);
        const opTime = Date.now() - opStart;
        console.log(`[OnDemand] 🔄 REUSE DEBUG: Operation completed for "${connectionId}" in ${opTime}ms`);
        
        existingConnection.isInUse = false;
        return result;
      } catch (error) {
        console.log(`[OnDemand] 🚨 REUSE ERROR: Connection "${connectionId}" failed - ${error.message}`);
        existingConnection.isInUse = false;
        throw error;
      }
    }

    // Log connection attempt
    this.connectionAttempts++;
    this.logConnectionEvent(connectionId, 'attempt');
    console.log(`[OnDemand] Connection attempt #${this.connectionAttempts} for "${connectionId}" (${this.activeConnections.size}/${this.MAX_CONNECTIONS} active)`);

    // Enforce connection limit to prevent overwhelming Redis binary
    if (this.activeConnections.size >= this.MAX_CONNECTIONS) {
      this.failedConnections++;
      this.logConnectionEvent(connectionId, 'failed');
      throw new Error(`Redis connection limit reached (${this.MAX_CONNECTIONS}). Custom Redis binary cannot handle more connections.`);
    }

    // Start Redis and create connection
    const connection = await this.createConnection(connectionId);
    this.successfulConnections++;
    this.logConnectionEvent(connectionId, 'success');
    
    try {
      console.log(`[OnDemand] 🆕 NEW CONNECTION: Starting operation for "${connectionId}"`);
      const opStart = Date.now();
      const result = await operation(connection.client);
      const opTime = Date.now() - opStart;
      console.log(`[OnDemand] 🆕 NEW CONNECTION: Operation completed for "${connectionId}" in ${opTime}ms`);
      
      // Schedule cleanup after keepAlive period - but respect critical connections
      const isCritical = this.prewarmedConnections.includes(connectionId) || 
                        connectionId.includes('session-') || 
                        connectionId.includes('notes-') || 
                        connectionId.includes('cache-');
      
      if (isCritical) {
        console.log(`[OnDemand] 🛡️ CRITICAL CONNECTION: Skipping cleanup scheduling for "${connectionId}"`);
      } else {
        console.log(`[OnDemand] ⏰ CLEANUP SCHEDULED: Connection "${connectionId}" cleanup in ${keepAlive}ms`);
        setTimeout(async () => {
          console.log(`[OnDemand] ⏰ CLEANUP TRIGGERED: Attempting cleanup for "${connectionId}"`);
          await this.smartCleanup(connectionId);
        }, keepAlive);
      }
      
      return result;
    } catch (error) {
      console.log(`[OnDemand] 🚨 NEW CONNECTION ERROR: Operation failed for "${connectionId}" - ${error.message}`);
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
      }, 540000); // 9 minutes for batch operations
      
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

    // Check if auto-restart is disabled
    if (!this.autoRestartEnabled) {
      throw new Error('Redis server is not running and auto-restart is disabled');
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
    if (!connection) {
      console.log(`[OnDemand] 🧹 CLEANUP DEBUG: Connection "${connectionId}" not found in active connections`);
      return;
    }

    console.log(`[OnDemand] 🧹 CLEANUP DEBUG: Attempting cleanup for "${connectionId}" (inUse: ${connection.isInUse}, age: ${Date.now() - connection.lastUsed}ms)`);

    // Don't cleanup prewarmed connections
    if (this.prewarmedConnections.includes(connectionId)) {
      console.log(`[OnDemand] 🧹 CLEANUP DEBUG: Skipping cleanup for prewarmed connection "${connectionId}"`);
      return;
    }

    // Don't cleanup session-related connections during testing phase
    if (connectionId.includes('session-') || connectionId.includes('notes-') || connectionId.includes('cache-')) {
      console.log(`[OnDemand] 🧹 CLEANUP DEBUG: Skipping cleanup for critical connection "${connectionId}"`);
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

  /**
   * Pre-warm Redis connections for immediate availability
   */
  async prewarmConnections(): Promise<void> {
    if (this.isPrewarming) return;
    this.isPrewarming = true;

    console.log(`[OnDemand] Pre-warming ${this.PREWARMED_CONNECTIONS} Redis connections...`);
    
    try {
      await this.ensureRedisServer();
      
      const prewarmPromises = this.prewarmedConnections.map(async (connectionId) => {
        try {
          const connection = await this.createConnection(connectionId);
          // Test connection with simple ping
          await connection.client.ping();
          console.log(`[OnDemand] Pre-warmed connection: ${connectionId}`);
        } catch (error) {
          console.log(`[OnDemand] Failed to pre-warm connection ${connectionId}:`, error);
        }
      });
      
      await Promise.all(prewarmPromises);
      console.log(`[OnDemand] Pre-warming complete. Active connections: ${this.activeConnections.size}`);
      
      // Start health monitoring
      this.startHealthMonitoring();
      
    } catch (error) {
      console.error('[OnDemand] Pre-warming failed:', error);
    } finally {
      this.isPrewarming = false;
    }
  }

  /**
   * Start health monitoring for connections
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) return;
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 60000); // Check every minute
    
    console.log('[OnDemand] Health monitoring started');
  }

  /**
   * Perform health check on all connections
   */
  private async performHealthCheck(): Promise<void> {
    const healthPromises = Array.from(this.activeConnections.entries()).map(async ([connectionId, connection]) => {
      try {
        if (!connection.isInUse) {
          await connection.client.ping();
          connection.lastUsed = Date.now(); // Update last used time
        }
      } catch (error) {
        console.log(`[OnDemand] Health check failed for ${connectionId}, removing connection`);
        await this.cleanupConnection(connectionId);
      }
    });
    
    await Promise.allSettled(healthPromises);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('[OnDemand] Health monitoring stopped');
    }
  }

  async shutdown(): Promise<void> {
    console.log('[OnDemand] Shutting down Redis service...');
    
    // Stop health monitoring
    this.stopHealthMonitoring();
    
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

  /**
   * Disable automatic Redis restart for fallback testing
   */
  disableAutoRestart(): void {
    this.autoRestartEnabled = false;
    console.log('[OnDemand] Auto-restart disabled - Redis will not restart if stopped');
  }

  /**
   * Enable automatic Redis restart (default behavior)
   */
  enableAutoRestart(): void {
    this.autoRestartEnabled = true;
    console.log('[OnDemand] Auto-restart enabled - Redis will restart automatically');
  }

  getStatus(): { 
    activeConnections: number; 
    serverRunning: boolean; 
    dockerMode: boolean;
    autoRestartEnabled: boolean;
  } {
    return {
      activeConnections: this.activeConnections.size,
      serverRunning: this.redisProcess !== null && !this.redisProcess.killed,
      dockerMode: !!process.env.DOCKER_ENV,
      autoRestartEnabled: this.autoRestartEnabled
    };
  }
}

// Export singleton instance
export const onDemandRedis = OnDemandRedisService.getInstance();