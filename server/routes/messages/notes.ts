import express from 'express';
import { storage } from '../../storage';
import { messageStorageService } from '../../services/message-storage-service';
import { onDemandMongoService } from '../../../adapters-repl/mongodb-ondemand/on-demand-mongodb';
import { hybridCacheService } from '../../services/hybrid-cache-service-v2';

import { z } from 'zod';

// On-demand MongoDB service management
async function startMongoDBOnDemand(): Promise<boolean> {
  console.log('🚀 Starting MongoDB on-demand service...');
  
  const result = await onDemandMongoService.ensureReady();
  
  if (result) {
    console.log('✅ MongoDB on-demand service started');
  } else {
    console.log('❌ MongoDB on-demand service failed to start');
  }
  
  return result;
}

// Sleep utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// MongoDB retry wrapper with on-demand service integration  
async function withMongoDBRetry<T>(operation: () => Promise<T>, maxRetries: number = 2): Promise<T> {
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

const router = express.Router();

// Middleware to ensure user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get all notes for authenticated user
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log(`✅ NOTES ROUTE HIT: GET /api/messaging/notes for user ${userId}`);
    
    // Try Redis cache first with session awareness
    const cacheKey = `user:${userId}:notes`;
    const sessionId = req.sessionID;
    console.log(`[NOTES] Attempting cache lookup for key: ${cacheKey}, session: ${sessionId.substring(0, 8)}`);
    
    let cachedNotes = null;
    try {
      console.log(`[NOTES] Starting Redis cache lookup with 9-second timeout...`);
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Redis cache operation timeout after 9 seconds'));
        }, 9000);
      });
      
      // Race cache operation against timeout
      const cachePromise = hybridCacheService.get(cacheKey, { 
        category: 'user-notes',
        connectionId: `notes-${userId}`,
        sessionId: sessionId
      });
      
      cachedNotes = await Promise.race([cachePromise, timeoutPromise]);
      console.log(`[NOTES] Cache service call completed, result: ${cachedNotes ? 'HIT' : 'MISS'}`);
    } catch (error: any) {
      if (error.message && error.message.includes('timeout')) {
        console.error(`[NOTES] 🚨 REDIS TIMEOUT: Cache operation failed after 9 seconds - ${error.message}`);
        console.log(`[NOTES] Falling back to direct database access due to Redis timeout`);
        
        // Set Redis failure flag for later header setting
        res.locals.redisFailure = true;
        res.locals.failureReason = 'Redis cache timeout after 9 seconds';
      } else {
        console.error(`[NOTES] Cache service error:`, error);
        res.locals.redisFailure = true;
        res.locals.failureReason = 'Redis cache service error';
      }
    }
    
    if (cachedNotes) {
      console.log(`🚀 Redis cache hit for user ${userId} notes, type: ${typeof cachedNotes}, length: ${Array.isArray(cachedNotes) ? cachedNotes.length : 'N/A'}`);
      
      // Add cache status headers for frontend debugging
      res.setHeader('X-Cache-Status', 'redis-hit');
      res.setHeader('X-Debug-Message', 'Notes loaded from Redis cache - no fallback needed');
      
      return res.json(cachedNotes);
    }
    
    console.log(`[NOTES] Cache miss for key: ${cacheKey}`);
    
    // Cache miss - fetch from database
    console.log('🔍 Using MessageService for hybrid retrieval with MongoDB retry');
    const messages = await withMongoDBRetry(() => messageStorageService.getNoteRefsByUser(userId));
    
    // Cache the results for 1 hour - notes don't change frequently
    console.log(`[NOTES] Attempting to cache ${messages.length} notes with key: ${cacheKey}`);
    try {
      console.log(`[NOTES] Starting Redis cache SET with 10-second timeout...`);
      
      // Create timeout promise for SET operation
      const setTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Redis cache SET timeout after 10 seconds'));
        }, 10000);
      });
      
      // Race SET operation against timeout
      const setCachePromise = hybridCacheService.set(cacheKey, messages, { 
        ttl: 3600,
        category: 'user-notes',
        connectionId: `notes-${userId}`,
        sessionId: sessionId
      });
      
      const cacheSuccess = await Promise.race([setCachePromise, setTimeoutPromise]);
      console.log(`[NOTES] Cache SET result: ${cacheSuccess ? 'SUCCESS' : 'FAILED'}`);
    } catch (cacheError: any) {
      if (cacheError.message && cacheError.message.includes('timeout')) {
        console.error(`[NOTES] 🚨 REDIS SET TIMEOUT: Cache SET operation failed after 10 seconds - ${cacheError.message}`);
        console.log(`[NOTES] Notes fetched successfully but Redis caching failed due to timeout`);
      } else {
        console.error(`[NOTES] Cache SET error:`, cacheError);
      }
    }
    
    console.log(`Fetched ${messages.length} notes for user ${userId} and cached`);
    
    // Add appropriate cache status headers based on Redis success/failure
    if (res.locals.redisFailure) {
      res.setHeader('X-Cache-Status', 'postgres-fallback');
      res.setHeader('X-Debug-Message', `Redis failed - fell back to PostgreSQL cache: ${res.locals.failureReason}`);
    } else {
      res.setHeader('X-Cache-Status', 'database-fetch');
      res.setHeader('X-Debug-Message', 'Fresh data fetched from database and cached successfully');
    }
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Create note for authenticated user
router.post('/', requireAuth, async (req: any, res) => {
  try {
    const messageSchema = z.object({
      content: z.string().max(10000),
      messageType: z.enum(['text', 'rich-text', 'system', 'notification']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      isPrivate: z.boolean().default(false),
      workflow: z.string().optional(),
      noteType: z.string().optional()
    });
    
    const validatedData = messageSchema.parse(req.body);
    const userId = req.user.id;
    
    const noteRefData = {
      content: validatedData.content,
      messageType: validatedData.messageType || 'rich-text',
      userId: userId,
      priority: validatedData.priority,
      isPrivate: validatedData.isPrivate,
      workflow: validatedData.workflow || 'general',
      noteType: validatedData.noteType || 'note'
    };
    
    const newMessage = await withMongoDBRetry(() => messageStorageService.createNoteRef(noteRefData));
    
    // Invalidate user's notes cache
    const cacheKey = `user:${userId}:notes`;
    await hybridCacheService.delete(cacheKey, { 
      category: 'user-notes',
      connectionId: `notes-${userId}` 
    });
    
    console.log(`Created note with hybrid storage for user ${userId} and invalidated cache`);
    res.status(201).json(newMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid note data', details: error.errors });
    }
    
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note for authenticated user
router.put('/:id', requireAuth, async (req: any, res) => {
  console.log('✅ NOTES ROUTE HIT: PUT /api/messaging/notes/:id started');
  console.log('- Route params:', req.params);
  console.log('- Request body:', req.body);
  
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user.id;
    const { content } = req.body;
    
    console.log('- Extracted values:', { messageId, userId, contentLength: content?.length });
    
    if (isNaN(messageId)) {
      console.log('❌ Note ID validation failed');
      return res.status(400).json({ error: 'Invalid note ID' });
    }
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.log('❌ Content validation failed');
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Verify note ownership
    const existingMessage = await storage.getNoteRef(messageId);
    if (!existingMessage || existingMessage.userId !== userId) {
      return res.status(404).json({ error: 'Note not found or not authorized' });
    }
    
    console.log('🔄 Using MessageService for hybrid update with MongoDB retry');
    
    let updatedMessage;
    try {
      updatedMessage = await withMongoDBRetry(() => messageStorageService.updateNoteRef(messageId, { content }));
    } catch (mongoError) {
      throw mongoError;
    }
    
    // Invalidate user's notes cache
    const cacheKey = `user:${userId}:notes`;
    await hybridCacheService.delete(cacheKey, { 
      category: 'user-notes',
      connectionId: `notes-${userId}` 
    });
    
    console.log(`Updated note ${messageId} with hybrid storage for user ${userId} and invalidated cache`);
    res.json(updatedMessage);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note for authenticated user
router.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user.id;
    
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }
    
    // Verify note ownership
    const existingMessage = await storage.getNoteRef(messageId);
    if (!existingMessage || existingMessage.userId !== userId) {
      return res.status(404).json({ error: 'Note not found or not authorized' });
    }
    
    // Use MessageService to delete note (PostgreSQL + MongoDB) with retry
    const deleted = await withMongoDBRetry(() => messageStorageService.deleteNoteRef(messageId));
    
    if (deleted) {
      // Invalidate user's notes cache
      const cacheKey = `user:${userId}:notes`;
      await hybridCacheService.delete(cacheKey, { 
        category: 'user-notes',
        connectionId: `notes-${userId}` 
      });
      
      console.log(`Deleted note ${messageId} with MongoDB cleanup for user ${userId} and invalidated cache`);
      res.json({ success: true, messageId });
    } else {
      res.status(500).json({ error: 'Failed to delete note' });
    }
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;