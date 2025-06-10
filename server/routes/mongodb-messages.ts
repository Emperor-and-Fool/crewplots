import { Router } from 'express';
import { mongoConnection } from '../db-mongo';
import { ObjectId } from 'mongodb';

const router = Router();

// Interface for motivation documents stored in MongoDB
interface MotivationDocument {
  _id?: ObjectId;
  userId: number;
  userPublicId: string;
  content: string;
  documentType: 'motivation' | 'bio' | 'note';
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    wordCount: number;
    characterCount: number;
    htmlLength: number;
  };
}

// Get all motivation documents for a user
router.get('/documents/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (!req.isAuthenticated() || (req.user as any)?.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const db = mongoConnection.getDatabase();
    const collection = db.collection<MotivationDocument>('motivation_documents');
    
    const documents = await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Create a new motivation document
router.post('/documents', async (req, res) => {
  try {
    const { content, documentType = 'motivation' } = req.body;
    
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

    const document: MotivationDocument = {
      userId,
      userPublicId,
      content,
      documentType,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        wordCount,
        characterCount,
        htmlLength
      }
    };

    const db = mongoConnection.getDatabase();
    const collection = db.collection<MotivationDocument>('motivation_documents');
    
    const result = await collection.insertOne(document);
    
    // Return the created document with the generated _id
    const createdDocument = await collection.findOne({ _id: result.insertedId });
    
    res.status(201).json(createdDocument);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update an existing document
router.put('/documents/:documentId', async (req, res) => {
  try {
    const { content } = req.body;
    const documentId = req.params.documentId;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const db = mongoConnection.getDatabase();
    const collection = db.collection<MotivationDocument>('motivation_documents');
    
    // First, verify the document belongs to the authenticated user
    const existingDoc = await collection.findOne({ 
      _id: new ObjectId(documentId),
      userId: req.user.id 
    });
    
    if (!existingDoc) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
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
      { _id: new ObjectId(documentId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Return the updated document
    const updatedDocument = await collection.findOne({ _id: new ObjectId(documentId) });
    res.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete a document
router.delete('/documents/:documentId', async (req, res) => {
  try {
    const documentId = req.params.documentId;
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const db = mongoConnection.getDatabase();
    const collection = db.collection<MotivationDocument>('motivation_documents');
    
    // Verify the document belongs to the authenticated user before deleting
    const result = await collection.deleteOne({ 
      _id: new ObjectId(documentId),
      userId: req.user.id 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;