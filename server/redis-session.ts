import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';

// Create Redis client with Replit-optimized settings
const redisClient = createClient({ 
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    reconnectStrategy: (retries) => {
      console.log(`Redis connection attempt ${retries}`);
      return Math.min(retries * 100, 3000); // Increasing backoff with max 3s delay
    }
  }
});

// Connect to Redis with persistent retry mechanism
(async function connectWithRetry() {
  try {
    await redisClient.connect();
    console.log('✅ Successfully connected to Redis');
  } catch (err) {
    console.error('⚠️ Redis connection error, retrying in 2 seconds:', err);
    // Keep trying to connect to Redis every 2 seconds
    setTimeout(connectWithRetry, 2000);
  }
})();

// Log Redis connection events
redisClient.on('connect', () => console.log('Redis client connecting'));
redisClient.on('ready', () => console.log('Redis client ready'));
redisClient.on('error', (err) => console.error('Redis client error:', err));
redisClient.on('reconnecting', () => console.log('Redis client reconnecting'));

// Create Redis session store with optimized settings
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'crewplots:sess:',
  disableTouch: true, // Reduces writes
  ttl: 1800 // 30 minutes in seconds
});

// Configure session options for Redis
const redisSessionOptions = {
  store: redisStore,
  secret: process.env.SESSION_SECRET || "crewplots-dev-key-" + Math.random().toString(36).substring(2, 15),
  resave: false, // No need to resave with Redis
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

// Only use Redis for session storage as explicitly instructed

// Log Redis errors but NEVER fall back to PostgreSQL
redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
  // No fallback to PostgreSQL - we'll keep trying with Redis only
});

// Only export Redis session options and related Redis components
export const sessionOptions = redisSessionOptions;
export { redisClient, redisStore };