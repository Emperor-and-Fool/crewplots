import express from 'express';
import { storage } from '../storage';
import { messageService } from '../services/message-service';
import { withMongoDBRetry } from '../utils/replit-mongodb-ondemand';
import { z } from 'zod';

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
    
    // Use MessageService for proper hybrid retrieval
    console.log('🔍 Using MessageService for hybrid retrieval');
    const messages = await withMongoDBRetry(() => 
      messageService.getNoteRefsByUser(userId)
    );
    
    console.log(`Fetched ${messages.length} notes for user ${userId}`);
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
      documentType: z.string().optional()
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
      documentType: validatedData.documentType || 'note'
    };
    
    const newMessage = await withMongoDBRetry(() => 
      messageService.createNoteRef(noteRefData)
    );
    
    console.log(`Created note with hybrid storage for user ${userId}`);
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
    
    console.log('🔄 Using MessageService for hybrid update');
    const updatedMessage = await withMongoDBRetry(() => 
      messageService.updateNoteRef(messageId, { content })
    );
    
    console.log(`Updated note ${messageId} with hybrid storage for user ${userId}`);
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
    
    // Use MessageService to delete note (PostgreSQL + MongoDB)
    const deleted = await messageService.deleteNoteRef(messageId);
    
    if (deleted) {
      console.log(`Deleted note ${messageId} with MongoDB cleanup for user ${userId}`);
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