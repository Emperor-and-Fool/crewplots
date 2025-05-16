import Redis from 'ioredis';

// Create Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  keyPrefix: 'crewplots:',
  retryStrategy: (times) => {
    console.log(`Redis connection attempt ${times}`);
    // Try to reconnect after 5 seconds
    return Math.min(times * 1000, 5000);
  }
});

redisClient.on('connect', () => {
  console.log('Connected to Redis successfully');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export default redisClient;