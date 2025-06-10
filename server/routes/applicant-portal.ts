import express from 'express';
import { storage } from '../storage';
import { messageService } from '../services/message-service';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../db';
import { messages as messagesTable } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueFilename = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueFilename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only document file types
    const allowedFileTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and Word documents are allowed.'));
    }
  }
});

// Middleware to check if user is an applicant
const isApplicant = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user has applicant role
  if (req.user.role !== 'applicant') {
    return res.status(403).json({ error: 'Access denied. Only applicants can access this resource.' });
  }

  next();
};

// Get applicant data for the logged-in user
router.get('/my-profile', isApplicant, async (req: any, res) => {
  try {
    console.log('Fetching applicant profile for user ID:', req.user.id);
    
    // Add a 500ms delay to ensure database connection is ready (helps with race conditions)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const applicant = await storage.getUser(req.user.id);
    
    if (!applicant || applicant.role !== 'applicant') {
      console.log('No applicant profile found for user ID:', req.user.id);
      return res.status(404).json({ 
        error: 'Applicant profile not found',
        message: 'Your user account exists but no applicant profile is linked to it.'
      });
    }
    
    console.log('Successfully retrieved applicant profile:', 
      { id: applicant.id, name: applicant.name, email: applicant.email });
    
    // Send complete applicant data
    res.json(applicant);
  } catch (error) {
    console.error('Error fetching applicant profile:', error);
    
    // More detailed error response
    res.status(500).json({ 
      error: 'Failed to fetch applicant profile',
      message: 'There was a problem retrieving your profile data. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// Schema for updating messages
const updateMessageSchema = z.object({
  message: z.string().max(2000, 'Message must be less than 2000 characters')
});

// Update additional message for applicant
router.put('/message', isApplicant, async (req: any, res) => {
  try {
    // Validate input
    const validatedData = updateMessageSchema.parse(req.body);
    
    // Get the applicant
    const applicant = await storage.getApplicantByUserId(req.user.id);
    
    if (!applicant) {
      return res.status(404).json({ error: 'Applicant profile not found' });
    }
    
    // Update the message
    const updatedApplicant = await storage.updateApplicant(applicant.id, {
      extraMessage: validatedData.message
    });
    
    res.json({ success: true, applicant: updatedApplicant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    
    console.error('Error updating applicant message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Get messages for applicant (using service layer)
router.get('/messages', isApplicant, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Use MessageService to get compiled messages (PostgreSQL + MongoDB)
    const messages = await messageService.getMessagesByUser(userId);
    
    console.log(`Fetched ${messages.length} compiled messages for applicant user ${userId}`);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching applicant messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create message for applicant (using service layer)
router.post('/messages', isApplicant, async (req: any, res) => {
  try {
    const messageSchema = z.object({
      content: z.string().min(1).max(10000), // Increased limit for rich content
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      isPrivate: z.boolean().default(false),
    });
    
    const validatedData = messageSchema.parse(req.body);
    const userId = req.user.id;
    
    // Use MessageService to upsert message (create or update) to ensure only one message per user
    const newMessage = await messageService.upsertUserMessage(
      userId,
      validatedData.content,
      'application'
    );
    
    console.log(`Created message with MongoDB storage for applicant user ${userId}`);
    res.status(201).json(newMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid message data', details: error.errors });
    }
    
    console.error('Error creating applicant message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Update message for applicant (using service layer)
router.put('/messages/:id', isApplicant, async (req: any, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user.id;
    const { content } = req.body;
    
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Verify message ownership through storage layer
    const existingMessage = await storage.getMessage(messageId);
    if (!existingMessage || existingMessage.userId !== userId) {
      return res.status(404).json({ error: 'Message not found or not authorized' });
    }
    
    // Use MessageService to update message (PostgreSQL + MongoDB)
    const updatedMessage = await messageService.updateMessage(messageId, {
      content: content.trim()
    });
    
    console.log(`Updated message ${messageId} with MongoDB storage for applicant user ${userId}`);
    res.json(updatedMessage);
  } catch (error) {
    console.error('Error updating applicant message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete message for applicant (using service layer)
router.delete('/messages/:id', isApplicant, async (req: any, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const userId = req.user.id;
    
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    // Verify message ownership through storage layer
    const existingMessage = await storage.getMessage(messageId);
    if (!existingMessage || existingMessage.userId !== userId) {
      return res.status(404).json({ error: 'Message not found or not authorized' });
    }
    
    // Use MessageService to delete message (PostgreSQL + MongoDB)
    const deleted = await messageService.deleteMessage(messageId);
    
    if (deleted) {
      console.log(`Deleted message ${messageId} with MongoDB cleanup for applicant user ${userId}`);
      res.json({ success: true, messageId });
    } else {
      res.status(500).json({ error: 'Failed to delete message' });
    }
  } catch (error) {
    console.error('Error deleting applicant message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Upload document
router.post('/documents', isApplicant, upload.single('document'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Get the applicant
    const applicant = await storage.getApplicantByUserId(req.user.id);
    
    if (!applicant) {
      // Clean up the uploaded file if applicant not found
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Applicant profile not found' });
    }
    
    // Save document reference to database
    const documentUrl = `/uploads/documents/${req.file.filename}`;
    const document = await storage.createApplicantDocument({
      applicantId: applicant.id,
      documentName: req.body.documentName || req.file.originalname,
      documentUrl: documentUrl,
      fileType: req.file.mimetype
    });
    
    res.status(201).json({ success: true, document });
  } catch (error) {
    console.error('Error uploading document:', error);
    // Clean up file if there was an error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get documents for the logged-in applicant
router.get('/documents', isApplicant, async (req: any, res) => {
  try {
    console.log('Fetching documents for user ID:', req.user.id);
    
    // Add a small delay to ensure database connection is ready (helps with race conditions)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const applicant = await storage.getApplicantByUserId(req.user.id);
    
    if (!applicant) {
      console.log('No applicant profile found for user ID when fetching documents:', req.user.id);
      return res.status(404).json({ 
        error: 'Applicant profile not found',
        message: 'Your user account exists but no applicant profile is linked to it.' 
      });
    }
    
    console.log('Fetching documents for applicant ID:', applicant.id);
    
    const documents = await storage.getApplicantDocuments(applicant.id);
    
    console.log(`Successfully retrieved ${documents.length} documents for applicant ID ${applicant.id}`);
    
    // Send document data
    res.json(documents);
  } catch (error) {
    console.error('Error fetching applicant documents:', error);
    
    // More detailed error response
    res.status(500).json({ 
      error: 'Failed to fetch documents',
      message: 'There was a problem retrieving your documents. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// Delete document
router.delete('/documents/:id', isApplicant, async (req: any, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    // Get the applicant
    const applicant = await storage.getApplicantByUserId(req.user.id);
    
    if (!applicant) {
      return res.status(404).json({ error: 'Applicant profile not found' });
    }
    
    // Fetch the document to check ownership
    const document = await storage.getApplicantDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if the document belongs to the current applicant
    if (document.applicantId !== applicant.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this document' });
    }
    
    // Extract filename from documentUrl
    const filename = path.basename(document.documentUrl);
    const filePath = path.join(uploadsDir, filename);
    
    // Delete the physical file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete document record from database
    const success = await storage.deleteApplicantDocument(documentId);
    
    if (success) {
      res.json({ success: true, message: 'Document deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete document record' });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;