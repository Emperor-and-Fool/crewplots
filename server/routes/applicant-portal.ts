import express from 'express';
import { storage } from '../storage';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

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
    const userId = req.user?.id;
    console.log(`[Applicant Portal] Fetching applicant profile for user ID: ${userId}`);
    console.log(`[Applicant Portal] User details:`, JSON.stringify({
      id: req.user?.id,
      role: req.user?.role,
      username: req.user?.username
    }));
    
    if (!userId) {
      console.error('[Applicant Portal] No user ID available in the request');
      return res.status(400).json({ error: 'Invalid user session' });
    }
    
    // Use the database storage implementation
    const applicant = await storage.getApplicantByUserId(userId);
    
    console.log(`[Applicant Portal] Applicant lookup result: ${applicant ? `Found ID: ${applicant.id}` : 'None found'}`);
    
    if (!applicant) {
      console.log(`[Applicant Portal] Applicant not found for user ID: ${userId}, returning 404`);
      return res.status(404).json({ 
        error: 'Applicant profile not found',
        userId: userId,
        debug: 'If you recently created this user, there might be a mismatch between the user ID and applicant record.'
      });
    }
    
    console.log(`[Applicant Portal] Successfully returning applicant data for ID: ${applicant.id}`);
    res.json(applicant);
  } catch (error: any) {
    console.error('[Applicant Portal] Error fetching applicant profile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch applicant profile', 
      message: error?.message || 'Unknown error' 
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
    const userId = req.user?.id;
    console.log(`[Applicant Portal] Updating message for user ID: ${userId}`);
    
    if (!userId) {
      console.error('[Applicant Portal] No user ID available in the update message request');
      return res.status(400).json({ error: 'Invalid user session' });
    }
    
    // Validate input
    try {
      const validatedData = updateMessageSchema.parse(req.body);
      
      console.log(`[Applicant Portal] Looking up applicant for user ID: ${userId} to update message`);
      // Get the applicant
      const applicant = await storage.getApplicantByUserId(userId);
      
      if (!applicant) {
        console.log(`[Applicant Portal] Applicant not found for user ID: ${userId} when updating message`);
        return res.status(404).json({ error: 'Applicant profile not found' });
      }
      
      console.log(`[Applicant Portal] Updating message for applicant ID: ${applicant.id}`);
      // Update the message
      const updatedApplicant = await storage.updateApplicant(applicant.id, {
        extraMessage: validatedData.message
      });
      
      console.log(`[Applicant Portal] Message updated successfully for applicant ID: ${applicant.id}`);
      res.json({ success: true, applicant: updatedApplicant });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.log('[Applicant Portal] Validation error in message update:', validationError.message);
        const formattedError = fromZodError(validationError);
        return res.status(400).json({ error: formattedError.message });
      }
      throw validationError; // Re-throw if it's not a validation error
    }
  } catch (error: any) {
    console.error('[Applicant Portal] Error updating applicant message:', error);
    res.status(500).json({ 
      error: 'Failed to update message',
      message: error?.message || 'Unknown error'
    });
  }
});

// Upload document
router.post('/documents', isApplicant, upload.single('document'), async (req: any, res) => {
  try {
    const userId = req.user?.id;
    console.log(`[Applicant Portal] Document upload request from user ID: ${userId}`);
    
    if (!userId) {
      console.error('[Applicant Portal] No user ID available in document upload request');
      // Clean up file if it was uploaded
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Invalid user session' });
    }
    
    if (!req.file) {
      console.log('[Applicant Portal] No file provided in upload request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log(`[Applicant Portal] File received: ${req.file.originalname}, looking up applicant record`);
    // Get the applicant
    const applicant = await storage.getApplicantByUserId(userId);
    
    if (!applicant) {
      console.log(`[Applicant Portal] Applicant not found for user ID: ${userId}, cleaning up uploaded file`);
      // Clean up the uploaded file if applicant not found
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Applicant profile not found' });
    }
    
    // Save document reference to database
    console.log(`[Applicant Portal] Creating document record for applicant ID: ${applicant.id}`);
    const documentUrl = `/uploads/documents/${req.file.filename}`;
    try {
      const document = await storage.createApplicantDocument({
        applicantId: applicant.id,
        documentName: req.body.documentName || req.file.originalname,
        documentUrl: documentUrl,
        fileType: req.file.mimetype
      });
      
      console.log(`[Applicant Portal] Document successfully uploaded with ID: ${document.id}`);
      res.status(201).json({ success: true, document });
    } catch (docError: any) {
      console.error(`[Applicant Portal] Failed to create document record:`, docError);
      // Clean up file if there was an error
      if (req.file.path && fs.existsSync(req.file.path)) {
        console.log(`[Applicant Portal] Cleaning up file after database error: ${req.file.path}`);
        fs.unlinkSync(req.file.path);
      }
      throw docError; // Let the outer catch handler format the response
    }
  } catch (error: any) {
    console.error('[Applicant Portal] Error uploading document:', error);
    // Clean up file if there was an error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      console.log(`[Applicant Portal] Cleaning up file after general error: ${req.file.path}`);
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      error: 'Failed to upload document',
      message: error?.message || 'Unknown error'
    });
  }
});

