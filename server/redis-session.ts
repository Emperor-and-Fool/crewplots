import session from 'express-session';
import connectPgSimple from "connect-pg-simple";
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import { pool } from "./db";

// Create Redis client with simplified settings for reliability
const redisClient = createClient({ 
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  // No fancy options, just connect with defaults
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 2) {
        console.log('Redis connection attempt failed, falling back to PostgreSQL');
        return false; // Stop retrying after 2 attempts
      }
      return 100; // Try again quickly
    }
  }
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('Successfully connected to Redis');
  } catch (err) {
    console.error('Redis connection error:', err);
  }
})();

// Log Redis connection events
redisClient.on('connect', () => console.log('Redis client connecting'));
redisClient.on('ready', () => console.log('Redis client ready'));
redisClient.on('error', (err) => console.error('Redis client error:', err));
redisClient.on('reconnecting', () => console.log('Redis client reconnecting'));

// Create Redis session store
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'crewplots:sess:',
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

// Create PostgreSQL session store as fallback
const PgStore = connectPgSimple(session);
const pgStore = new PgStore({
  pool: pool,
  tableName: 'sessions',
  createTableIfMissing: true,
  ttl: 86400 // 24 hours in seconds
});

// Configure fallback session options with PostgreSQL
const pgSessionOptions = {
  store: pgStore,
  secret: process.env.SESSION_SECRET || "crewplots-dev-key-" + Math.random().toString(36).substring(2, 15),
  resave: true, // For PG store, need to force save
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

// Always use Redis unless we get a specific error during init time
let useRedis = true;

// If Redis errors out, we'll set this to false so we fall back to PG store for future requests
redisClient.on('error', (err) => {
  console.error('Redis client error, falling back to PostgreSQL:', err);
  useRedis = false;
});

// Export whichever session store is available
export const sessionOptions = useRedis ? redisSessionOptions : pgSessionOptions;
export { redisClient, redisStore, pgStore };