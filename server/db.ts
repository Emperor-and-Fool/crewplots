/**
 * Database connection configuration module
 * 
 * This module sets up the PostgreSQL database connection using Neon's serverless driver,
 * initializes the connection pool with optimized settings, and configures the Drizzle ORM.
 * 
 * The module handles connection pooling, error handling, connection verification,
 * and provides the initialized Drizzle ORM instance for database operations.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon database to use websockets (required for Neon serverless)
neonConfig.webSocketConstructor = ws;

// Verify DATABASE_URL environment variable is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * PostgreSQL connection pool with optimized settings to handle concurrent requests
 * and maintain reliable connections:
 * - max: Limits maximum number of clients to prevent resource exhaustion
 * - idleTimeoutMillis: Closes idle connections to free resources
 * - connectionTimeoutMillis: Prevents hanging on connection attempts
 * - maxUses: Prevents potential memory leaks by recycling connections
 */
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5,                         // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,       // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection not established
  maxUses: 100,                   // Close a connection after it has been used 100 times (prevents potential memory leaks)
});

// Add connection event listener to handle unexpected errors without crashing the server
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // Don't crash the server, just log the error
});

/**
 * Database connection health check function
 * 
 * Performs a simple query to verify the database connection is working correctly.
 * Uses proper client acquisition and release pattern to avoid connection leaks.
 * 
 * @returns {Promise<boolean>} True if connection is successful, false otherwise
 */
export const checkDatabaseConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    // Simple query to check connection
    const result = await client.query('SELECT 1 as connection_test');
    return result.rows[0].connection_test === 1;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  } finally {
    // Always release the client back to the pool
    if (client) client.release();
  }
};

/**
 * Drizzle ORM instance initialized with the database schema
 * Used for type-safe database operations throughout the application
 */
export const db = drizzle(pool, { schema });

// Perform initial connection check without blocking server startup
checkDatabaseConnection()
  .then(isConnected => {
    if (isConnected) {
      console.log('✅ Database connection established successfully');
    } else {
      console.error('❌ Failed to connect to database');
    }
  })
  .catch(err => {
    console.error('❌ Error checking database connection:', err);
  });