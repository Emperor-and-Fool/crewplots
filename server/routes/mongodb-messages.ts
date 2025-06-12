import { Router } from 'express';
import { mongoConnection } from '../db-mongo';
import { ObjectId } from 'mongodb';
import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

const router = Router();

// On-demand MongoDB service management
async function startMongoDBOnDemand(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('🚀 Starting MongoDB on-demand service...');
    
    const mongoProcess = spawn('node', ['mongo-proxy-server.js'], {
      detached: true,
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    mongoProcess.unref();
    
    // Give MongoDB time to start
    setTimeout(() => {
      console.log('✅ MongoDB on-demand service started');
      resolve(true);
    }, 5000);
  });
}

// Retry MongoDB operation with on-demand service
async function withMongoDBRetry<T>(operation: () => Promise<T>, maxRetries: number = 2): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a MongoDB connection error
      const isConnectionError = error?.message?.includes('ECONNREFUSED') || 
                               error?.code === 'ECONNREFUSED' ||
                               error?.cause?.code === 'ECONNREFUSED';
      
      if (isConnectionError && attempt < maxRetries) {
        console.log(`🔄 MongoDB connection failed (attempt ${attempt + 1}/${maxRetries + 1}), starting on-demand service...`);
        
        await startMongoDBOnDemand();
        
        // Wait before retry
        await sleep(3000);
        console.log(`⏳ Retrying MongoDB operation...`);
        continue;
      }
      
      // If it's not a connection error or we've exhausted retries, throw the error
      throw error;
    }
  }
  
  throw lastError;
}

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

    const documents = await withMongoDBRetry(async () => {
      const db = mongoConnection.getDatabase();
      const collection = db.collection<MotivationDocument>('motivation_documents');
      
      return await collection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
    });
    
    // Transform MongoDB documents to frontend-expected format
    const responseDocuments = documents.map(doc => ({
      ...doc,
      id: doc._id.toString(), // Convert ObjectId to string for frontend
      _id: undefined // Remove MongoDB-specific field
    })).map(({ _id, ...doc }) => doc); // Clean removal of _id
    
    res.json(responseDocuments);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Create or update motivation document (upsert for single document per user)
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

    const db = mongoConnection.getDatabase();
    const collection = db.collection<MotivationDocument>('motivation_documents');
    
    // Use upsert to update existing document or create new one (one document per user)
    const updateData = {
      userId,
      userPublicId,
      content,
      documentType,
      updatedAt: new Date(),
      metadata: {
        wordCount,
        characterCount,
        htmlLength
      }
    };

    const result = await collection.updateOne(
      { userId, documentType }, // Find by userId and documentType
      { 
        $set: updateData,
        $setOnInsert: { createdAt: new Date() } // Only set createdAt on insert
      },
      { upsert: true } // Create if doesn't exist, update if exists
    );
    
    // Return the updated/created document
    const document = await collection.findOne({ userId, documentType });
    
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
      userId: (req.user as any).id 
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

    // Return the updated document with frontend-expected format
    const updatedDocument = await collection.findOne({ _id: new ObjectId(documentId) });
    
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
      userId: (req.user as any).id 
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