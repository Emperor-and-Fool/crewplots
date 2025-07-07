/**
 * Email Template Service
 * MongoDB-based email template storage and rendering system
 * Plan 058 Phase 3 - Email Templates & MongoDB Integration
 */

import { mongoConnection } from '../../../db-mongo';
import type { EmailTemplate, TemplateRenderData } from '../types';

export interface TemplateRenderResult {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export class TemplateService {
  private collection = 'emailTemplates';

  /**
   * Store email template in MongoDB
   */
  async storeTemplate(templateData: {
    templateId: string;
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    variables: string[];
  }): Promise<void> {
    const db = mongoConnection.getDatabase();
    const templateDoc = {
      ...templateData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await db.collection(this.collection).insertOne(templateDoc);
  }

  /**
   * Retrieve email template by templateId
   */
  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    const db = mongoConnection.getDatabase();
    const template = await db.collection(this.collection).findOne({ templateId });
    return template as EmailTemplate | null;
  }

  /**
   * Update existing email template
   */
  async updateTemplate(templateId: string, template: Partial<EmailTemplate>): Promise<void> {
    const db = mongoConnection.getDatabase();
    await db.collection(this.collection).updateOne(
      { templateId },
      {
        $set: {
          ...template,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Render email template with user variables
   */
  async renderTemplate(templateId: string, variables: TemplateRenderData): Promise<TemplateRenderResult | null> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      console.error(`📧 Template not found: ${templateId}`);
      return null;
    }

    try {
      // Simple template variable replacement using {{variable}} syntax
      const subject = this.replaceVariables(template.subject, variables);
      const htmlContent = this.replaceVariables(template.htmlContent, variables);
      const textContent = this.replaceVariables(template.textContent, variables);

      return {
        subject,
        htmlContent,
        textContent
      };
    } catch (error) {
      console.error(`📧 Template rendering failed for ${templateId}:`, error);
      return null;
    }
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(content: string, variables: TemplateRenderData): string {
    let result = content;
    
    // Replace all {{variable}} patterns with actual values
    Object.entries(variables).forEach(([key, value]) => {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(pattern, String(value || ''));
    });

    return result;
  }

  /**
   * Initialize default email templates
   */
  async initializeDefaultTemplates(): Promise<void> {
    console.log('📧 Initializing default email templates...');
    
    // Email verification template
    const verificationTemplate = {
      templateId: 'email-verification',
      name: 'Email Verification',
      subject: 'Verify your CrewPlots account',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { background: #6b7280; color: white; padding: 15px; text-align: center; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CrewPlots Pro</h1>
            </div>
            <div class="content">
              <h2>Hello {{firstName}}!</h2>
              <p>Thank you for joining CrewPlots Pro. To complete your registration, please verify your email address by clicking the button below:</p>
              <p style="text-align: center;">
                <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #6b7280;">{{verificationUrl}}</p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with CrewPlots Pro, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>CrewPlots Pro - Day Production Crew Management</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
Hello {{firstName}}!

Thank you for joining CrewPlots Pro. To complete your registration, please verify your email address by visiting this link:

{{verificationUrl}}

This link will expire in 24 hours.

If you didn't create an account with CrewPlots Pro, you can safely ignore this email.

---
CrewPlots Pro - Day Production Crew Management
This is an automated message, please do not reply.
      `,
      variables: ['firstName', 'verificationUrl']
    };

    // Welcome email template
    const welcomeTemplate = {
      templateId: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to CrewPlots Pro!',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to CrewPlots Pro</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { background: #f0fdf4; padding: 30px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { background: #6b7280; color: white; padding: 15px; text-align: center; font-size: 14px; }
            .feature { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to CrewPlots Pro!</h1>
            </div>
            <div class="content">
              <h2>Hello {{firstName}}!</h2>
              <p>Your email has been verified successfully! Welcome to CrewPlots Pro - your comprehensive day production crew management platform.</p>
              
              <div class="feature">
                <h3>📅 Intelligent Scheduling</h3>
                <p>Create and manage production schedules with competency-based crew matching.</p>
              </div>
              
              <div class="feature">
                <h3>👥 Crew Management</h3>
                <p>Track applicants, manage crew members, and handle location assignments.</p>
              </div>
              
              <div class="feature">
                <h3>💬 Communication Hub</h3>
                <p>Integrated messaging system with hybrid storage for seamless team communication.</p>
              </div>
              
              <p style="text-align: center;">
                <a href="{{dashboardUrl}}" class="button">Access Your Dashboard</a>
              </p>
              
              <p>Ready to get started? Your account is now fully activated and you can begin exploring all the features CrewPlots Pro has to offer.</p>
            </div>
            <div class="footer">
              <p>CrewPlots Pro - Day Production Crew Management</p>
              <p>Need help? Contact our support team anytime.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
🎉 Welcome to CrewPlots Pro!

Hello {{firstName}}!

Your email has been verified successfully! Welcome to CrewPlots Pro - your comprehensive day production crew management platform.

FEATURES:
• 📅 Intelligent Scheduling - Create and manage production schedules with competency-based crew matching
• 👥 Crew Management - Track applicants, manage crew members, and handle location assignments  
• 💬 Communication Hub - Integrated messaging system with hybrid storage for seamless team communication

Access your dashboard: {{dashboardUrl}}

Ready to get started? Your account is now fully activated and you can begin exploring all the features CrewPlots Pro has to offer.

---
CrewPlots Pro - Day Production Crew Management
Need help? Contact our support team anytime.
      `,
      variables: ['firstName', 'dashboardUrl']
    };

    // Store templates (will overwrite existing ones)
    try {
      // Remove existing templates and insert new ones
      const db = mongoConnection.getDatabase();
      await db.collection(this.collection).deleteMany({});
      
      await this.storeTemplate(verificationTemplate);
      await this.storeTemplate(welcomeTemplate);
      
      console.log('✅ Default email templates initialized successfully');
    } catch (error) {
      console.error('🚨 Failed to initialize default templates:', error);
    }
  }

  /**
   * List all available templates
   */
  async listTemplates(): Promise<EmailTemplate[]> {
    const db = mongoConnection.getDatabase();
    const templates = await db.collection(this.collection).find({}).toArray();
    return templates.map(template => ({
      templateId: template.templateId,
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      variables: template.variables,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));
  }
}

export const templateService = new TemplateService();