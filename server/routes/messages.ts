import { Router } from 'express';
import { eq, and, desc, or, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { messages, insertMessageSchema } from '@shared/schema';
import type { InsertMessage, Message } from '@shared/schema';

const router = Router();

// Validation schemas
const createMessageSchema = insertMessageSchema.extend({
  content: z.string().min(1).max(1000),
});

const getMessagesQuerySchema = z.object({
  receiverId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  messageType: z.enum(['text', 'rich-text', 'system', 'notification']).optional(),
  isPrivate: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
});

// GET /api/messages - Fetch messages for user or applicant
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = getMessagesQuerySchema.parse(req.query);
    const userId = (req.user as any).id;

    // Build query conditions
    let whereConditions;

    if (query.receiverId) {
      // Get messages between user and specific receiver
      whereConditions = and(
        or(
          and(eq(messages.userId, userId), eq(messages.receiverId, query.receiverId)),
          and(eq(messages.userId, query.receiverId), eq(messages.receiverId, userId))
        ),
        or(
          eq(messages.userId, userId),
          eq(messages.isPrivate, false) // Include non-private messages from others
        )
      );
    } else {
      // Get user's general messages (sent or received)
      whereConditions = or(
        eq(messages.userId, userId),
        eq(messages.receiverId, userId)
      );
    }

    // Apply additional filters
    if (query.messageType) {
      whereConditions = and(whereConditions, eq(messages.messageType, query.messageType));
    }

    if (query.isPrivate !== undefined) {
      whereConditions = and(whereConditions, eq(messages.isPrivate, query.isPrivate));
    }

    const userMessages = await db
      .select()
      .from(messages)
      .where(whereConditions)
      .orderBy(desc(messages.createdAt))
      .limit(query.limit);

    console.log(`Fetched ${userMessages.length} messages for user ${userId}${query.receiverId ? ` (receiver: ${query.receiverId})` : ''}`);

    res.json(userMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages - Create a new message
router.post('/', async (req, res) => {
  try {
    if (!req.user || !(req.user as any).id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = createMessageSchema.parse(req.body);
    const userId = (req.user as any).id;

    // Ensure the message is associated with the authenticated user
    const messageData: InsertMessage = {
      ...validatedData,
      userId, // Override with authenticated user ID
    };

    const [newMessage] = await db
      .insert(messages)
      .values(messageData)
      .returning();

    console.log(`Created message ${newMessage.id} for user ${userId}${messageData.receiverId ? ` (receiver: ${messageData.receiverId})` : ''}`);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error creating message:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Failed to create message' });
  }
});

// GET /api/messages/:id - Get specific message
router.get('/:id', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const message = await db.query.messages.findFirst({
      where: and(
        eq(messages.id, messageId),
        or(
          eq(messages.userId, userId),
          eq(messages.isPrivate, false) // Allow access to non-private messages
        )
      ),
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// PUT /api/messages/:id/read - Mark message as read
router.put('/:id/read', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    // Only allow users to mark their own messages as read
    const [updatedMessage] = await db
      .update(messages)
      .set({ 
        isRead: true, 
        updatedAt: new Date() 
      })
      .where(and(
        eq(messages.id, messageId),
        eq(messages.userId, userId)
      ))
      .returning();

    if (!updatedMessage) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }

    console.log(`Marked message ${messageId} as read for user ${userId}`);
    res.json(updatedMessage);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// DELETE /api/messages/:id - Delete message (optional feature)
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    // Only allow users to delete their own messages
    const [deletedMessage] = await db
      .delete(messages)
      .where(and(
        eq(messages.id, messageId),
        eq(messages.userId, userId)
      ))
      .returning();

    if (!deletedMessage) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }

    console.log(`Deleted message ${messageId} for user ${userId}`);
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// GET /api/messages/notes/:userId/:workflow - Get workflow-specific notes from a user
router.get('/notes/:userId/:workflow', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = parseInt(req.params.userId);
    const workflow = req.params.workflow;
    const currentUserRole = (req.user as any).role;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get notes for this workflow where current user has permission to view
    const workflowNotes = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.userId, userId),
        eq(messages.workflow, workflow as any),
        isNull(messages.receiverId) // Only notes, not conversations
      ))
      .orderBy(desc(messages.createdAt));

    // Filter by role permissions
    const visibleNotes = workflowNotes.filter(note => {
      if (!note.visibleToRoles || note.visibleToRoles.length === 0) {
        return true; // No restrictions = visible to all
      }
      return note.visibleToRoles.includes(currentUserRole);
    });

    console.log(`Fetched ${visibleNotes.length} ${workflow} notes from user ${userId} for role ${currentUserRole}`);
    
    res.json(visibleNotes);
  } catch (error) {
    console.error('Error fetching workflow notes:', error);
    res.status(500).json({ error: 'Failed to fetch workflow notes' });
  }
});

// GET /api/messages/notes/:userId/:workflow/count - Get count of workflow notes (for indicators)
router.get('/notes/:userId/:workflow/count', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = parseInt(req.params.userId);
    const workflow = req.params.workflow;
    const currentUserRole = (req.user as any).role;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get count of visible notes for this workflow
    const workflowNotes = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.userId, userId),
        eq(messages.workflow, workflow as any),
        isNull(messages.receiverId)
      ));

    // Filter by role permissions
    const visibleCount = workflowNotes.filter(note => {
      if (!note.visibleToRoles || note.visibleToRoles.length === 0) {
        return true;
      }
      return note.visibleToRoles.includes(currentUserRole);
    }).length;

    res.json({ count: visibleCount });
  } catch (error) {
    console.error('Error fetching workflow notes count:', error);
    res.status(500).json({ error: 'Failed to fetch notes count' });
  }
});

export default router;