import { Router } from 'express';
import { mongoConnection } from '../db-mongo';
import { ObjectId } from 'mongodb';

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
    
    if (!document) {
      return res.status(500).json({ error: 'Failed to retrieve created document' });
    }
    
    // Transform MongoDB document to frontend-expected format
    const responseDocument = {
      ...document,
      id: document._id.toString(), // Convert ObjectId to string for frontend
      _id: undefined // Remove MongoDB-specific field
    };
    delete responseDocument._id;
    
    res.status(201).json(responseDocument);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update an existing document
router.put('/notes/:noteId', async (req, res) => {
  try {
    const { content } = req.body;
    const documentId = req.params.documentId;
    
    console.log('PUT /documents/:documentId - Debug Info:');
    console.log('- documentId received:', documentId);
    console.log('- documentId type:', typeof documentId);
    console.log('- documentId length:', documentId?.length);
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

    console.log('- ObjectId.isValid check:', ObjectId.isValid(documentId));
    if (!ObjectId.isValid(documentId)) {
      console.log('❌ ObjectId validation failed');
      return res.status(400).json({ error: 'Invalid document ID' });
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

    // Return the updated document with frontend-expected format
    const updatedDocument = await collection.findOne({ _id: new ObjectId(documentId) });
    
    if (!updatedDocument) {
      return res.status(404).json({ error: 'Document not found after update' });
    }
    
    // Transform MongoDB document to frontend-expected format
    const responseDocument = {
      ...updatedDocument,
      id: updatedDocument._id.toString(), // Convert ObjectId to string for frontend
      _id: undefined // Remove MongoDB-specific field
    };
    delete responseDocument._id;
    
    res.json(responseDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete all documents for a user (cleanup endpoint)
router.delete('/documents/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Only allow users to delete their own documents
    if ((req.user as any).id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await withMongoDBRetry(async () => {
      const db = mongoConnection.getDatabase();
      const collection = db.collection<MotivationDocument>('motivation_documents');
      
      return await collection.deleteMany({ userId });
    });
    
    console.log(`Deleted ${result.deletedCount} documents for user ${userId}`);
    res.json({ message: `Deleted ${result.deletedCount} documents`, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting documents:', error);
    res.status(500).json({ error: 'Failed to delete documents' });
  }
});

// Delete a specific document by ID
router.delete('/documents/:documentId', async (req, res) => {
  try {
    const documentId = req.params.documentId;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const result = await withMongoDBRetry(async () => {
      const db = mongoConnection.getDatabase();
      const collection = db.collection<MotivationDocument>('motivation_documents');
      
      // First check if the document belongs to the authenticated user
      const document = await collection.findOne({ _id: new ObjectId(documentId) });
      if (!document) {
        throw new Error('Document not found');
      }
      
      if (document.userId !== (req.user as any).id) {
        throw new Error('Unauthorized - document belongs to another user');
      }
      
      return await collection.deleteOne({ _id: new ObjectId(documentId) });
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    console.log(`Deleted document ${documentId}`);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('Unauthorized')) {
      return res.status(403).json({ error: errorMessage });
    }
    if (errorMessage.includes('not found')) {
      return res.status(404).json({ error: errorMessage });
    }
    res.status(500).json({ error: 'Failed to delete document' });
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