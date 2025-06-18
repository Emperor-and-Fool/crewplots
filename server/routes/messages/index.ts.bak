import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth';
import notesRoutes from './notes';
// conversationsRoutes removed - conversations will be handled within messaging-system component
import { messagingService } from '../../services/messaging-service';
import { insertNoteRefSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Apply authentication middleware to all messaging routes
router.use(authenticateUser);

// Root messages endpoint - delegates to conversations for applicant users
router.get('/', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = (req.user as any).id;
    const receiverId = req.query.receiverId ? parseInt(req.query.receiverId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const messages = await messagingService.getConversationMessages(userId, receiverId, limit);
    
    console.log(`Fetched ${noteRefs.length} messages for user ${userId}`);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Root messages POST endpoint - creates conversation messages
router.post('/', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = insertNoteRefSchema.extend({
      content: z.string().min(1).max(1000),
      receiverId: z.number().optional(),
    }).parse(req.body);
    
    const userId = (req.user as any).id;
    
    const messageData = {
      ...validatedData,
      userId,
      audienceId: 1, // Default audience
      workflow: null, // Conversations don't have workflows
      visibleToRoles: null, // Conversations use different visibility logic
    };

    const createdMessage = await messagingService.createConversationMessage(messageData);
    
    console.log(`Created message from user ${userId}`);
    res.status(201).json(createdMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid message data', details: error.errors });
    }
    
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Mount sub-routes
router.use('/notes', notesRoutes);
// conversations routing removed - will be handled within messaging-system component

export default router;