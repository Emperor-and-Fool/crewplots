import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db';
import { OnDemandRedisService } from '../../adapters-repl/redis-ondemand/on-demand-service';

const PgStore = connectPgSimple(session);

/**
 * Hybrid Session Store - Uses Redis for performance with PostgreSQL fallback
 * Integrates with our on-demand Redis service for Replit compatibility
 */
export class HybridSessionStore extends session.Store {
  private pgStore: any;
  private redisService: OnDemandRedisService;
  private redisAvailable: boolean = false;
  private lastRedisCheck: number = 0;
  private readonly REDIS_CHECK_INTERVAL = 30000; // 30 seconds

  constructor() {
    super();
    
    // Initialize PostgreSQL store as primary/fallback
    this.pgStore = new PgStore({ 
      pool,
      tableName: 'session'
    });

    // Initialize on-demand Redis service
    this.redisService = OnDemandRedisService.getInstance();
    
    // Initial Redis availability check
    this.checkRedisAvailability();
  }

  private async checkRedisAvailability(): Promise<boolean> {
    const now = Date.now();
    
    // Skip check if recently performed
    if (now - this.lastRedisCheck < this.REDIS_CHECK_INTERVAL && this.lastRedisCheck > 0) {
      return this.redisAvailable;
    }
    
    this.lastRedisCheck = now;
    
    try {
      await this.redisService.withConnection(
        async (client) => {
          await client.ping();
          return true;
        },
        { connectionId: 'availability-check', keepAlive: 1000 }
      );
      
      if (!this.redisAvailable) {
        console.log('✅ HybridSessionStore: Redis is now available');
      }
      this.redisAvailable = true;
      return true;
    } catch (error) {
      if (this.redisAvailable) {
        console.log('⚠️ HybridSessionStore: Redis unavailable, switching to PostgreSQL-only mode');
      }
      this.redisAvailable = false;
      return false;
    }
  }

