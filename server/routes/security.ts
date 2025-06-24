/**
 * Security Settings API Routes
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Default security settings
const defaultSettings = {
  locationDeletion: {
    method: 'basic',
    confirmationSteps: 3,
    notificationEmails: [],
    tokenExpiration: 24,
    auditTrail: true,
    requireReason: true,
    reversibilityWindow: 7
  }
};

// In-memory storage for now (will be moved to database later)
let currentSettings = { ...defaultSettings };

// Get current security settings
router.get('/settings', (req: Request, res: Response) => {
  try {
    res.json(currentSettings);
  } catch (error) {
    console.error('[SECURITY API] Failed to get settings:', error);
    res.status(500).json({ error: 'Failed to retrieve security settings' });
  }
});

// Update security settings
router.post('/settings', (req: Request, res: Response) => {
  try {
    const { locationDeletion } = req.body;

    if (!locationDeletion) {
      return res.status(400).json({ error: 'Missing location deletion settings' });
    }

    // Validate required fields
    const { method, confirmationSteps, tokenExpiration, auditTrail, requireReason, reversibilityWindow } = locationDeletion;

    if (!method || typeof confirmationSteps !== 'number' || typeof tokenExpiration !== 'number') {
      return res.status(400).json({ error: 'Invalid settings format' });
    }

    // Update settings
    currentSettings.locationDeletion = {
      ...currentSettings.locationDeletion,
      ...locationDeletion
    };

    console.log('[SECURITY API] Settings updated:', {
      method: currentSettings.locationDeletion.method,
      steps: currentSettings.locationDeletion.confirmationSteps,
      emails: currentSettings.locationDeletion.notificationEmails?.length || 0,
      auditTrail: currentSettings.locationDeletion.auditTrail
    });
    
    res.json({ 
      success: true, 
      message: 'Security settings updated successfully',
      settings: currentSettings
    });
  } catch (error) {
    console.error('[SECURITY API] Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update security settings' });
  }
});

// Get deletion audit log (placeholder for future implementation)
router.get('/audit/deletions', (req: Request, res: Response) => {
  try {
    // Mock audit data for now
    const auditLog = [
      {
        id: 1,
        locationId: 5,
        locationName: 'Demo Location',
        requestedBy: 'admin',
        requestedAt: new Date().toISOString(),
        status: 'pending',
        method: 'email_verification'
      }
    ];
    
    res.json(auditLog);
  } catch (error) {
    console.error('[SECURITY API] Failed to get audit log:', error);
    res.status(500).json({ error: 'Failed to retrieve audit log' });
  }
});

export default router;