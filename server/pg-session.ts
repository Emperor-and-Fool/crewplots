/**
 * PostgreSQL Session Configuration Module
 * 
 * This module configures Express to use PostgreSQL for session storage.
 * This serves as a temporary solution until the Redis setup is complete.
 * 
 * Features:
 * - Uses the sessions table already defined in schema.ts
 * - Configures secure cookie settings for production use
 * - Optimized for compatibility across different environments
 */

import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { pool } from './db';

// Create PostgreSQL session store
const PgStore = pgSession(session);
const pgStore = new PgStore({
  pool,
  tableName: 'sessions', // Uses the table already defined in schema.ts
  createTableIfMissing: true,
});

/**
 * Express session configuration optimized for security
 * 
 * Security features:
 * - Uses secure cookies when in production
 * - Sets httpOnly flag to prevent JavaScript access
 * - Configures SameSite to 'lax' for CSRF protection while preserving UX
 */
const pgSessionOptions = {
  store: pgStore,
  // Use environment variable for session secret with fallback for development
  secret: process.env.SESSION_SECRET || "crewplots-dev-key-" + Math.random().toString(36).substring(2, 15),
  resave: false,
  saveUninitialized: false,
  name: 'crewplots.sid',
  cookie: { 
    maxAge: 86400000,         // 24 hours session lifetime
    secure: process.env.NODE_ENV === 'production', // Only require HTTPS in production
    httpOnly: true,           // Not accessible via JavaScript (XSS protection)
    sameSite: 'lax' as const, // More compatible and secure than 'none'
    path: '/'                 // Cookie available across the entire site
  },
  rolling: true,              // Reset expiration with each request
};

// Export session configuration 
export const sessionOptions = pgSessionOptions;