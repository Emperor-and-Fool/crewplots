import express from 'express';
import { notesService } from '../services/notes-service';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createNoteSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  applicantId: z.number().optional(),
  workflow: z.string().default('application'),
  isPrivate: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

const updateNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').optional(),
  isPrivate: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional()
});

// Middleware to ensure user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user || !req.user.id) {
    console.log('DEBUG: Unauthorized access attempt to notes API');
    return res.status(401).json({ error: 'Authentication required' });
  }
  console.log('DEBUG: Authenticated user accessing notes API:', req.user.username);
  next();
};

// Create a new note
router.post('/', requireAuth, async (req: any, res) => {
  try {
    console.log('DEBUG: Creating new note for user:', req.user.id);
    
    const validatedData = createNoteSchema.parse(req.body);
    
    const noteData = {
      userId: req.user.id,
      content: validatedData.content,
      applicantId: validatedData.applicantId,
      workflow: validatedData.workflow,
      isPrivate: validatedData.isPrivate,
      priority: validatedData.priority,
      messageType: 'note'
    };

    const createdNote = await notesService.createNote(noteData);
    
    console.log('DEBUG: Note created successfully with ID:', createdNote.id);
    res.status(201).json(createdNote);
    
  } catch (error) {
    console.error('ERROR: Failed to create note:', error);
    
    if (error.message?.includes('MongoDB storage not available')) {
      return res.status(503).json({ 
        error: 'MongoDB storage required for notes is currently unavailable',
        details: error.message
      });
    }
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Get notes for current user
router.get('/my-notes', requireAuth, async (req: any, res) => {
  try {
    console.log('DEBUG: Fetching notes for user:', req.user.id);
    
    const userNotes = await notesService.getNotesForUser(req.user.id);
    
    console.log('DEBUG: Successfully retrieved', userNotes.length, 'notes for user:', req.user.id);
    res.json(userNotes);
    
  } catch (error) {
    console.error('ERROR: Failed to fetch user notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Get notes for a specific applicant (admin/manager only)
router.get('/applicant/:applicantId', requireAuth, async (req: any, res) => {
  try {
    const applicantId = parseInt(req.params.applicantId);
    
    if (isNaN(applicantId)) {
      return res.status(400).json({ error: 'Invalid applicant ID' });
    }
    
    // Check permissions - only admin/manager can view applicant notes
    if (!['administrator', 'manager'].includes(req.user.role)) {
      console.log('DEBUG: Unauthorized attempt to access applicant notes by user:', req.user.id, 'role:', req.user.role);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    console.log('DEBUG: Fetching notes for applicant:', applicantId, 'by user:', req.user.id);
    
    const applicantNotes = await notesService.getNotesForApplicant(applicantId);
    
    console.log('DEBUG: Successfully retrieved', applicantNotes.length, 'notes for applicant:', applicantId);
    res.json(applicantNotes);
    
  } catch (error) {
    console.error('ERROR: Failed to fetch applicant notes:', error);
    res.status(500).json({ error: 'Failed to fetch applicant notes' });
  }
});

// Get a specific note
router.get('/:id', requireAuth, async (req: any, res) => {
  try {
    const noteId = parseInt(req.params.id);
    
    if (isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }
    
    console.log('DEBUG: Fetching note with ID:', noteId);
    
    const note = await notesService.getNote(noteId);
    
    if (!note) {
      console.log('DEBUG: Note not found:', noteId);
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check permissions - users can only view their own notes unless admin/manager
    if (note.userId !== req.user.id && !['administrator', 'manager'].includes(req.user.role)) {
      console.log('DEBUG: Unauthorized access attempt to note:', noteId, 'by user:', req.user.id);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log('DEBUG: Successfully retrieved note:', noteId);
    res.json(note);
    
  } catch (error) {
    console.error('ERROR: Failed to fetch note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// Update a note
router.put('/:id', requireAuth, async (req: any, res) => {
  try {
    const noteId = parseInt(req.params.id);
    
    if (isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }
    
    console.log('DEBUG: Updating note with ID:', noteId);
    
    const validatedData = updateNoteSchema.parse(req.body);
    
    // Check if note exists and user has permission
    const existingNote = await notesService.getNote(noteId);
    
    if (!existingNote) {
      console.log('DEBUG: Note not found for update:', noteId);
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check permissions
    if (existingNote.userId !== req.user.id && !['administrator', 'manager'].includes(req.user.role)) {
      console.log('DEBUG: Unauthorized update attempt on note:', noteId, 'by user:', req.user.id);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updatedNote = await notesService.updateNote(noteId, validatedData);
    
    if (!updatedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    console.log('DEBUG: Note updated successfully:', noteId);
    res.json(updatedNote);
    
  } catch (error) {
    console.error('ERROR: Failed to update note:', error);
    
    if (error.message?.includes('MongoDB storage not available')) {
      return res.status(503).json({ 
        error: 'MongoDB storage required for note updates is currently unavailable',
        details: error.message
      });
    }
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete a note
router.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    const noteId = parseInt(req.params.id);
    
    if (isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }
    
    console.log('DEBUG: Deleting note with ID:', noteId);
    
    // Check if note exists and user has permission
    const existingNote = await notesService.getNote(noteId);
    
    if (!existingNote) {
      console.log('DEBUG: Note not found for deletion:', noteId);
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check permissions
    if (existingNote.userId !== req.user.id && !['administrator', 'manager'].includes(req.user.role)) {
      console.log('DEBUG: Unauthorized delete attempt on note:', noteId, 'by user:', req.user.id);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const deleted = await notesService.deleteNote(noteId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    console.log('DEBUG: Note deleted successfully:', noteId);
    res.json({ message: 'Note deleted successfully' });
    
  } catch (error) {
    console.error('ERROR: Failed to delete note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Get note count for an applicant
router.get('/applicant/:applicantId/count', requireAuth, async (req: any, res) => {
  try {
    const applicantId = parseInt(req.params.applicantId);
    
    if (isNaN(applicantId)) {
      return res.status(400).json({ error: 'Invalid applicant ID' });
    }
    
    console.log('DEBUG: Getting note count for applicant:', applicantId);
    
    const applicantNotes = await notesService.getNotesForApplicant(applicantId);
    const count = applicantNotes.length;
    
    console.log('DEBUG: Note count for applicant', applicantId, ':', count);
    res.json({ count });
    
  } catch (error) {
    console.error('ERROR: Failed to get note count:', error);
    res.status(500).json({ error: 'Failed to get note count' });
  }
});

export default router;