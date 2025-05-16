import session from 'express-session';
import connectPgSimple from "connect-pg-simple";
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import { pool } from "./db";

// Create Redis client with settings optimized for reliable connections
const redisClient = createClient({ 
  url: process.env.REDIS_URL || 'redis://0.0.0.0:6379',
  socket: {
    reconnectStrategy: (retries) => {
      console.log(`Redis connection attempt ${retries}`);
      return Math.min(retries * 100, 3000); // Increasing backoff with max 3s delay
    },
    connectTimeout: 30000 // 30 seconds to connect
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

// ALWAYS use Redis - never fall back to PostgreSQL as explicitly instructed
const useRedis = true;

// Log Redis errors but NEVER fall back to PostgreSQL
redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
  // No fallback to PostgreSQL - we'll keep trying with Redis
});

// Only use Redis for session storage
export const sessionOptions = redisSessionOptions;
export { redisClient, redisStore, pgStore };