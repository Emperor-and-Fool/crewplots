import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { documentService } from '../services/document-service';

const router = Router();

// Configure multer for file uploads (memory storage for encryption)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

// Validation schemas
const uploadDocumentSchema = z.object({
  userId: z.string().transform(val => parseInt(val)),
  documentType: z.enum(['id_card', 'passport', 'resume', 'reference', 'contract', 'other']),
  tags: z.string().optional().transform(val => val ? val.split(',').map(t => t.trim()) : [])
});

// POST /api/documents/upload - Upload sensitive document
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const validatedData = uploadDocumentSchema.parse(req.body);
    
    // Store encrypted document in MongoDB
    const documentRef = await documentService.storeDocument(req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size,
      userId: validatedData.userId,
      documentType: validatedData.documentType,
      tags: validatedData.tags
    });

    console.log(`Uploaded encrypted document for user ${validatedData.userId}: ${req.file.originalname}`);
    
    res.status(201).json(documentRef);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid upload data', details: error.errors });
    }
    
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// GET /api/documents/:documentId - Download document
router.get('/:documentId', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const documentId = req.params.documentId;
    const currentUserRole = (req.user as any).role;
    
    // Get document metadata first for permission check
    const metadata = await documentService.getDocumentMetadata(documentId);
    if (!metadata) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Permission check: only managers/admins or document owner can access
    const userId = (req.user as any).id;
    const canAccess = 
      metadata.userId === userId || 
      ['manager', 'administrator'].includes(currentUserRole);
    
    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Retrieve and decrypt document
    const document = await documentService.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.set({
      'Content-Type': document.metadata.contentType,
      'Content-Disposition': `attachment; filename="${document.metadata.filename}"`
    });
    
    res.send(document.buffer);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// GET /api/documents/user/:userId - Get user's document list
router.get('/user/:userId', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = parseInt(req.params.userId);
    const currentUserRole = (req.user as any).role;
    const currentUserId = (req.user as any).id;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Permission check
    const canAccess = 
      userId === currentUserId || 
      ['manager', 'administrator'].includes(currentUserRole);
    
    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const documentType = req.query.type as string | undefined;
    const documents = await documentService.getUserDocuments(userId, documentType);
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// DELETE /api/documents/:documentId - Delete document
router.delete('/:documentId', async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const documentId = req.params.documentId;
    const currentUserRole = (req.user as any).role;
    
    // Get document metadata for permission check
    const metadata = await documentService.getDocumentMetadata(documentId);
    if (!metadata) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Permission check: only managers/admins or document owner can delete
    const userId = (req.user as any).id;
    const canDelete = 
      metadata.userId === userId || 
      ['manager', 'administrator'].includes(currentUserRole);
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const deleted = await documentService.deleteDocument(documentId);
    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log(`Deleted document ${documentId} by user ${userId}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;