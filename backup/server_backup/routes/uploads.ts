import express from 'express';
import multer from 'multer';
import { storage } from '../storage';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateUser, checkRole } from '../middleware/auth';

const router = express.Router();

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images, PDFs, and common document types
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PowerPoint
    'text/plain', 'text/csv'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};

// Setup multer upload
const upload = multer({
  storage: fileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Upload a file
router.post('/upload', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get user info from request
    const { user } = req;

    // Save file info to database
    const fileData = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: user.id,
    };

    const uploadedFile = await storage.createUploadedFile(fileData);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: uploadedFile
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

// Get file by ID
router.get('/file/:id', authenticateUser, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await storage.getUploadedFile(fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // You can add access control logic here if needed

    res.status(200).json({ file });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Error getting file' });
  }
});

// Attach a document to an entity (e.g., an applicant, staff member, location)
router.post('/attach/:entityType/:entityId', authenticateUser, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { fileId, description } = req.body;

    if (!fileId) {
      return res.status(400).json({ message: 'File ID is required' });
    }

    // Create document attachment
    const attachment = await storage.createDocumentAttachment({
      fileId: parseInt(fileId),
      entityType,
      entityId: parseInt(entityId),
      description: description || null,
    });

    res.status(201).json({
      message: 'Document attached successfully',
      attachment
    });
  } catch (error) {
    console.error('Document attachment error:', error);
    res.status(500).json({ message: 'Error attaching document' });
  }
});

// Get documents for an entity
router.get('/documents/:entityType/:entityId', authenticateUser, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const attachments = await storage.getDocumentAttachmentsByEntity(entityType, parseInt(entityId));
    
    // Add file info to each attachment
    const documentsWithFiles = await Promise.all(attachments.map(async (a) => {
      return {
        ...a,
        file: await storage.getUploadedFile(a.fileId)
      };
    }));

    res.status(200).json({ documents: documentsWithFiles });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Error getting documents' });
  }
});

// Download a file
router.get('/download/:id', authenticateUser, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await storage.getUploadedFile(fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    res.setHeader('Content-Type', file.mimetype);

    // Stream the file
    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
});

// Delete a file
router.delete('/file/:id', authenticateUser, checkRole(['manager', 'floor_manager']), async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await storage.getUploadedFile(fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete any document attachments associated with this file
    await storage.deleteDocumentAttachmentsByFile(fileId);

    // Delete file record from database
    await storage.deleteUploadedFile(fileId);

    // Delete file from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

export default router;