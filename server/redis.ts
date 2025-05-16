import { createClient } from 'redis';

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      console.log(`Redis connection attempt ${retries}`);
      return Math.min(retries * 1000, 5000);
    }
  }
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis successfully');
  } catch (err) {
    console.error('Redis connection error:', err);
  }
})();

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export default redisClient;