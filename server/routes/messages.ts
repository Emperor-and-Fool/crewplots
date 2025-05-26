import { Router } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { storage } from '../storage';
import { insertMessageSchema, type Message } from '@shared/schema';

const router = Router();

// Authentication middleware to ensure user is logged in
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get messages for a user or applicant
router.get('/:identifier?', requireAuth, async (req: any, res) => {
  try {
    const identifier = req.params.identifier;
    const userId = req.user.id;
    
    let messages: Message[];
    
    if (identifier && !isNaN(Number(identifier))) {
      // If identifier is provided and is a number, treat it as applicantId
      const applicantId = Number(identifier);
      messages = await storage.getMessagesByApplicant(applicantId);
    } else {
      // Otherwise get messages for the current user
      messages = await storage.getMessagesByUser(userId);
    }
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create a new message
router.post('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Validate the request body
    const messageData = insertMessageSchema.parse({
      ...req.body,
      userId, // Ensure userId comes from authenticated user
    });
    
    // Validate applicantId if provided
    if (messageData.applicantId) {
      const applicant = await storage.getApplicant(messageData.applicantId);
      if (!applicant) {
        return res.status(404).json({ error: 'Applicant not found' });
      }
    }
    
    // Create the message
    const message = await storage.createMessage(messageData);
    
    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Mark message as read
router.patch('/:messageId/read', requireAuth, async (req: any, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const userId = req.user.id;
    
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    // Get the message to verify ownership/access
    const message = await storage.getMessage(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Only allow marking as read if user has access to the message
    const hasAccess = message.userId === userId || 
                     (message.applicantId && await storage.userHasAccessToApplicant(userId, message.applicantId));
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updatedMessage = await storage.updateMessage(messageId, { isRead: true });
    
    res.json(updatedMessage);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete a message (if allowed)
router.delete('/:messageId', requireAuth, async (req: any, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const userId = req.user.id;
    
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    // Get the message to verify ownership
    const message = await storage.getMessage(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Only allow deletion by message owner
    if (message.userId !== userId) {
      return res.status(403).json({ error: 'Only message author can delete messages' });
    }
    
    await storage.deleteMessage(messageId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;