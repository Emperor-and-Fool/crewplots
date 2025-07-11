/**
 * Email Module Routes
 * API endpoints for email verification system with VE30 integration
 */

import { Router } from 'express';
import { z } from 'zod';
import { emailVerificationPackage } from '../validation/emailVerificationPackage';
import { templateService } from '../services/TemplateService';
import { storage } from '../../../storage';
import { authenticateUser } from '../../../middleware/auth';
import type { VerificationRequest } from '../types';

const router = Router();

// ================================
// Admin Email Management Routes
// ================================

/**
 * GET /api/email/sent
 * Get sent emails history (admin only)
 */
router.get('/sent', authenticateUser, async (req: any, res) => {
  try {
    // Only administrators can view sent emails
    if (req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        error: 'Administrator access required'
      });
    }

    const { emailService } = await import('../services/EmailService');
    const sentEmails = emailService.getSentEmails();
    
    res.json(sentEmails);

  } catch (error) {
    console.error('[EMAIL] Sent emails fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sent emails'
    });
  }
});

/**
 * DELETE /api/email/cleanup-expired
 * Cleans up expired verification tokens (admin only)
 */
router.delete('/cleanup-expired', authenticateUser, async (req: any, res) => {
  try {
    // Only administrators can run cleanup
    if (req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        error: 'Administrator access required'
      });
    }

    const deletedCount = await storage.deleteExpiredEmailVerificationTokens();

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired tokens`
    });

  } catch (error) {
    console.error('[EMAIL] Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup expired tokens'
    });
  }
});

// ================================
// Development Testing Routes
// ================================

/**
 * GET /api/email/dev/inbox
 * Get all captured test emails (development only)
 */
router.get('/dev/inbox', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { emailService } = await import('../services/EmailService');
    const emails = emailService.getSentEmails();
    
    res.json({
      success: true,
      emails: emails.map(email => ({
        id: email.id,
        to: email.to,
        subject: email.subject,
        content: email.content,
        timestamp: email.timestamp,
        status: email.status
      }))
    });
  } catch (error) {
    console.error('[EMAIL] Dev inbox error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get development emails'
    });
  }
});



/**
 * DELETE /api/email/dev/clear-inbox
 * Clear all captured test emails (development only)
 */
router.delete('/dev/clear-inbox', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { emailService } = await import('../services/EmailService');
    emailService.clearSentEmails();
    
    res.json({
      success: true,
      message: 'Development email inbox cleared'
    });
  } catch (error) {
    console.error('[EMAIL] Clear inbox error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear development email inbox'
    });
  }
});

export default router;