  /**
   * Read-through cache: Try Redis first, fallback to PostgreSQL, then cache
   */
  async get(sid: string, callback: (err?: any, session?: any) => void): Promise<void> {
    try {
      // Only attempt Redis if availability check passes
      if (await this.checkRedisAvailability()) {
        try {
          const result = await this.redisService.withConnection(
            async (client) => {
              const cached = await client.get(`sess:${sid}`);
              if (cached) {
                console.log(`🚀 HybridSessionStore: Cache HIT for session ${sid}`);
                return JSON.parse(cached);
              }
              return null;
            },
            { connectionId: 'session-store', keepAlive: 60000 }
          );
          
          if (result) {
            return callback(null, result);
          }
        } catch (redisErr) {
          console.log('⚠️ HybridSessionStore: Redis connection failed, marking unavailable');
          this.redisAvailable = false;
        }
      }

      // Fallback to PostgreSQL
      this.pgStore.get(sid, async (err: any, session: any) => {
        if (err) return callback(err);
        
        // If session found and Redis is available, cache it
        if (session && this.redisAvailable) {
          try {
            await this.redisService.withConnection(
              async (client) => {
                const ttl = session.cookie?.maxAge ? Math.floor(session.cookie.maxAge / 1000) : 86400;
                await client.setex(`sess:${sid}`, ttl, JSON.stringify(session));
                console.log(`📝 HybridSessionStore: Cached session ${sid} in Redis`);
              },
              { connectionId: 'session-store', keepAlive: 60000 }
            );
          } catch (cacheErr) {
            console.log('⚠️ HybridSessionStore: Failed to cache session in Redis');
            this.redisAvailable = false;
          }
        }

        callback(null, session);
      });
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Write-through: Save to PostgreSQL first, then cache in Redis
   */
  async set(sid: string, session: any, callback: (err?: any) => void): Promise<void> {
    try {
      // Save to PostgreSQL first (source of truth)
      this.pgStore.set(sid, session, async (err: any) => {
        if (err) return callback(err);

        // Cache in Redis only if available
        if (this.redisAvailable) {
          try {
            await this.redisService.withConnection(
              async (client) => {
                const ttl = session.cookie?.maxAge ? Math.floor(session.cookie.maxAge / 1000) : 86400;
                await client.setex(`sess:${sid}`, ttl, JSON.stringify(session));
                console.log(`💾 HybridSessionStore: Session ${sid} saved to PostgreSQL and cached in Redis`);
              },
              { connectionId: 'session-store', keepAlive: 60000 }
            );
          } catch (cacheErr) {
            console.log('⚠️ HybridSessionStore: Failed to cache session in Redis, PostgreSQL save successful');
            this.redisAvailable = false;
          }
        } else {
          console.log('💾 HybridSessionStore: Session saved to PostgreSQL only (Redis unavailable)');
        }

        callback();
      });
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Destroy session from both stores
   */
  async destroy(sid: string, callback: (err?: any) => void): Promise<void> {
    try {
      // Remove from Redis cache only if available
      if (this.redisAvailable) {
        try {
          await this.redisService.withConnection(
            async (client) => {
              await client.del(`sess:${sid}`);
              console.log(`🗑️ HybridSessionStore: Removed session ${sid} from Redis cache`);
            },
            { connectionId: 'session-store', keepAlive: 60000 }
          );
        } catch (redisErr) {
          console.log('⚠️ HybridSessionStore: Failed to remove session from Redis cache');
          this.redisAvailable = false;
        }
      }

      // Remove from PostgreSQL
      this.pgStore.destroy(sid, (err: any) => {
        if (err) return callback(err);
        console.log(`🗑️ HybridSessionStore: Session ${sid} destroyed from PostgreSQL`);
        callback();
      });
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Get session count and Redis status for monitoring
   */
  async getStatus(): Promise<{ pgSessions: number; redisReady: boolean; cacheHits?: number }> {
    try {
      // Get session count from PostgreSQL
      const sessionCount = await new Promise<number>((resolve, reject) => {
        // Use the all() method to get sessions and count them
        this.pgStore.all((err: any, sessions: any[]) => {
          if (err) return reject(err);
          resolve(sessions ? sessions.length : 0);
        });
      });

      // Test Redis availability
      try {
        await this.redisService.withConnection(
          async () => true,
          { connectionId: 'session-store-test', keepAlive: 5000 }
        );
        return { pgSessions: sessionCount, redisReady: true };
      } catch {
        return { pgSessions: sessionCount, redisReady: false };
      }
    } catch (error) {
      console.error('Session store status error:', error);
      return { pgSessions: 0, redisReady: false };
    }
  }

  /**
   * Clean up expired sessions from PostgreSQL
   */
  async touch(sid: string, session: any, callback: (err?: any) => void): Promise<void> {
    // Delegate to PostgreSQL store
    this.pgStore.touch(sid, session, callback);
  }

  /**
   * Get all session IDs
   */
  async all(callback: (err?: any, sessions?: any[]) => void): Promise<void> {
    // Delegate to PostgreSQL store for consistency
    this.pgStore.all(callback);
  }

  /**
   * Clear all sessions
   */
  async clear(callback: (err?: any) => void): Promise<void> {
    try {
      // Clear Redis cache if available
      try {
        await this.redisService.withConnection(
          async (client) => {
            const keys = await client.keys('sess:*');
            if (keys.length > 0) {
              await client.del(...keys);
              console.log(`🗑️ HybridSessionStore: Cleared ${keys.length} sessions from Redis cache`);
            }
          },
          { connectionId: 'session-store', keepAlive: 60000 }
        );
      } catch (redisErr) {
        console.log('⚠️ HybridSessionStore: Failed to clear Redis cache');
      }

      // Clear PostgreSQL
      this.pgStore.clear((err: any) => {
        if (err) return callback(err);
        console.log('🗑️ HybridSessionStore: All sessions cleared from PostgreSQL');
        callback();
      });
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Get session count
   */
  async length(callback: (err?: any, length?: number) => void): Promise<void> {
    // Delegate to PostgreSQL store as source of truth
    this.pgStore.length(callback);
  }
}

export const hybridSessionStore = new HybridSessionStore();