// Get documents for the logged-in applicant
router.get('/documents', isApplicant, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    console.log(`[Applicant Portal] Fetching documents for user ID: ${userId}`);
    
    if (!userId) {
      console.error('[Applicant Portal] No user ID available in the request for documents');
      return res.status(400).json({ error: 'Invalid user session' });
    }
    
    // Get the applicant record first
    const applicant = await storage.getApplicantByUserId(userId);
    
    console.log(`[Applicant Portal] Applicant lookup for documents: ${applicant ? `Found ID: ${applicant.id}` : 'None found'}`);
    
    if (!applicant) {
      console.log(`[Applicant Portal] Applicant not found for user ID: ${userId}, cannot retrieve documents`);
      return res.status(404).json({ 
        error: 'Applicant profile not found',
        userId: userId
      });
    }
    
    console.log(`[Applicant Portal] Getting documents for applicant ID: ${applicant.id}`);
    const documents = await storage.getApplicantDocuments(applicant.id);
    console.log(`[Applicant Portal] Retrieved ${documents.length} documents`);
    
    res.json(documents);
  } catch (error: any) {
    console.error('[Applicant Portal] Error fetching applicant documents:', error);
    res.status(500).json({ 
      error: 'Failed to fetch documents',
      message: error?.message || 'Unknown error' 
    });
  }
});

// Delete document
router.delete('/documents/:id', isApplicant, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const documentId = parseInt(req.params.id);
    
    console.log(`[Applicant Portal] Delete document request: Document ID ${documentId} from user ID ${userId}`);
    
    if (!userId) {
      console.error('[Applicant Portal] No user ID available in document delete request');
      return res.status(400).json({ error: 'Invalid user session' });
    }
    
    if (isNaN(documentId)) {
      console.log(`[Applicant Portal] Invalid document ID format: ${req.params.id}`);
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    // Get the applicant
    console.log(`[Applicant Portal] Looking up applicant for user ID: ${userId} for document deletion`);
    const applicant = await storage.getApplicantByUserId(userId);
    
    if (!applicant) {
      console.log(`[Applicant Portal] Applicant not found for user ID: ${userId} when deleting document`);
      return res.status(404).json({ error: 'Applicant profile not found' });
    }
    
    // Fetch the document to check ownership
    console.log(`[Applicant Portal] Fetching document ${documentId} to verify ownership`);
    const document = await storage.getApplicantDocument(documentId);
    
    if (!document) {
      console.log(`[Applicant Portal] Document ${documentId} not found in database`);
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if the document belongs to the current applicant
    if (document.applicantId !== applicant.id) {
      console.log(`[Applicant Portal] Permission denied: Document ${documentId} belongs to applicant ${document.applicantId}, not ${applicant.id}`);
      return res.status(403).json({ error: 'You do not have permission to delete this document' });
    }
    
    // Extract filename from documentUrl
    const filename = path.basename(document.documentUrl);
    const filePath = path.join(uploadsDir, filename);
    
    console.log(`[Applicant Portal] Attempting to delete physical file: ${filePath}`);
    // Delete the physical file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Applicant Portal] Physical file deleted: ${filePath}`);
    } else {
      console.log(`[Applicant Portal] Physical file not found: ${filePath}`);
    }
    
    // Delete document record from database
    console.log(`[Applicant Portal] Deleting document ${documentId} from database`);
    const success = await storage.deleteApplicantDocument(documentId);
    
    if (success) {
      console.log(`[Applicant Portal] Document ${documentId} successfully deleted`);
      res.json({ success: true, message: 'Document deleted successfully' });
    } else {
      console.error(`[Applicant Portal] Database failed to delete document ${documentId}`);
      res.status(500).json({ error: 'Failed to delete document record' });
    }
  } catch (error: any) {
    console.error('[Applicant Portal] Error deleting document:', error);
    res.status(500).json({ 
      error: 'Failed to delete document',
      message: error?.message || 'Unknown error'
    });
  }
});

export default router;