import session from 'express-session';
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

// Create PostgreSQL session store
const PgStore = connectPgSimple(session);
const pgStore = new PgStore({
  pool: pool,
  tableName: 'sessions',
  createTableIfMissing: true,
  ttl: 86400 // 24 hours in seconds
});

// Configure session options
export const sessionOptions = {
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