/**
 * Email Configuration API Routes
 */

import { Router } from 'express';
import { emailService } from '../modules/email/services/EmailService.js';

const router = Router();

// Get current email configuration
router.get('/config', (req, res) => {
  try {
    const config = emailService.getConfig();
    
    if (!config) {
      return res.json({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        testMode: true
      });
    }

    // Don't send password in response
    const safeConfig = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: config.from,
      auth: {
        user: config.auth.user,
        // password omitted for security
      },
      testMode: true // Always show as test mode for now
    };

    res.json(safeConfig);
  } catch (error) {
    console.error('[EMAIL API] Failed to get config:', error);
    res.status(500).json({ error: 'Failed to get email configuration' });
  }
});

// Update email configuration
router.post('/config', (req, res) => {
  try {
    const { host, port, secure, auth, from, testMode } = req.body;

    if (!host || !port || !auth?.user || !from) {
      return res.status(400).json({ error: 'Missing required configuration fields' });
    }

    const config = {
      host,
      port: parseInt(port),
      secure: Boolean(secure),
      auth: {
        user: auth.user,
        pass: auth.pass
      },
      from
    };

    emailService.configure(config);
    emailService.setTestMode(testMode !== false);

    console.log(`[EMAIL API] Configuration updated - Test mode: ${testMode !== false}`);
    
    res.json({ 
      success: true, 
      message: 'Email configuration updated successfully',
      testMode: testMode !== false
    });
  } catch (error) {
    console.error('[EMAIL API] Failed to update config:', error);
    res.status(500).json({ error: 'Failed to update email configuration' });
  }
});

// Test email connection
router.post('/test-connection', async (req, res) => {
  try {
    const isConnected = await emailService.testConnection();
    
    res.json({
      success: isConnected,
      testMode: true, // Always in test mode for now
      message: isConnected 
        ? 'Email service connection verified' 
        : 'Failed to connect to email service'
    });
  } catch (error) {
    console.error('[EMAIL API] Connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Connection test failed',
      testMode: true
    });
  }
});

// Get sent emails (test mode only)
router.get('/sent', (req, res) => {
  try {
    const sentEmails = emailService.getSentEmails();
    res.json(sentEmails);
  } catch (error) {
    console.error('[EMAIL API] Failed to get sent emails:', error);
    res.status(500).json({ error: 'Failed to retrieve sent emails' });
  }
});

// Clear sent emails (test mode only)
router.delete('/sent', (req, res) => {
  try {
    emailService.clearSentEmails();
    res.json({ success: true, message: 'Email history cleared' });
  } catch (error) {
    console.error('[EMAIL API] Failed to clear sent emails:', error);
    res.status(500).json({ error: 'Failed to clear email history' });
  }
});

// Send test email
router.post('/test-send', async (req, res) => {
  try {
    const { to, subject, content } = req.body;

    if (!to || !subject || !content) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, content' });
    }

    const success = await emailService.sendEmail(to, subject, content);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Test email sent successfully',
        testMode: true
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send test email' 
      });
    }
  } catch (error) {
    console.error('[EMAIL API] Test send failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Test email send failed' 
    });
  }
});

export default router;