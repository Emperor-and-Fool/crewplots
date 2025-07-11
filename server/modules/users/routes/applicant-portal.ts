import express from 'express';
import { storage } from '../../../storage';
import { messageStorageService } from '../../messaging';


import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../../../db';
import { noteRefs as noteRefsTable } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// Helper function to sleep
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start MongoDB on-demand service
async function startMongoDBOnDemand(): Promise<void> {
  try {
    console.log('🚀 Starting MongoDB on-demand service...');
    await execAsync('bash mongo-proxy-server.js > /dev/null 2>&1 &');
    console.log('✅ MongoDB on-demand service started');
  } catch (error) {
    console.log('⚠️ MongoDB on-demand service start failed:', error);
  }
}

// MongoDB retry wrapper with explicit failure
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







/* MESSAGE ROUTES MOVED TO server/routes/notes.ts FOR REUSABILITY
// Get messages for applicant (using service layer)
router.get('/messages', isApplicant, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Use MessageService for proper hybrid retrieval
    console.log('🔍 Using MessageService for hybrid retrieval');
    const messages = await messageStorageService.getNoteRefsByUser(userId);
    
    console.log(`Fetched ${messages.length} messages for applicant user ${userId}`);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching applicant messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});
*/

/* CREATE MESSAGE ROUTE MOVED TO server/routes/notes.ts FOR REUSABILITY
// Create message for applicant (using service layer)
router.post('/messages', isApplicant, async (req: any, res) => {
  try {
    const messageSchema = z.object({
      content: z.string().max(10000), // Allow empty content for initial file creation
      messageType: z.enum(['text', 'rich-text', 'system', 'notification']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      isPrivate: z.boolean().default(false),
    });
    
    const validatedData = messageSchema.parse(req.body);
    const userId = req.user.id;
    
    // Use MessageService for hybrid metadata storage
    const noteRefData = {
      content: validatedData.content,
      messageType: validatedData.messageType || 'rich-text',
      userId: userId,
      priority: validatedData.priority,
      isPrivate: validatedData.isPrivate,
      workflow: 'application',
      noteType: 'motivation'
    };
    
    const newMessage = await messageStorageService.createNoteRef(noteRefData);
    
    console.log(`Created message with hybrid storage for applicant user ${userId}`);
    res.status(201).json(newMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid message data', details: error.errors });
    }
    
    console.error('Error creating applicant message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});
*/

/* UPDATE/DELETE MESSAGE ROUTES MOVED TO server/routes/notes.ts FOR REUSABILITY
// Update message for applicant (using service layer)
router.put('/messages/:id', isApplicant, async (req: any, res) => {
  console.log('📝 PUT /messages/:id started');
  console.log('- Route params:', req.params);
  console.log('- Request body:', req.body);
  
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user.id;
    const { content } = req.body;
    
    console.log('- Extracted values:', { messageId, userId, contentLength: content?.length });
    
    if (isNaN(messageId)) {
      console.log('❌ Message ID validation failed');
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.log('❌ Content validation failed');
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Use MessageService for proper hybrid ID handling
    console.log('🔄 Using MessageService for hybrid update');
    const updatedMessage = await messageStorageService.updateNoteRef(messageId, { content });
    
    console.log(`Updated message ${messageId} with hybrid storage for applicant user ${userId}`);
    res.json(updatedMessage);
  } catch (error) {
    console.error('Error updating applicant message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete message for applicant (using service layer)
router.delete('/messages/:id', isApplicant, async (req: any, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user.id;
    
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    // Verify message ownership through storage layer
    const existingMessage = await storage.getNoteRef(messageId);
    if (!existingMessage || existingMessage.userId !== userId) {
      return res.status(404).json({ error: 'Message not found or not authorized' });
    }
    
    // Use MessageService to delete message (PostgreSQL + MongoDB)
    const deleted = await messageStorageService.deleteNoteRef(messageId);
    
    if (deleted) {
      console.log(`Deleted message ${messageId} with MongoDB cleanup for applicant user ${userId}`);
      res.json({ success: true, messageId });
    } else {
      res.status(500).json({ error: 'Failed to delete message' });
    }
  } catch (error) {
    console.error('Error deleting applicant message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});
*/







export default router;