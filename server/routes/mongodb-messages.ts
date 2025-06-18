import { Router } from 'express';
import { mongoConnection } from '../db-mongo';
import { ObjectId } from 'mongodb';

// MongoDB retry wrapper function
async function withMongoDBRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.log(`🔄 MongoDB operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Maximum retries exceeded');
}

const router = Router();

// Interface for notes stored in MongoDB
interface NoteDocument {
  _id?: ObjectId;
  userId: number;
  userPublicId: string;
  content: string;
  noteType: 'motivation' | 'bio' | 'note';
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    wordCount: number;
    characterCount: number;
    htmlLength: number;
  };
}

// Get all notes for a user
router.get('/notes/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Debug authentication state
    console.log('MongoDB auth check:', {
      isAuthenticated: req.isAuthenticated(),
      userId: userId,
      reqUserId: (req.user as any)?.id,
      userMatch: (req.user as any)?.id === userId
    });
    
    if (!req.isAuthenticated() || (req.user as any)?.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const notes = await withMongoDBRetry(async () => {
      const db = mongoConnection.getDatabase();
      const collection = db.collection<NoteDocument>('notes_documents');
      
      return await collection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
    });
    
    // Transform MongoDB notes to frontend-expected format
    const responseNotes = notes.map(note => ({
      ...note,
      id: note._id.toString(), // Convert ObjectId to string for frontend
      _id: undefined // Remove MongoDB-specific field
    })).map(({ _id, ...note }) => note); // Clean removal of _id
    
    res.json(responseNotes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Create or update note (upsert for single note per user)
router.post('/notes', async (req, res) => {
  try {
    const { content, noteType = 'motivation' } = req.body;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const userId = (req.user as any).id;
    const userPublicId = (req.user as any).public_id || (req.user as any).username;

    // Calculate metadata
    const plainText = content.replace(/<[^>]*>/g, ''); // Strip HTML for word count
    const wordCount = plainText.trim().split(/\s+/).length;
    const characterCount = plainText.length;
    const htmlLength = content.length;

    const db = mongoConnection.getDatabase();
    const collection = db.collection<NoteDocument>('notes_documents');
    
    // Use upsert to update existing note or create new one (one note per user)
    const updateData = {
      userId,
      userPublicId,
      content,
      noteType,
      updatedAt: new Date(),
      metadata: {
        wordCount,
        characterCount,
        htmlLength
      }
    };

    const result = await collection.updateOne(
      { userId, noteType }, // Find by userId and noteType
      { 
        $set: updateData,
        $setOnInsert: { createdAt: new Date() } // Only set createdAt on insert
      },
      { upsert: true } // Create if doesn't exist, update if exists
    );
    
    // Return the updated/created document
    const note = await collection.findOne({ userId, noteType });
    
    if (!note) {
      return res.status(500).json({ error: 'Failed to retrieve created note' });
    }
    
    // Transform MongoDB note to frontend-expected format
    const responseNote = {
      ...note,
      id: note._id?.toString(), // Convert ObjectId to string for frontend
      _id: undefined // Remove MongoDB-specific field
    };
    delete responseNote._id;
    
    res.status(201).json(responseNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update an existing note
router.put('/notes/:noteId', async (req, res) => {
  try {
    const { content } = req.body;
    const noteId = req.params.noteId;
    
    console.log('PUT /notes/:noteId - Debug Info:');
    console.log('- noteId received:', noteId);
    console.log('- noteId type:', typeof noteId);
    console.log('- noteId length:', noteId?.length);
    console.log('- content received:', content);
    console.log('- isAuthenticated:', req.isAuthenticated());
    console.log('- user:', req.user);
    
    if (!req.isAuthenticated()) {
      console.log('❌ Authentication failed');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!content || content.trim().length === 0) {
      console.log('❌ Content validation failed');
      return res.status(400).json({ error: 'Content is required' });
    }

    console.log('- ObjectId.isValid check:', ObjectId.isValid(noteId));
    if (!ObjectId.isValid(noteId)) {
      console.log('❌ ObjectId validation failed');
      return res.status(400).json({ error: 'Invalid note ID' });
    }

    const db = mongoConnection.getDatabase();
    const collection = db.collection<NoteDocument>('notes_documents');
    
    // First, verify the note belongs to the authenticated user
    const existingNote = await collection.findOne({ 
      _id: new ObjectId(noteId),
      userId: (req.user as any).id 
    });
    
    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }

    // Calculate updated metadata
    const plainText = content.replace(/<[^>]*>/g, '');
    const wordCount = plainText.trim().split(/\s+/).length;
    const characterCount = plainText.length;
    const htmlLength = content.length;

    const updateData = {
      content,
      updatedAt: new Date(),
      metadata: {
        wordCount,
        characterCount,
        htmlLength
      }
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(noteId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Return the updated note with frontend-expected format
    const updatedNote = await collection.findOne({ _id: new ObjectId(noteId) });
    
    if (!updatedNote) {
      return res.status(404).json({ error: 'Note not found after update' });
    }
    
    // Transform MongoDB note to frontend-expected format
    const responseNote = {
      ...updatedNote,
      id: updatedNote._id?.toString(), // Convert ObjectId to string for frontend
      _id: undefined // Remove MongoDB-specific field
    };
    delete responseNote._id;
    
    res.json(responseNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete all notes for a user (cleanup endpoint)
router.delete('/notes/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Only allow users to delete their own notes
    if ((req.user as any).id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await withMongoDBRetry(async () => {
      const db = mongoConnection.getDatabase();
      const collection = db.collection<NoteDocument>('notes_documents');
      
      return await collection.deleteMany({ userId });
    });
    
    console.log(`Deleted ${result.deletedCount} notes for user ${userId}`);
    res.json({ message: `Deleted ${result.deletedCount} notes`, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting notes:', error);
    res.status(500).json({ error: 'Failed to delete notes' });
  }
});

// Delete a specific note by ID
router.delete('/notes/:noteId', async (req, res) => {
  try {
    const noteId = req.params.noteId;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!ObjectId.isValid(noteId)) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }

    const result = await withMongoDBRetry(async () => {
      const db = mongoConnection.getDatabase();
      const collection = db.collection<NoteDocument>('notes_documents');
      
      // First check if the note belongs to the authenticated user
      const note = await collection.findOne({ _id: new ObjectId(noteId) });
      if (!note) {
        throw new Error('Note not found');
      }
      
      if (note.userId !== (req.user as any).id) {
        throw new Error('Unauthorized - note belongs to another user');
      }
      
      return await collection.deleteOne({ _id: new ObjectId(noteId) });
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    console.log(`Deleted note ${noteId}`);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('Unauthorized')) {
      return res.status(403).json({ error: errorMessage });
    }
    if (errorMessage.includes('not found')) {
      return res.status(404).json({ error: errorMessage });
    }
    res.status(500).json({ error: 'Failed to delete note' });
  }
});


// Quick cleanup endpoint - delete all notes (development only)
router.delete('/notes/cleanup/all', async (req, res) => {
  try {
    const result = await withMongoDBRetry(async () => {
      const db = mongoConnection.getDatabase();
      const collection = db.collection<NoteDocument>('notes_documents');
      
      return await collection.deleteMany({});
    });
    
    console.log(`Cleanup: Deleted ${result.deletedCount} notes`);
    res.json({ 
      message: `Cleanup completed: Deleted ${result.deletedCount} notes`, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup notes' });
  }
});

export default router;