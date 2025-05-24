import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

export async function initRedis() {
  try {
    await redisClient.connect();
    console.log('Redis connected successfully');
    return true;
  } catch (error) {
    console.warn('Redis connection failed, continuing without Redis:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

export async function testRedisConnection() {
  try {
    await redisClient.ping();
    return { connected: true, message: 'Redis connection successful' };
  } catch (error) {
    return { connected: false, message: `Redis connection failed: ${error}` };
  }
}

export async function cacheGet(key: string) {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttl: number = 3600) {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis set error:', error);
    return false;
  }
}

export async function cacheDel(key: string) {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis delete error:', error);
    return false;
  }
}
