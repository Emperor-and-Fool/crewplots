import { onDemandRedis } from '../../adapters-repl/redis-ondemand/on-demand-service';
import { db } from '../db';
import { hybridCache } from '@shared/schema';
import { eq, lt } from 'drizzle-orm';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  category?: string;
  connectionId?: string;
  skipInDocker?: boolean;
}

export class HybridCacheService {
  constructor() {
    console.log('[HybridCache] Service initialized with on-demand Redis adapter');
  }

  /**
   * Get value from cache - Redis first, PostgreSQL fallback
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { connectionId = 'cache-read', skipInDocker = false } = options;

    try {
      // Try Redis first with on-demand service
      const redisValue = await onDemandRedis.withConnection(
        async (redis) => {
          const value = await redis.get(key);
          return value ? JSON.parse(value) : null;
        },
        { connectionId, keepAlive: 10000, skipInDocker }
      );

      if (redisValue !== null) {
        console.log(`[HybridCache] Redis hit for key: ${key}`);
        return redisValue;
      }

      console.log(`[HybridCache] Redis miss for key: ${key}, checking PostgreSQL`);
    } catch (error) {
      console.log(`[HybridCache] Redis unavailable for key: ${key}, using PostgreSQL only`);
    }

    // PostgreSQL fallback
    try {
      const [pgResult] = await db
        .select()
        .from(hybridCache)
        .where(eq(hybridCache.key, key))
        .limit(1);

      if (pgResult) {
        console.log(`[HybridCache] PostgreSQL hit for key: ${key}`);
        
        // Check if expired
        if (pgResult.expiresAt && pgResult.expiresAt < new Date()) {
          console.log(`[HybridCache] PostgreSQL entry expired for key: ${key}, cleaning up`);
          await this.delete(key);
          return null;
        }

        // Update Redis cache if available
        try {
          await onDemandRedis.withConnection(
            async (redis) => {
              const ttl = pgResult.expiresAt ? 
                Math.max(0, Math.floor((pgResult.expiresAt.getTime() - Date.now()) / 1000)) : 
                3600; // 1 hour default
              
              if (ttl > 0) {
                await redis.setex(key, ttl, JSON.stringify(pgResult.value));
                console.log(`[HybridCache] Restored to Redis: ${key} (TTL: ${ttl}s)`);
              }
            },
            { connectionId: 'cache-restore', keepAlive: 5000, skipInDocker }
          );
        } catch (error) {
          console.log(`[HybridCache] Could not restore to Redis: ${key}`);
        }

        return pgResult.value as T;
      }

      console.log(`[HybridCache] Complete miss for key: ${key}`);
      return null;
    } catch (error) {
      console.error(`[HybridCache] PostgreSQL error for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Set value in cache - Both Redis and PostgreSQL
   */
  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const { 
      ttl = 3600, 
      category = 'general', 
      connectionId = 'cache-write',
      skipInDocker = false 
    } = options;

    const expiresAt = ttl > 0 ? new Date(Date.now() + ttl * 1000) : null;
    const serializedValue = JSON.stringify(value);
    const size = Buffer.byteLength(serializedValue, 'utf8');

    let redisSuccess = false;
    let pgSuccess = false;

    // Try Redis first
    try {
      await onDemandRedis.withConnection(
        async (redis) => {
          if (ttl > 0) {
            await redis.setex(key, ttl, serializedValue);
          } else {
            await redis.set(key, serializedValue);
          }
          console.log(`[HybridCache] Redis set: ${key} (TTL: ${ttl}s, Size: ${size}B)`);
          redisSuccess = true;
        },
        { connectionId, keepAlive: 10000, skipInDocker }
      );
    } catch (error) {
      console.log(`[HybridCache] Redis set failed for key: ${key}`, error instanceof Error ? error.message : error);
    }

    // Always write to PostgreSQL (source of truth)
    try {
      await db
        .insert(hybridCache)
        .values({
          key,
          value: value as any,
          category,
          size,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: hybridCache.key,
          set: {
            value: value as any,
            category,
            size,
            expiresAt,
            updatedAt: new Date(),
          },
        });

      console.log(`[HybridCache] PostgreSQL set: ${key} (Category: ${category}, Size: ${size}B)`);
      pgSuccess = true;
    } catch (error) {
      console.error(`[HybridCache] PostgreSQL set failed for key: ${key}`, error);
    }

