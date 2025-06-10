import { Router } from 'express';
import { z } from 'zod';
import { messagingService } from '../../services/messaging-service';
import { insertMessageSchema } from '@shared/schema';

const router = Router();

// Validation schemas
const createNoteSchema = insertMessageSchema.extend({
  content: z.string().min(1).max(1000),
  workflow: z.string(),
  visibleToRoles: z.array(z.string()).optional(),
});

// GET /api/messages/notes/:userId/:workflow - Get workflow-specific notes from a user
router.get('/:userId/:workflow', async (req, res) => {
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

    const notes = await messagingService.getNotesByWorkflow(userId, workflow, currentUserRole);
    
    console.log(`Fetched ${notes.length} ${workflow} notes from user ${userId} for role ${currentUserRole}`);
    
    res.json(notes);
  } catch (error) {
    console.error('Error fetching workflow notes:', error);
    res.status(500).json({ error: 'Failed to fetch workflow notes' });
  }
});

// GET /api/messages/notes/:userId/:workflow/count - Get count of workflow notes (for indicators)
router.get('/:userId/:workflow/count', async (req, res) => {
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

    const count = await messagingService.getNotesCountByWorkflow(userId, workflow, currentUserRole);
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching workflow notes count:', error);
    res.status(500).json({ error: 'Failed to fetch notes count' });
  }
});

// POST /api/messages/notes - Create a new note
router.post('/', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = createNoteSchema.parse(req.body);
    
    const noteData = {
      ...validatedData,
      receiverId: null, // Notes don't have receivers
      audienceId: 1, // Default audience
    };

    const createdNote = await messagingService.createNote(noteData);
    
    console.log(`Created note for user ${noteData.userId} in workflow ${noteData.workflow}`);
    
    res.status(201).json(createdNote);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid note data', details: error.errors });
    }
    
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

export default router;