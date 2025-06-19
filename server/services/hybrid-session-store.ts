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

  constructor() {
    super();
    
    // Initialize PostgreSQL store as primary/fallback
    this.pgStore = new PgStore({ 
      pool,
      tableName: 'session'
    });

    // Initialize on-demand Redis service
    this.redisService = OnDemandRedisService.getInstance();
  }

  /**
   * Read-through cache: Try Redis first, fallback to PostgreSQL, then cache
   */
  async get(sid: string, callback: (err?: any, session?: any) => void): Promise<void> {
    try {
      // Try Redis cache first if available
      if (this.redisReady && this.redisClient) {
        try {
          const cached = await this.redisClient.get(`sess:${sid}`);
          if (cached) {
            const session = JSON.parse(cached);
            console.log(`🚀 HybridSessionStore: Cache HIT for session ${sid}`);
            return callback(null, session);
          }
        } catch (redisErr) {
          console.log('⚠️ HybridSessionStore: Redis read error, falling back to PostgreSQL');
        }
      }

      // Fallback to PostgreSQL
      this.pgStore.get(sid, async (err: any, session: any) => {
        if (err) return callback(err);
        
        // If session found and Redis available, cache it
        if (session && this.redisReady && this.redisClient) {
          try {
            const ttl = session.cookie?.maxAge ? Math.floor(session.cookie.maxAge / 1000) : 86400;
            await this.redisClient.setex(`sess:${sid}`, ttl, JSON.stringify(session));
            console.log(`📝 HybridSessionStore: Cached session ${sid} in Redis`);
          } catch (cacheErr) {
            console.log('⚠️ HybridSessionStore: Failed to cache session in Redis');
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

        // Cache in Redis if available
        if (this.redisReady && this.redisClient) {
          try {
            const ttl = session.cookie?.maxAge ? Math.floor(session.cookie.maxAge / 1000) : 86400;
            await this.redisClient.setex(`sess:${sid}`, ttl, JSON.stringify(session));
            console.log(`💾 HybridSessionStore: Session ${sid} saved to PostgreSQL and cached in Redis`);
          } catch (cacheErr) {
            console.log('⚠️ HybridSessionStore: Failed to cache session in Redis, PostgreSQL save successful');
          }
        } else {
          console.log(`💾 HybridSessionStore: Session ${sid} saved to PostgreSQL (Redis unavailable)`);
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
      // Remove from Redis cache if available
      if (this.redisReady && this.redisClient) {
        try {
          await this.redisClient.del(`sess:${sid}`);
          console.log(`🗑️ HybridSessionStore: Removed session ${sid} from Redis cache`);
        } catch (redisErr) {
          console.log('⚠️ HybridSessionStore: Failed to remove session from Redis cache');
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
      return new Promise((resolve, reject) => {
        this.pgStore.length((err: any, count: number) => {
          if (err) return reject(err);
          resolve({
            pgSessions: count,
            redisReady: this.redisReady,
          });
        });
      });
    } catch (error) {
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
      if (this.redisReady && this.redisClient) {
        try {
          const keys = await this.redisClient.keys('sess:*');
          if (keys.length > 0) {
            await this.redisClient.del(...keys);
            console.log(`🗑️ HybridSessionStore: Cleared ${keys.length} sessions from Redis cache`);
          }
        } catch (redisErr) {
          console.log('⚠️ HybridSessionStore: Failed to clear Redis cache');
        }
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