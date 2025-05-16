/**
 * Redis Session Configuration Module
 * 
 * This module sets up the Redis connection and configures the Express session store
 * to use Redis for storing session data. Redis provides fast, in-memory session storage
 * which is critical for application performance.
 * 
 * Features:
 * - Persistent connection with automatic reconnection strategy
 * - Optimized session configuration for security and performance
 * - Comprehensive event logging for monitoring and debugging
 * - No fallbacks to other storage mechanisms (as explicitly required)
 */

import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';

/**
 * Redis client configuration with Replit-optimized settings
 * 
 * - Uses environment variable for Redis URL if available
 * - Implements exponential backoff reconnection strategy
 * - Provides detailed connection logging
 */
const redisClient = createClient({ 
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    reconnectStrategy: (retries) => {
      // Log each connection attempt for monitoring
      console.log(`Redis connection attempt ${retries}`);
      // Exponential backoff with a maximum delay of 3 seconds
      return Math.min(retries * 100, 3000);
    }
  }
});

/**
 * Connect to Redis with persistent retry mechanism
 * 
 * This self-executing async function attempts to connect to Redis
 * and will continuously retry if connection fails.
 */
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

/**
 * Redis connection event handlers for monitoring connection status
 */
redisClient.on('connect', () => console.log('Redis client connecting'));
redisClient.on('ready', () => console.log('Redis client ready'));
redisClient.on('error', (err) => console.error('Redis client error:', err));
redisClient.on('reconnecting', () => console.log('Redis client reconnecting'));

/**
 * Redis session store configuration
 * 
 * - Uses custom prefix for easier identification in Redis
 * - Disables touch to reduce write operations (performance optimization)
 * - Sets TTL for session data independent of cookie expiration
 */
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'crewplots:sess:', // Namespace for session keys
  disableTouch: true,         // Reduces writes to improve performance
  ttl: 1800                   // 30 minutes expiration (in seconds)
});

/**
 * Express session configuration optimized for security and performance
 * 
 * Security features:
 * - Uses secure cookies (HTTPS only)
 * - Sets httpOnly flag to prevent JavaScript access
 * - Configures SameSite to 'lax' for CSRF protection while preserving UX
 * 
 * Performance features:
 * - Disables resave since Redis handles TTL
 * - Only saves initialized sessions
 * - Uses rolling sessions to extend lifetime with activity
 */
const redisSessionOptions = {
  store: redisStore,
  // Use environment variable for session secret with fallback for development
  secret: process.env.SESSION_SECRET || "crewplots-dev-key-" + Math.random().toString(36).substring(2, 15),
  resave: false,              // No need to resave with Redis store
  saveUninitialized: false,   // Don't create session until something stored
  name: 'crewplots.sid',      // Custom cookie name for the application
  cookie: { 
    maxAge: 86400000,         // 24 hours session lifetime
    secure: true,             // HTTPS only to prevent MITM attacks
    httpOnly: true,           // Not accessible via JavaScript (XSS protection)
    sameSite: 'lax' as const, // More compatible and secure than 'none'
    path: '/'                 // Cookie available across the entire site
  },
  rolling: true,              // Reset expiration with each request
};

/**
 * Explicit error handler to ensure no fallback to PostgreSQL
 * This is a duplicated event handler to emphasize the importance of NOT falling back
 */
redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
  // No fallback to PostgreSQL - we'll keep trying with Redis only
  // This is a critical requirement for the application
});

// Export session configuration and Redis components
export const sessionOptions = redisSessionOptions;
export { redisClient, redisStore };