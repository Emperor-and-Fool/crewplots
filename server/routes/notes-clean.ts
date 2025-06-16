import express from 'express';
import { messageService } from '../services/message-service';
import { withMongoDBRetry } from '../utils/replit-mongodb-ondemand';
import { z } from 'zod';

const router = express.Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

router.get('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const messages = await withMongoDBRetry(() => 
      messageService.getNoteRefsByUser(userId)
    );
    res.json(messages);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

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
    
    const newMessage = await withMongoDBRetry(() => 
      messageService.createNoteRef(userId, validatedData)
    );
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/:id', requireAuth, async (req: any, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    const updatedMessage = await withMongoDBRetry(() => 
      messageService.updateNoteRef(messageId, userId, { content })
    );

    if (!updatedMessage) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user.id;
    
    const deleted = await withMongoDBRetry(() => 
      messageService.deleteNoteRef(messageId, userId)
    );

    if (!deleted) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;