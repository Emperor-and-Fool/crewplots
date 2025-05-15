import { pool } from '../../server/db';
import { fileURLToPath } from 'url';
import path from 'path';

async function runMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if the table already exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'applicant_documents'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Creating applicant_documents table...');
      
      // Create the applicant_documents table
      await client.query(`
        CREATE TABLE applicant_documents (
          id SERIAL PRIMARY KEY,
          applicant_id INTEGER NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
          document_name TEXT NOT NULL,
          document_url TEXT NOT NULL,
          file_type TEXT,
          uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,
          verified_at TIMESTAMP,
          notes TEXT
        );
      `);
      
      // Create an index on applicant_id for faster lookups
      await client.query(`
        CREATE INDEX idx_applicant_documents_applicant_id ON applicant_documents(applicant_id);
      `);
      
      console.log('Applicant documents table created successfully');
    } else {
      console.log('Applicant documents table already exists, skipping creation');
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// For ESM, check if this is the main module
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  runMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default runMigration;