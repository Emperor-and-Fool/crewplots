import { onDemandRedis } from '../../adapters-repl/redis-ondemand/on-demand-redis';
import { OnDemandRedisService } from '../../adapters-repl/redis-ondemand/on-demand-redis';
import { OnDemandMongoService } from '../../adapters-repl/mongodb-ondemand/on-demand-mongodb';
import { db } from '../db';
import { hybridCache } from '@shared/schema';
import { eq, lt } from 'drizzle-orm';
import type { Redis } from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  category?: string;
  connectionId?: string;
  skipInDocker?: boolean;
  sessionId?: string; // Session-aware caching
}

export class HybridCacheService {
  private redisService: OnDemandRedisService;

  constructor() {
    this.redisService = onDemandRedis;
    console.log('[HybridCache] Service initialized with on-demand Redis adapter');
  }

  /**
   * Get value from cache - Redis primary, PostgreSQL fallback
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { connectionId = 'cache-read', skipInDocker = false, sessionId } = options;
    
    // Create session-aware cache key
    const cacheKey = sessionId ? `session:${sessionId.substring(0, 8)}:${key}` : key;
    console.log(`[HybridCache] GET called for key: ${key}, session-aware key: ${cacheKey}`);

    // Try Redis first for application caching
    try {
      const result = await this.redisService.withConnection(
        async (client: Redis) => {
          const value = await client.get(cacheKey);
          if (value) {
            console.log(`[HybridCache] Redis cache hit for key: ${cacheKey}`);
            return JSON.parse(value);
          }
          return null;
        },
        { connectionId, keepAlive: 30000, skipInDocker }
      );
      
      if (result !== null) return result;
    } catch (error) {
      console.log(`[HybridCache] Redis unavailable for key: ${cacheKey}, falling back to PostgreSQL`);
    }

    // PostgreSQL fallback
    try {
      const [pgResult] = await db
        .select()
        .from(hybridCache)
        .where(eq(hybridCache.key, cacheKey))
        .limit(1);

      if (pgResult) {
        console.log(`[HybridCache] PostgreSQL hit for key: ${cacheKey}`);
        
        // Check if expired
        if (pgResult.expiresAt && pgResult.expiresAt < new Date()) {
          console.log(`[HybridCache] PostgreSQL entry expired for key: ${cacheKey}, cleaning up`);
          
          // Trigger MongoDB on-demand service for MongoDB-backed data
          if (key.includes('notes') || key.includes('messages')) {
            console.log(`[HybridCache] Proactively starting MongoDB for expired key: ${key}`);
            try {
              const mongoService = OnDemandMongoService.getInstance();
              mongoService.ensureReady().catch(err => 
                console.log(`[HybridCache] MongoDB startup initiated for: ${key}`, err?.message)
              );
            } catch (error) {
              console.log(`[HybridCache] Could not trigger MongoDB startup for: ${key}`);
            }
          }
          
          await this.delete(key, options);
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
                await redis.setex(cacheKey, ttl, JSON.stringify(pgResult.value));
                console.log(`[HybridCache] Restored to Redis: ${cacheKey} (TTL: ${ttl}s)`);
              }
            },
            { connectionId: 'cache-restore', keepAlive: 5000, skipInDocker }
          );
        } catch (error) {
          console.log(`[HybridCache] Could not restore to Redis: ${cacheKey}`);
        }

        return pgResult.value as T;
      }

      console.log(`[HybridCache] Complete miss for key: ${key}`);
      
      // Trigger MongoDB on-demand service for MongoDB-backed data on complete miss
      if (key.includes('notes') || key.includes('messages')) {
        console.log(`[HybridCache] Proactively starting MongoDB for cache miss: ${key}`);
        try {
          const mongoService = OnDemandMongoService.getInstance();
          mongoService.ensureReady().catch(err => 
            console.log(`[HybridCache] MongoDB startup initiated for miss: ${key}`, err?.message)
          );
        } catch (error) {
          console.log(`[HybridCache] Could not trigger MongoDB startup for miss: ${key}`);
        }
      }
      
      return null;
    } catch (error) {
      console.error(`[HybridCache] PostgreSQL error for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Set value in cache - PostgreSQL primary, Redis write-through
   */
  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const { 
      ttl = 3600, 
      category = 'general', 
      connectionId = 'cache-write',
      skipInDocker = false,
      sessionId
    } = options;

    // Create session-aware cache key
    const cacheKey = sessionId ? `session:${sessionId.substring(0, 8)}:${key}` : key;

    const expiresAt = ttl > 0 ? new Date(Date.now() + ttl * 1000) : null;
    const serializedValue = JSON.stringify(value);
    const size = Buffer.byteLength(serializedValue, 'utf8');

    let pgSuccess = false;

    // Always write to PostgreSQL (source of truth)
    try {
      await db
        .insert(hybridCache)
        .values({
          key: cacheKey,
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

      console.log(`[HybridCache] PostgreSQL set: ${cacheKey} (Category: ${category}, Size: ${size}B)`);
      pgSuccess = true;

      // Write-through to Redis cache if PostgreSQL write succeeded
      if (pgSuccess) {
        try {
          await this.redisService.withConnection(
            async (client: Redis) => {
              if (ttl > 0) {
                await client.setex(cacheKey, ttl, serializedValue);
                console.log(`[HybridCache] Redis write-through: ${cacheKey} (TTL: ${ttl}s)`);
              } else {
                await client.set(cacheKey, serializedValue);
                console.log(`[HybridCache] Redis write-through: ${cacheKey} (no TTL)`);
              }
            },
            { connectionId, keepAlive: 30000, skipInDocker }
          );
        } catch (error) {
          console.log(`[HybridCache] Redis write-through failed for key: ${key}, continuing with PostgreSQL only`);
        }
      }
    } catch (error) {
      console.error(`[HybridCache] PostgreSQL set failed for key: ${key}`, error);
    }

    return pgSuccess; // PostgreSQL is source of truth
  }

  /**
   * Delete key from both Redis and PostgreSQL
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const { connectionId = 'cache-delete', skipInDocker = false, sessionId } = options;

    // Create session-aware cache key
    const cacheKey = sessionId ? `session:${sessionId.substring(0, 8)}:${key}` : key;

    let redisSuccess = false;
    let pgSuccess = false;

    // Try Redis deletion
    try {
      await onDemandRedis.withConnection(
        async (redis) => {
          const result = await redis.del(cacheKey);
          redisSuccess = result > 0;
          console.log(`[HybridCache] Redis delete: ${cacheKey} (${redisSuccess ? 'success' : 'not found'})`);
        },
        { connectionId, keepAlive: 5000, skipInDocker }
      );
    } catch (error) {
      console.log(`[HybridCache] Redis delete failed for key: ${cacheKey}`);
    }

    // PostgreSQL deletion
    try {
      const result = await db
        .delete(hybridCache)
        .where(eq(hybridCache.key, cacheKey));

      pgSuccess = (result.rowCount || 0) > 0;
      console.log(`[HybridCache] PostgreSQL delete: ${cacheKey} (${pgSuccess ? 'success' : 'not found'})`);
    } catch (error) {
      console.error(`[HybridCache] PostgreSQL delete failed for key: ${cacheKey}`, error);
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