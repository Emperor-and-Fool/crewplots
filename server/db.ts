import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon database to use websockets
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a connection pool with better configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection not established
  maxUses: 100, // Close a connection after it has been used 100 times (prevents potential memory leaks)
});

// Add connection event listeners for better debugging
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // Don't crash the server, just log the error
});

// Add connection health check function
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
    if (client) client.release();
  }
};

// Create drizzle ORM instance
export const db = drizzle(pool, { schema });

// Initial connection check (don't block server startup)
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