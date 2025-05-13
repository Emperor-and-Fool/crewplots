import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from '../storage';
import { documentAttachments, uploadedFiles } from '@shared/schema';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, and common document formats
    const allowedMimeTypes = [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and common document formats are allowed.') as any);
    }
  }
});

// Schema for attachment request
const attachmentSchema = z.object({
  entityType: z.enum(['applicant', 'staff', 'location', 'kb_article', 'cash_count']),
  entityId: z.number(),
});

// Upload a file
router.post('/', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Save file metadata to database
    const fileData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedBy: req.user!.id,
    };

    const uploadedFile = await storage.createUploadedFile(fileData);
    
    return res.status(201).json(uploadedFile);
  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ message: 'Error uploading file' });
  }
});

// Attach a file to an entity
router.post('/attach', authenticateUser, async (req, res) => {
  try {
    const validatedData = attachmentSchema.parse(req.body);
    
    if (!req.body.fileId) {
      return res.status(400).json({ message: 'No file ID provided' });
    }

    const fileId = parseInt(req.body.fileId);
    
    // Check if file exists
    const file = await storage.getUploadedFile(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Create attachment
    const attachmentData = {
      fileId,
      entityType: validatedData.entityType,
      entityId: validatedData.entityId,
    };
    
    const attachment = await storage.createDocumentAttachment(attachmentData);
    return res.status(201).json(attachment);
  } catch (error) {
    console.error('File attachment error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    return res.status(500).json({ message: 'Error attaching file' });
  }
});

// Get all files for an entity
router.get('/entity/:type/:id', authenticateUser, async (req, res) => {
  try {
    const entityType = req.params.type as 'applicant' | 'staff' | 'location' | 'kb_article' | 'cash_count';
    const entityId = parseInt(req.params.id);
    
    if (!entityType || isNaN(entityId)) {
      return res.status(400).json({ message: 'Invalid entity type or ID' });
    }
    
    const attachments = await storage.getDocumentAttachmentsByEntity(entityType, entityId);
    const fileIds = attachments.map(a => a.fileId);
    
    // Get file details for all attachments
    const files = await Promise.all(fileIds.map(id => storage.getUploadedFile(id)));
    
    return res.json(files.filter(Boolean)); // Filter out any nulls
  } catch (error) {
    console.error('Error fetching files:', error);
    return res.status(500).json({ message: 'Error fetching files' });
  }
});

// Get a specific file by ID
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ message: 'Invalid file ID' });
    }
    
    const file = await storage.getUploadedFile(fileId);
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Serve the file
    res.sendFile(file.path);
  } catch (error) {
    console.error('Error fetching file:', error);
    return res.status(500).json({ message: 'Error fetching file' });
  }
});

// Delete a file
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ message: 'Invalid file ID' });
    }
    
    const file = await storage.getUploadedFile(fileId);
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Delete all attachments for this file
    await storage.deleteDocumentAttachmentsByFile(fileId);
    
    // Delete file from storage
    await storage.deleteUploadedFile(fileId);
    
    // Delete the physical file
    fs.unlinkSync(file.path);
    
    return res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ message: 'Error deleting file' });
  }
});

export default router;