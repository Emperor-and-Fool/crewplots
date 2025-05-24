import Redis from "ioredis";
import { User } from "@shared/schema";

// Redis client for session caching
let redisClient: Redis | null = null;

// Initialize Redis connection for session caching
try {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: 1,
    lazyConnect: true
  });

  redisClient.on('error', (err) => {
    console.log('Redis session cache error:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('Redis session cache connected');
  });
} catch (error) {
  console.log("Redis session cache initialization failed:", error);
}

export class SessionCache {
  private static readonly USER_PREFIX = 'user:';
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly DEFAULT_TTL = 3600; // 1 hour cache TTL

  /**
   * Cache user data for faster authentication lookups
   */
  static async cacheUser(userId: number, userData: User): Promise<void> {
    if (!redisClient) return;

    try {
      const key = `${this.USER_PREFIX}${userId}`;
      await redisClient.setex(key, this.DEFAULT_TTL, JSON.stringify(userData));
      console.log(`User ${userId} cached in Redis`);
    } catch (error) {
      console.log('Failed to cache user data:', error);
    }
  }

  /**
   * Get cached user data
   */
  static async getCachedUser(userId: number): Promise<User | null> {
    if (!redisClient) return null;

    try {
      const key = `${this.USER_PREFIX}${userId}`;
      const cached = await redisClient.get(key);
      
      if (cached) {
        console.log(`User ${userId} retrieved from Redis cache`);
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.log('Failed to get cached user data:', error);
      return null;
    }
  }

  /**
   * Cache session metadata for faster session validation
   */
  static async cacheSessionData(sessionId: string, userId: number, lastActivity: Date): Promise<void> {
    if (!redisClient) return;

    try {
      const key = `${this.SESSION_PREFIX}${sessionId}`;
      const sessionData = {
        userId,
        lastActivity: lastActivity.toISOString(),
        cachedAt: new Date().toISOString()
      };
      
      await redisClient.setex(key, this.DEFAULT_TTL, JSON.stringify(sessionData));
      console.log(`Session ${sessionId} cached in Redis`);
    } catch (error) {
      console.log('Failed to cache session data:', error);
    }
  }

  /**
   * Get cached session data
   */
  static async getCachedSession(sessionId: string): Promise<{ userId: number; lastActivity: Date } | null> {
    if (!redisClient) return null;

    try {
      const key = `${this.SESSION_PREFIX}${sessionId}`;
      const cached = await redisClient.get(key);
      
      if (cached) {
        const sessionData = JSON.parse(cached);
        console.log(`Session ${sessionId} retrieved from Redis cache`);
        return {
          userId: sessionData.userId,
          lastActivity: new Date(sessionData.lastActivity)
        };
      }
      
      return null;
    } catch (error) {
      console.log('Failed to get cached session data:', error);
      return null;
    }
  }

  /**
   * Remove user from cache (on logout or data update)
   */
  static async invalidateUser(userId: number): Promise<void> {
    if (!redisClient) return;

    try {
      const key = `${this.USER_PREFIX}${userId}`;
      await redisClient.del(key);
      console.log(`User ${userId} cache invalidated`);
    } catch (error) {
      console.log('Failed to invalidate user cache:', error);
    }
  }

  /**
   * Remove session from cache (on logout)
   */
  static async invalidateSession(sessionId: string): Promise<void> {
    if (!redisClient) return;

    try {
      const key = `${this.SESSION_PREFIX}${sessionId}`;
      await redisClient.del(key);
      console.log(`Session ${sessionId} cache invalidated`);
    } catch (error) {
      console.log('Failed to invalidate session cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{ userCacheHits: number; sessionCacheHits: number } | null> {
    if (!redisClient) return null;

    try {
      const userKeys = await redisClient.keys(`${this.USER_PREFIX}*`);
      const sessionKeys = await redisClient.keys(`${this.SESSION_PREFIX}*`);
      
      return {
        userCacheHits: userKeys.length,
        sessionCacheHits: sessionKeys.length
      };
    } catch (error) {
      console.log('Failed to get cache stats:', error);
      return null;
    }
  }
}