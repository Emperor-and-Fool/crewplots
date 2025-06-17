import { Store } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { RedisStore } from 'connect-redis';
import { onDemandRedis } from '../../adapters-repl/redis-ondemand/on-demand-service';
import { pool } from '../db';

const PgStore = connectPgSimple(Store);
// RedisStore imported directly

export class HybridSessionStore extends Store {
  private redisStore: any;
  private pgStore: any;
  private redisAvailable = false;

  constructor() {
    super();
    
    // Initialize PostgreSQL store as fallback
    this.pgStore = new PgStore({
      pool: pool,
      tableName: 'sessions',
      createTableIfMissing: true,
      ttl: 86400000 // 24 hours
    });

    // Try to initialize Redis store
    this.initializeRedisStore();
  }

  private async initializeRedisStore() {
    try {
      // Start Redis and get persistent connection for session store
      const redisClient = await onDemandRedis.createPersistentConnection('session-store');
      this.redisStore = new RedisStore({
        client: redisClient,
        ttl: 86400 // 24 hours in seconds
      });
      this.redisAvailable = true;
      console.log('[HybridSession] Redis store initialized as primary');
    } catch (error) {
      console.log('[HybridSession] Redis unavailable, using PostgreSQL only');
      this.redisAvailable = false;
    }
  }

  async get(sid: string, callback: (err?: any, session?: any) => void) {
    if (this.redisAvailable && this.redisStore) {
      try {
        return this.redisStore.get(sid, (err: any, session: any) => {
          if (err || !session) {
            // Fallback to PostgreSQL
            console.log('[HybridSession] Redis get failed, falling back to PostgreSQL');
            return this.pgStore.get(sid, callback);
          }
          callback(null, session);
        });
      } catch (error) {
        console.log('[HybridSession] Redis error, falling back to PostgreSQL');
        return this.pgStore.get(sid, callback);
      }
    } else {
      return this.pgStore.get(sid, callback);
    }
  }

  async set(sid: string, session: any, callback?: (err?: any) => void) {
    const cb = callback || (() => {});
    
    // Always save to PostgreSQL as backup
    this.pgStore.set(sid, session, (pgErr: any) => {
      if (pgErr) {
        console.error('[HybridSession] PostgreSQL save failed:', pgErr);
        return cb(pgErr);
      }

      // Try to save to Redis as primary
      if (this.redisAvailable && this.redisStore) {
        this.redisStore.set(sid, session, (redisErr: any) => {
          if (redisErr) {
            console.log('[HybridSession] Redis save failed, but PostgreSQL succeeded');
            this.redisAvailable = false;
          } else {
            console.log('[HybridSession] Session saved to both Redis and PostgreSQL');
          }
          cb(null); // Always succeed if PostgreSQL worked
        });
      } else {
        console.log('[HybridSession] Session saved to PostgreSQL only');
        cb(null);
      }
    });
  }

  async destroy(sid: string, callback?: (err?: any) => void) {
    const cb = callback || (() => {});
    
    // Remove from both stores
    const pgPromise = new Promise((resolve) => {
      this.pgStore.destroy(sid, (err: any) => {
        if (err) console.log('[HybridSession] PostgreSQL destroy error:', err);
        resolve(true);
      });
    });

    const redisPromise = new Promise((resolve) => {
      if (this.redisAvailable && this.redisStore) {
        this.redisStore.destroy(sid, (err: any) => {
          if (err) console.log('[HybridSession] Redis destroy error:', err);
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });

    try {
      await Promise.all([pgPromise, redisPromise]);
      cb(null);
    } catch (error) {
      cb(error);
    }
  }

  async touch(sid: string, session: any, callback?: (err?: any) => void) {
    const cb = callback || (() => {});
    
    if (this.redisAvailable && this.redisStore) {
      this.redisStore.touch(sid, session, (err: any) => {
        if (err) {
          console.log('[HybridSession] Redis touch failed, falling back to PostgreSQL');
          return this.pgStore.touch(sid, session, cb);
        }
        cb(null);
      });
    } else {
      this.pgStore.touch(sid, session, cb);
    }
  }

  getStatus() {
    return {
      redisAvailable: this.redisAvailable,
      pgStoreActive: !!this.pgStore,
      redisStoreActive: !!this.redisStore
    };
  }
}