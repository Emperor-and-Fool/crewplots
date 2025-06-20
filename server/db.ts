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

// Create an optimized connection pool with increased capacity for better performance
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 12, // Increased pool size for concurrent users
  idleTimeoutMillis: 30000, // Keep connections idle longer
  connectionTimeoutMillis: 5000, // Faster timeout for quicker error detection
  maxUses: 500, // Keep connections longer to reduce setup overhead
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
  .then((connected) => {
    if (connected) {
      console.log('✅ Database connection established successfully');
    } else {
      console.warn('⚠️ Database connection check failed at startup');
    }
  })
  .catch((error) => {
    console.error('❌ Database startup check failed:', error);
  });