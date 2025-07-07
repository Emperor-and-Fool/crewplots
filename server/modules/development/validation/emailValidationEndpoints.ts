/**
 * Email Validation Endpoints for Development
 * Isolated email validation logic for easy cleanup
 */

import { Request, Response } from 'express';
import { validationEngine30 } from '../../../services/validation/ValidationEngine30';
import { emailTestPackage } from './packages/emailTestPackage';
import { TemplateService } from '../../../modules/email/services/TemplateService';
import { MockEmailService } from '../../../modules/email/services/MockEmailService';

/**
 * Development email validation endpoint
 * Complete test email chain: template assembly → validation → storage as 'sent'
 */
export async function handleDevExecuteMail(req: Request, res: Response) {
  try {
    console.log('[DEV-EMAIL] Starting test email chain:', req.body);
    
    // Extract data from request
    const { recipientEmail, templateType = 'test', subject, additionalData = {} } = req.body;
    const userId = (req.user as any)?.id;
    
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'recipientEmail is required',
        metadata: { endpoint: 'dev-execute-mail', isolatedTraffic: true }
      });
    }

    // Step 1: Template Assembly - Get template from MongoDB
    console.log('[DEV-EMAIL] Step 1: Template assembly');
    const templateService = new TemplateService();
    const template = await templateService.getTemplate(templateType);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Template not found: ${templateType}`,
        metadata: { endpoint: 'dev-execute-mail', templateType }
      });
    }

    // Step 2: Template rendering with variable substitution
    console.log('[DEV-EMAIL] Step 2: Template rendering');
    const emailData = {
      recipientEmail,
      subject: subject || template.subject,
      ...additionalData,
      userId
    };
    
    const renderedTemplate = await templateService.renderTemplate(templateType, emailData);

    // Step 3: VE30 Validation
    console.log('[DEV-EMAIL] Step 3: VE30 validation');
    const validationResult = await validationEngine30.validateAndExecute(
      'create',
      'emailTest',
      {
        recipientEmail,
        templateType,
        subject: renderedTemplate.subject,
        content: renderedTemplate.content,
        testMode: true
      },
      {
        userId: userId || 0,
        userRole: (req.user as any)?.role || 'guest'
      }
    );

    if (!validationResult.overall.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Email validation failed',
        validationErrors: validationResult.overall.errors,
        metadata: { endpoint: 'dev-execute-mail', isolatedTraffic: true }
      });
    }

    // Step 4: Store as 'sent' in development_emails collection
    console.log('[DEV-EMAIL] Step 4: Storing as sent email');
    const mockEmailService = new MockEmailService();
    const sentEmail = await mockEmailService.sendEmail({
      to: recipientEmail,
      subject: renderedTemplate.subject,
      html: renderedTemplate.content,
      text: renderedTemplate.textContent || 'No text content provided'
    });

    // Success response with complete chain details
    res.json({
      success: true,
      message: 'Test email chain completed successfully',
      result: {
        template: {
          type: templateType,
          subject: renderedTemplate.subject,
          contentLength: renderedTemplate.content.length
        },
        validation: validationResult,
        storage: sentEmail
      },
      metadata: {
        endpoint: 'dev-execute-mail',
        isolatedTraffic: true,
        developmentMode: true,
        chainComplete: true
      }
    });

  } catch (error) {
    console.error('[DEV-EMAIL-VALIDATION] Chain error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Email chain failed',
      metadata: {
        endpoint: 'dev-execute-mail',
        isolatedTraffic: true,
        developmentMode: true,
        chainFailed: true
      }
    });
  }
}

/**
 * Production email validation endpoint
 * Handles production email operations with traffic isolation
 */
export async function handleExecuteMail(req: Request, res: Response) {
  try {
    const validationEngine = new ValidationEngine30();
    const result = await validationEngine.execute(req.body);
    
    res.json({
      success: true,
      result,
      metadata: {
        endpoint: 'execute-mail',
        isolatedTraffic: true,
        productionMode: true
      }
    });
  } catch (error) {
    console.error('[EMAIL-VALIDATION] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        endpoint: 'execute-mail',
        isolatedTraffic: true,
        productionMode: true
      }
    });
  }
}