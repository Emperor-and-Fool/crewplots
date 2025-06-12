import { onDemandRedis } from './on-demand-service';
import type { User } from '@shared/schema';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  connectionId?: string;
  skipInDocker?: boolean;
}

export class CacheService {
  private static instance: CacheService;

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Session caching
  async cacheSession(
    sessionId: string, 
    userData: User, 
    options: CacheOptions = {}
  ): Promise<void> {
    const { ttl = 86400, connectionId = 'session', skipInDocker = true } = options;

    try {
      await onDemandRedis.withConnection(async (redis) => {
        await redis.setex(
          `session:${sessionId}`, 
          ttl, 
          JSON.stringify(userData)
        );
        console.log(`[Cache] Session cached for user: ${userData.username}`);
      }, { connectionId, skipInDocker });
    } catch (error) {
      console.log('[Cache] Session caching failed, using fallback storage');
      // Fallback to PostgreSQL session storage handled by session middleware
    }
  }

  async getSession(
    sessionId: string, 
    options: CacheOptions = {}
  ): Promise<User | null> {
    const { connectionId = 'session', skipInDocker = true } = options;

    try {
      return await onDemandRedis.withConnection(async (redis) => {
        const cached = await redis.get(`session:${sessionId}`);
        if (cached) {
          console.log('[Cache] Session retrieved from cache');
          return JSON.parse(cached) as User;
        }
        return null;
      }, { connectionId, skipInDocker });
    } catch (error) {
      console.log('[Cache] Session retrieval failed, using fallback storage');
      return null; // Fallback to PostgreSQL
    }
  }

  async invalidateSession(
    sessionId: string, 
    options: CacheOptions = {}
  ): Promise<void> {
    const { connectionId = 'session', skipInDocker = true } = options;

    try {
      await onDemandRedis.withConnection(async (redis) => {
        await redis.del(`session:${sessionId}`);
        console.log('[Cache] Session invalidated');
      }, { connectionId, skipInDocker });
    } catch (error) {
      console.log('[Cache] Session invalidation failed (non-critical)');
    }
  }

  // Message caching
  async cacheMessages(
    userId: number, 
    messages: any[], 
    options: CacheOptions = {}
  ): Promise<void> {
    const { ttl = 3600, connectionId = 'messages', skipInDocker = true } = options;

    try {
      await onDemandRedis.withConnection(async (redis) => {
        await redis.setex(
          `messages:user:${userId}`, 
          ttl, 
          JSON.stringify(messages)
        );
        console.log(`[Cache] Messages cached for user: ${userId}`);
      }, { connectionId, skipInDocker });
    } catch (error) {
      console.log('[Cache] Message caching failed, using database storage');
    }
  }

  async getCachedMessages(
    userId: number, 
    options: CacheOptions = {}
  ): Promise<any[] | null> {
    const { connectionId = 'messages', skipInDocker = true } = options;

    try {
      return await onDemandRedis.withConnection(async (redis) => {
        const cached = await redis.get(`messages:user:${userId}`);
        if (cached) {
          console.log(`[Cache] Messages retrieved from cache for user: ${userId}`);
          return JSON.parse(cached);
        }
        return null;
      }, { connectionId, skipInDocker });
    } catch (error) {
      console.log('[Cache] Message retrieval failed, using database storage');
      return null;
    }
  }

  async invalidateUserMessages(
    userId: number, 
    options: CacheOptions = {}
  ): Promise<void> {
    const { connectionId = 'messages', skipInDocker = true } = options;

    try {
      await onDemandRedis.withConnection(async (redis) => {
        await redis.del(`messages:user:${userId}`);
        console.log(`[Cache] Messages invalidated for user: ${userId}`);
      }, { connectionId, skipInDocker });
    } catch (error) {
      console.log('[Cache] Message invalidation failed (non-critical)');
    }
  }

