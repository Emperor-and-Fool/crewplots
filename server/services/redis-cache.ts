import Redis from 'ioredis';

export class RedisCache {
  private client: Redis | null = null;
  private isConnected = false;

  async connect(): Promise<boolean> {
    if (this.isConnected && this.client) {
      return true;
    }

    try {
      this.client = new Redis({
        host: '127.0.0.1',
        port: 6379,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        lazyConnect: true,
        enableAutoPipelining: true
      });

      await this.client.connect();
      this.isConnected = true;
      console.log('✅ Redis cache connected successfully');
      return true;
    } catch (error) {
      console.log('Redis cache connection failed, will use fallback storage');
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn(`Redis GET failed for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.warn(`Redis SET failed for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.warn(`Redis DEL failed for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.warn(`Redis EXISTS failed for key ${key}:`, error);
      return false;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  // Cache patterns for common operations
  async cacheUserSession(userId: number, sessionData: any, ttlSeconds = 3600): Promise<void> {
    await this.set(`session:${userId}`, sessionData, ttlSeconds);
  }

  async getUserSession(userId: number): Promise<any> {
    return await this.get(`session:${userId}`);
  }

  async invalidateUserSession(userId: number): Promise<void> {
    await this.del(`session:${userId}`);
  }

  async cacheMessages(userId: number, messages: any[], ttlSeconds = 300): Promise<void> {
    await this.set(`messages:${userId}`, messages, ttlSeconds);
  }

  async getCachedMessages(userId: number): Promise<any[] | null> {
    return await this.get(`messages:${userId}`);
  }

  async invalidateMessages(userId: number): Promise<void> {
    await this.del(`messages:${userId}`);
  }

  async cacheUserProfile(userId: number, profile: any, ttlSeconds = 1800): Promise<void> {
    await this.set(`profile:${userId}`, profile, ttlSeconds);
  }

  async getCachedUserProfile(userId: number): Promise<any> {
    return await this.get(`profile:${userId}`);
  }

  async invalidateUserProfile(userId: number): Promise<void> {
    await this.del(`profile:${userId}`);
  }
}

export const redisCache = new RedisCache();