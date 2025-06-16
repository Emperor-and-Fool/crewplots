import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

// On-demand MongoDB service management
export async function startMongoDBOnDemand(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('🚀 Starting MongoDB on-demand service...');
    
    const mongoProcess = spawn('node', ['mongo-proxy-server.js'], {
      detached: true,
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    mongoProcess.unref();
    
    // Give MongoDB time to start
    setTimeout(() => {
      console.log('✅ MongoDB on-demand service started');
      resolve(true);
    }, 5000);
  });
}

// Retry MongoDB operation with on-demand service
export async function withMongoDBRetry<T>(operation: () => Promise<T>, maxRetries: number = 2): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a MongoDB connection error
      const isConnectionError = error?.message?.includes('ECONNREFUSED') || 
                               error?.code === 'ECONNREFUSED' ||
                               error?.cause?.code === 'ECONNREFUSED';
      
      if (isConnectionError && attempt < maxRetries) {
        console.log(`🔄 MongoDB connection failed (attempt ${attempt + 1}/${maxRetries + 1}), starting on-demand service...`);
        
        await startMongoDBOnDemand();
        
        // Wait before retry
        await sleep(3000);
        console.log(`⏳ Retrying MongoDB operation...`);
        continue;
      }
      
      // If it's not a connection error or we've exhausted retries, throw the error
      throw error;
    }
  }
  
  throw lastError;
}