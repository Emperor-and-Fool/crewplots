import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db';
import { onDemandRedis } from '../../adapters-repl/redis-ondemand/on-demand-redis';
import type { Redis } from 'ioredis';

const PgStore = connectPgSimple(session);

/**
 * Hybrid Session Store - Coordinates PostgreSQL and Redis for session management
 * PostgreSQL: Source of truth for session persistence
 * Redis: Fast cache layer when available
 * Session-aware cache keys prevent cross-session data leakage
 */
export class HybridSessionStore extends session.Store {
  private pgStore: any;
  private redisAvailable: boolean = false;

  constructor() {
    super();
    this.pgStore = new PgStore({ 
      pool: pool,
      tableName: 'session'
    });
    console.log('[HybridSessionStore] Initialized with PostgreSQL backend and Redis cache layer');
  }

  /**
   * Get session: Redis cache → PostgreSQL fallback → Redis repopulation
   */
  get(sid: string, callback: (err?: any, session?: session.SessionData | null) => void): void {
    // Try Redis cache first
    this.getFromRedis(sid, (redisErr, redisSession) => {
      if (redisSession && !redisErr) {
        console.log(`[HybridSessionStore] Redis cache hit for session: ${sid.substring(0, 8)}...`);
        return callback(null, redisSession);
      }

      // Redis miss or error, try PostgreSQL
      this.pgStore.get(sid, (pgErr: any, pgSession: any) => {
        if (pgErr) {
          console.error(`[HybridSessionStore] PostgreSQL error for session: ${sid.substring(0, 8)}...`, pgErr.message);
          return callback(pgErr);
        }

        if (pgSession) {
          console.log(`[HybridSessionStore] PostgreSQL hit for session: ${sid.substring(0, 8)}...`);
          
          // Repopulate Redis cache asynchronously
          this.setInRedis(sid, pgSession).catch(err => 
            console.log(`[HybridSessionStore] Could not repopulate Redis cache for: ${sid.substring(0, 8)}...`)
          );
          
          return callback(null, pgSession);
        }

        console.log(`[HybridSessionStore] Session not found: ${sid.substring(0, 8)}...`);
        callback(null, null);
      });
    });
  }

  /**
   * Set session: PostgreSQL first → Redis cache update
   */
  set(sid: string, session: session.SessionData, callback?: (err?: any) => void): void {
    // Save to PostgreSQL first (source of truth)
    this.pgStore.set(sid, session, (pgErr: any) => {
      if (pgErr) {
        console.error(`[HybridSessionStore] PostgreSQL save failed for: ${sid.substring(0, 8)}...`, pgErr.message);
        return callback?.(pgErr);
      }

      console.log(`[HybridSessionStore] Session saved to PostgreSQL: ${sid.substring(0, 8)}...`);

      // Update Redis cache asynchronously
      this.setInRedis(sid, session)
        .then(() => {
          console.log(`[HybridSessionStore] Session cached in Redis: ${sid.substring(0, 8)}...`);
          callback?.(null);
        })
        .catch(() => {
          console.log(`[HybridSessionStore] Session saved to PostgreSQL only (Redis unavailable)`);
          callback?.(null); // Don't fail if Redis cache fails
        });
    });
  }

  /**
   * Destroy session: Remove from both stores
   */
  destroy(sid: string, callback?: (err?: any) => void): void {
    // Remove from Redis first
    this.deleteFromRedis(sid).catch(() => {});

    // Remove from PostgreSQL
    this.pgStore.destroy(sid, (pgErr: any) => {
      if (pgErr) {
        console.error(`[HybridSessionStore] PostgreSQL destroy failed for: ${sid.substring(0, 8)}...`, pgErr.message);
        return callback?.(pgErr);
      }

      console.log(`[HybridSessionStore] Session ${sid.substring(0, 8)}... destroyed from PostgreSQL`);
      callback?.(null);
    });
  }

  /**
   * Touch session: Update expiration in both stores
   */
  touch(sid: string, session: session.SessionData, callback?: (err?: any) => void): void {
    this.pgStore.touch(sid, session, (pgErr: any) => {
      if (pgErr) {
        return callback?.(pgErr);
      }

      // Update Redis TTL asynchronously
      this.touchInRedis(sid, session).catch(() => {});
      callback?.(null);
    });
  }

  /**
   * Get session from Redis cache
   */
  private getFromRedis(sid: string, callback: (err?: any, session?: session.SessionData | null) => void): void {
    onDemandRedis.withConnection(
      async (redis: Redis) => {
        const sessionData = await redis.get(`sess:${sid}`);
        if (sessionData) {
          return JSON.parse(sessionData);
        }
        return null;
      },
      { connectionId: 'session-pool-get', keepAlive: 30000, skipInDocker: false }
    )
    .then(result => callback(null, result))
    .catch(err => callback(err));
  }

  /**
   * Set session in Redis cache
   */
  private async setInRedis(sid: string, session: session.SessionData): Promise<void> {
    return onDemandRedis.withConnection(
      async (redis: Redis) => {
        const ttl = session.cookie?.maxAge ? Math.floor(session.cookie.maxAge / 1000) : 86400; // 24h default
        await redis.setex(`sess:${sid}`, ttl, JSON.stringify(session));
      },
      { connectionId: 'session-pool-set', keepAlive: 30000, skipInDocker: false }
    );
  }

  /**
   * Delete session from Redis cache
   */
  private async deleteFromRedis(sid: string): Promise<void> {
    return onDemandRedis.withConnection(
      async (redis: Redis) => {
        await redis.del(`sess:${sid}`);
      },
      { connectionId: 'session-pool-del', keepAlive: 5000, skipInDocker: false }
    );
  }

  /**
   * Touch session in Redis (update TTL)
   */
  private async touchInRedis(sid: string, session: session.SessionData): Promise<void> {
    return onDemandRedis.withConnection(
      async (redis: Redis) => {
        const ttl = session.cookie?.maxAge ? Math.floor(session.cookie.maxAge / 1000) : 86400;
        await redis.expire(`sess:${sid}`, ttl);
      },
      { connectionId: 'session-pool-touch', keepAlive: 5000, skipInDocker: false }
    );
  }
}

export const hybridSessionStore = new HybridSessionStore();