  // Profile caching
  async cacheProfile(
    userId: number, 
    profile: any, 
    options: CacheOptions = {}
  ): Promise<void> {
    const { ttl = 7200, connectionId = 'profile', skipInDocker = true } = options;

    try {
      await onDemandRedis.withConnection(async (redis) => {
        await redis.setex(
          `profile:${userId}`, 
          ttl, 
          JSON.stringify(profile)
        );
        console.log(`[Cache] Profile cached for user: ${userId}`);
      }, { connectionId, skipInDocker });
    } catch (error) {
      console.log('[Cache] Profile caching failed, using database storage');
    }
  }

  async getCachedProfile(
    userId: number, 
    options: CacheOptions = {}
  ): Promise<any | null> {
    const { connectionId = 'profile', skipInDocker = true } = options;

    try {
      return await onDemandRedis.withConnection(async (redis) => {
        const cached = await redis.get(`profile:${userId}`);
        if (cached) {
          console.log(`[Cache] Profile retrieved from cache for user: ${userId}`);
          return JSON.parse(cached);
        }
        return null;
      }, { connectionId, skipInDocker });
    } catch (error) {
      console.log('[Cache] Profile retrieval failed, using database storage');
      return null;
    }
  }

  // Batch operations
  async warmupUserCache(
    userId: number, 
    userData: { session?: User; messages?: any[]; profile?: any }, 
    options: CacheOptions = {}
  ): Promise<void> {
    const { skipInDocker = true } = options;

    try {
      const operations = [];

      if (userData.session) {
        operations.push((redis: any) => 
          redis.setex(`session:user:${userId}`, 86400, JSON.stringify(userData.session))
        );
      }

      if (userData.messages) {
        operations.push((redis: any) => 
          redis.setex(`messages:user:${userId}`, 3600, JSON.stringify(userData.messages))
        );
      }

      if (userData.profile) {
        operations.push((redis: any) => 
          redis.setex(`profile:${userId}`, 7200, JSON.stringify(userData.profile))
        );
      }

      if (operations.length > 0) {
        await onDemandRedis.withBatch(operations, { 
          connectionId: `warmup:${userId}`, 
          skipInDocker 
        });
        console.log(`[Cache] User cache warmed up for user: ${userId}`);
      }
    } catch (error) {
      console.log(`[Cache] Cache warmup failed for user: ${userId}, using database storage`);
    }
  }

  // General purpose caching
  async set(
    key: string, 
    value: any, 
    options: CacheOptions = {}
  ): Promise<void> {
    const { ttl = 3600, connectionId = 'general', skipInDocker = true } = options;

    try {
      await onDemandRedis.withConnection(async (redis) => {
        await redis.setex(key, ttl, JSON.stringify(value));
        console.log(`[Cache] Key cached: ${key}`);
      }, { connectionId, skipInDocker });
    } catch (error) {
      console.log(`[Cache] Caching failed for key: ${key}`);
    }
  }

  async get<T>(
    key: string, 
    options: CacheOptions = {}
  ): Promise<T | null> {
    const { connectionId = 'general', skipInDocker = true } = options;

    try {
      return await onDemandRedis.withConnection(async (redis) => {
        const cached = await redis.get(key);
        if (cached) {
          console.log(`[Cache] Key retrieved: ${key}`);
          return JSON.parse(cached) as T;
        }
        return null;
      }, { connectionId, skipInDocker });
    } catch (error) {
      console.log(`[Cache] Retrieval failed for key: ${key}`);
      return null;
    }
  }

  async delete(
    key: string, 
    options: CacheOptions = {}
  ): Promise<void> {
    const { connectionId = 'general', skipInDocker = true } = options;

    try {
      await onDemandRedis.withConnection(async (redis) => {
        await redis.del(key);
        console.log(`[Cache] Key deleted: ${key}`);
      }, { connectionId, skipInDocker });
    } catch (error) {
      console.log(`[Cache] Deletion failed for key: ${key}`);
    }
  }

  getStatus() {
    return onDemandRedis.getStatus();
  }

  async shutdown(): Promise<void> {
    await onDemandRedis.shutdown();
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();