import { onDemandRedis } from '../../adapters-repl/redis-ondemand/on-demand-service';
import { db } from '../db';
import { hybridCache } from '@shared/schema';
import { eq, lt, and } from 'drizzle-orm';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  category?: string;
  connectionId?: string;
  skipInDocker?: boolean;
  forceRefresh?: boolean;
}

/**
 * HybridCacheService implements read-through/write-through cache pattern
 * - PostgreSQL = Durable cache store (source of truth)
 * - Redis = Fast cache layer (when available)
 * - Graceful degradation when Redis unavailable
 */
export class HybridCacheService {
  private static instance: HybridCacheService;

  static getInstance(): HybridCacheService {
    if (!HybridCacheService.instance) {
      HybridCacheService.instance = new HybridCacheService();
    }
    return HybridCacheService.instance;
  }

  /**
   * Read-through cache: Redis first, PostgreSQL fallback
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { connectionId = 'cache', skipInDocker = true, forceRefresh = false } = options;

    try {
      // Try Redis first (unless force refresh)
      if (!forceRefresh) {
        const redisResult = await onDemandRedis.withConnection(async (redis) => {
          const cached = await redis.get(`cache:${key}`);
          if (cached) {
            console.log(`[HybridCache] Redis hit for key: ${key}`);
            return JSON.parse(cached) as T;
          }
          return null;
        }, { connectionId, skipInDocker });

        if (redisResult !== null) {
          return redisResult;
        }
      }

      // Redis miss or unavailable - check PostgreSQL
      console.log(`[HybridCache] Redis miss for key: ${key}, checking PostgreSQL`);
      const [pgResult] = await db
        .select()
        .from(hybridCache)
        .where(eq(hybridCache.key, key))
        .limit(1);

      if (pgResult) {
        console.log(`[HybridCache] PostgreSQL hit for key: ${key}`);
        const value = pgResult.value as T;

        // Async cache warm-up: Store in Redis for next time
        this.warmRedisCache(key, value, options).catch(err => 
          console.log(`[HybridCache] Redis warm-up failed for key: ${key}`, err.message)
        );

        return value;
      }

      console.log(`[HybridCache] Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      console.log(`[HybridCache] Error retrieving key: ${key}`, error instanceof Error ? error.message : 'Unknown');
      return null;
    }
  }

  /**
   * Write-through cache: PostgreSQL first, Redis cache update
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const { 
      ttl = 3600, 
      category = 'general', 
      connectionId = 'cache', 
      skipInDocker = true 
    } = options;
    
    const expiresAt = ttl > 0 ? new Date(Date.now() + (ttl * 1000)) : null;
    const serializedValue = JSON.stringify(value);
    const size = Buffer.byteLength(serializedValue, 'utf8');

    try {
      // Write to PostgreSQL first (source of truth)
      await db
        .insert(hybridCache)
        .values({
          key,
          value,
          expiresAt,
          category,
          size,
        })
        .onConflictDoUpdate({
          target: hybridCache.key,
          set: {
            value,
            expiresAt,
            category,
            size,
            updatedAt: new Date(),
          },
        });

      console.log(`[HybridCache] PostgreSQL write successful for key: ${key}`);

      // Update Redis cache (async, non-blocking)
      this.updateRedisCache(key, value, ttl, connectionId, skipInDocker).catch(err =>
        console.log(`[HybridCache] Redis update failed for key: ${key}`, err.message)
      );

    } catch (error) {
      console.error(`[HybridCache] PostgreSQL write failed for key: ${key}`, error);
      throw new Error(`Cache write failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete from both Redis and PostgreSQL
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const { connectionId = 'cache', skipInDocker = true } = options;
    let success = false;

    try {
      // Delete from PostgreSQL
      const result = await db
        .delete(hybridCache)
        .where(eq(hybridCache.key, key));

      success = result.rowCount > 0;
      console.log(`[HybridCache] PostgreSQL delete for key: ${key}, success: ${success}`);

      // Delete from Redis (async, non-blocking)
      onDemandRedis.withConnection(async (redis) => {
        await redis.del(`cache:${key}`);
        console.log(`[HybridCache] Redis delete for key: ${key}`);
      }, { connectionId, skipInDocker }).catch(err =>
        console.log(`[HybridCache] Redis delete failed for key: ${key}`, err.message)
      );

      return success;
    } catch (error) {
      console.error(`[HybridCache] Delete failed for key: ${key}`, error);
      return false;
    }
  }

  /**
   * Delete all cache entries in a category
   */
  async deleteByCategory(category: string): Promise<number> {
    try {
      const result = await db
        .delete(hybridCache)
        .where(eq(hybridCache.category, category));

      const deletedCount = result.rowCount || 0;
      console.log(`[HybridCache] Deleted ${deletedCount} entries for category: ${category}`);

      // Clear Redis entries with pattern (best effort)
      onDemandRedis.withConnection(async (redis) => {
        const keys = await redis.keys(`cache:*`);
        if (keys.length > 0) {
          // Note: In production, use SCAN instead of KEYS for large datasets
          await redis.del(...keys);
          console.log(`[HybridCache] Cleared ${keys.length} Redis keys for category cleanup`);
        }
      }, { connectionId: 'category-cleanup' }).catch(err =>
        console.log(`[HybridCache] Redis category cleanup failed`, err.message)
      );

      return deletedCount;
    } catch (error) {
      console.error(`[HybridCache] Category delete failed for: ${category}`, error);
      return 0;
    }
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
      console.log(`[HybridCache] Cleaned ${deletedCount} expired cache entries`);
      return deletedCount;
    } catch (error) {
      console.error(`[HybridCache] Expired cleanup failed`, error);
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
   * Private: Warm Redis cache with PostgreSQL data
   */
  private async warmRedisCache(key: string, value: any, options: CacheOptions): Promise<void> {
    const { ttl = 3600, connectionId = 'warm-up', skipInDocker = true } = options;
    
    await onDemandRedis.withConnection(async (redis) => {
      await redis.setex(`cache:${key}`, ttl, JSON.stringify(value));
      console.log(`[HybridCache] Redis warmed for key: ${key}`);
    }, { connectionId, skipInDocker });
  }

  /**
   * Private: Update Redis cache
   */
  private async updateRedisCache(
    key: string, 
    value: any, 
    ttl: number, 
    connectionId: string, 
    skipInDocker: boolean
  ): Promise<void> {
    await onDemandRedis.withConnection(async (redis) => {
      await redis.setex(`cache:${key}`, ttl, JSON.stringify(value));
      console.log(`[HybridCache] Redis updated for key: ${key}`);
    }, { connectionId, skipInDocker });
  }

  /**
   * Test connection to both backends
   */
  async testConnections(): Promise<{
    redis: boolean;
    postgresql: boolean;
    overall: boolean;
  }> {
    const results = {
      redis: false,
      postgresql: false,
      overall: false,
    };

    try {
      // Test PostgreSQL
      await db.select().from(hybridCache).limit(1);
      results.postgresql = true;
      console.log(`[HybridCache] PostgreSQL connection: OK`);
    } catch (error) {
      console.log(`[HybridCache] PostgreSQL connection: FAILED`);
    }

    try {
      // Test Redis
      await onDemandRedis.withConnection(async (redis) => {
        await redis.ping();
        return 'OK';
      }, { connectionId: 'test', skipInDocker: true });
      results.redis = true;
      console.log(`[HybridCache] Redis connection: OK`);
    } catch (error) {
      console.log(`[HybridCache] Redis connection: FAILED`);
    }

    results.overall = results.postgresql; // System works if PostgreSQL is available
    return results;
  }
}

// Export singleton instance
export const hybridCacheService = HybridCacheService.getInstance();