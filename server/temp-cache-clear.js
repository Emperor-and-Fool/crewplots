// Temporary script to clear specific cache key
import { hybridCacheService } from './services/hybrid-cache-service-v2.js';

async function clearCache() {
  try {
    console.log('Clearing cache key: user:5:notes');
    await hybridCacheService.delete('user:5:notes', { 
      category: 'user-notes',
      connectionId: 'notes-5' 
    });
    console.log('Cache cleared successfully');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
  process.exit(0);
}

clearCache();