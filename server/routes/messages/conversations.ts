import { Router } from 'express';
import { z } from 'zod';
import { messagingService } from '../../services/messaging-service';
import { insertNoteRefSchema } from '@shared/schema';

const router = Router();

// Validation schemas
const createConversationMessageSchema = insertNoteRefSchema.extend({
  content: z.string().min(1).max(1000),
  receiverId: z.number().optional(),
});

const getConversationQuerySchema = z.object({
  receiverId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
});

// GET /api/messages/conversations - Fetch conversation messages
router.get('/', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = getConversationQuerySchema.parse(req.query);
    const userId = (req.user as any).id;

    const messages = await messagingService.getConversationMessages(
      userId, 
      query.receiverId, 
      query.limit
    );

    console.log(`Fetched ${messages.length} conversation messages for user ${userId}`);
    
    res.json(messages);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ error: 'Failed to fetch conversation messages' });
  }
});

// POST /api/messages/conversations - Create a new conversation message
router.post('/', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = createConversationMessageSchema.parse(req.body);
    const userId = (req.user as any).id;
    
    const messageData = {
      ...validatedData,
      userId,
      audienceId: 1, // Default audience
      workflow: null, // Conversations don't have workflows
      visibleToRoles: null, // Conversations use different visibility logic
    };

    const createdMessage = await messagingService.createConversationMessage(messageData);
    
    console.log(`Created conversation message from user ${userId} to ${messageData.receiverId || 'general'}`);
    
    res.status(201).json(createdMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid message data', details: error.errors });
    }
    
    console.error('Error creating conversation message:', error);
    res.status(500).json({ error: 'Failed to create conversation message' });
  }
});

// GET /api/messages/conversations/:messageId - Get specific message
router.get('/:messageId', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const message = await messagingService.getNoteRefById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// PUT route removed to prevent conflict with applicant-portal routing
// Conversation message updates now handled through dedicated conversation endpoints

// DELETE /api/messages/conversations/:messageId - Delete a conversation message
router.delete('/:messageId', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const deleted = await messagingService.deleteNoteRef(messageId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found' });
    }

    console.log(`Deleted conversation message ${messageId}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;