    return pgSuccess; // PostgreSQL is source of truth
  }

  /**
   * Delete key from both Redis and PostgreSQL
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const { connectionId = 'cache-delete', skipInDocker = false } = options;

    let redisSuccess = false;
    let pgSuccess = false;

    // Try Redis deletion
    try {
      await onDemandRedis.withConnection(
        async (redis) => {
          const result = await redis.del(key);
          redisSuccess = result > 0;
          console.log(`[HybridCache] Redis delete: ${key} (${redisSuccess ? 'success' : 'not found'})`);
        },
        { connectionId, keepAlive: 5000, skipInDocker }
      );
    } catch (error) {
      console.log(`[HybridCache] Redis delete failed for key: ${key}`);
    }

    // PostgreSQL deletion
    try {
      const result = await db
        .delete(hybridCache)
        .where(eq(hybridCache.key, key));

      pgSuccess = (result.rowCount || 0) > 0;
      console.log(`[HybridCache] PostgreSQL delete: ${key} (${pgSuccess ? 'success' : 'not found'})`);
    } catch (error) {
      console.error(`[HybridCache] PostgreSQL delete failed for key: ${key}`, error);
    }

    return pgSuccess;
  }

  /**
   * Test connections to both Redis and PostgreSQL
   */
  async testConnections(): Promise<{
    redis: boolean;
    postgresql: boolean;
    overall: boolean;
  }> {
    let redisOk = false;
    let pgOk = false;

    // Test Redis
    try {
      await onDemandRedis.withConnection(
        async (redis) => {
          const result = await redis.ping();
          redisOk = result === 'PONG';
        },
        { connectionId: 'test-connection', keepAlive: 1000, skipInDocker: false }
      );
    } catch (error) {
      console.log('[HybridCache] Redis test failed:', error instanceof Error ? error.message : error);
    }

    // Test PostgreSQL
    try {
      const result = await db.select().from(hybridCache).limit(1);
      pgOk = true;
    } catch (error) {
      console.error('[HybridCache] PostgreSQL test failed:', error);
    }

    return {
      redis: redisOk,
      postgresql: pgOk,
      overall: pgOk // PostgreSQL is required, Redis is optional
    };
  }

  /**
   * Clean expired cache entries from PostgreSQL
   */
  async cleanExpired(): Promise<number> {
    try {
      const result = await db
        .delete(hybridCache)
        .where(lt(hybridCache.expiresAt, new Date()));

      const deletedCount = result.rowCount || 0;
      console.log(`[HybridCache] Cleaned ${deletedCount} expired entries from PostgreSQL`);
      return deletedCount;
    } catch (error) {
      console.error(`[HybridCache] Failed to clean expired entries`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    entriesByCategory: Record<string, number>;
    totalSize: number;
    expiredEntries: number;
  }> {
    try {
      // Get total entries
      const totalEntries = await db.select().from(hybridCache);
      
      // Get categories count
      const categories: Record<string, number> = {};
      totalEntries.forEach(entry => {
        categories[entry.category] = (categories[entry.category] || 0) + 1;
      });

      // Calculate total size
      const totalSize = totalEntries.reduce((sum, entry) => sum + (entry.size || 0), 0);

      // Count expired entries
      const now = new Date();
      const expiredEntries = totalEntries.filter(entry => 
        entry.expiresAt && entry.expiresAt < now
      ).length;

      return {
        totalEntries: totalEntries.length,
        entriesByCategory: categories,
        totalSize,
        expiredEntries,
      };
    } catch (error) {
      console.error(`[HybridCache] Stats retrieval failed`, error);
      return {
        totalEntries: 0,
        entriesByCategory: {},
        totalSize: 0,
        expiredEntries: 0,
      };
    }
  }

  /**
   * Get Redis service status
   */
  getRedisStatus() {
    return onDemandRedis.getStatus();
  }

  /**
   * Shutdown the cache service
   */
  async shutdown(): Promise<void> {
    console.log('[HybridCache] Shutting down...');
    await onDemandRedis.shutdown();
  }
}

// Export singleton instance
export const hybridCacheService = new HybridCacheService();