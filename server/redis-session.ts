import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';

// Create a Redis client
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
  console.error('Redis client error:', err);
});

// Create Redis session store
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'crewplots:sess:',
});

// Configure session options
export const sessionOptions = {
  store: redisStore,
  secret: process.env.SESSION_SECRET || "crewplots-dev-key-" + Math.random().toString(36).substring(2, 15),
  resave: false,
  saveUninitialized: false,
  name: 'crewplots.sid',
  cookie: { 
    maxAge: 86400000, // 24 hours
    secure: true,     // HTTPS only
    httpOnly: true,   // Not accessible via JavaScript
    sameSite: 'lax' as const,  // More compatible and secure than 'none'
    path: '/'
  },
  rolling: true,      // Reset expiration with each request
};

export { redisClient };

export { redisClient, redisStore };