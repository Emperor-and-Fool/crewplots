/**
 * Mock Email Service for Development Testing
 * 
 * Captures "sent" emails using hybrid storage architecture:
 * - PostgreSQL metadata (sender, recipient, timestamps, status)
 * - MongoDB content (HTML/text body, attachments)
 * 
 * Enables complete email verification testing without external SMTP.
 */

import { v4 as uuidv4 } from 'uuid';
import { mongoConnection } from '../../../db-mongo';
import { storage } from '../../../storage';

export interface MockEmailOptions {
  sender: string;
  recipient: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  emailType: 'verification' | 'welcome' | 'notification';
  verificationToken?: string;
}

export interface MockEmailContent {
  htmlBody: string;
  textBody: string;
  metadata: {
    emailType: string;
    templateUsed?: string;
    variables?: Record<string, any>;
  };
  attachments?: Array<{
    filename: string;
    contentType: string;
    data: Buffer;
  }>;
}

export class MockEmailService {
  private isEnabled(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.MOCK_EMAIL_ENABLED === 'true';
  }

  /**
   * "Send" email by storing in hybrid storage system
   */
  async sendEmail(options: MockEmailOptions): Promise<{ messageId: string; success: boolean }> {
    if (!this.isEnabled()) {
      throw new Error('Mock email service only available in development');
    }

    const messageId = uuidv4();

    try {
      // Store rich content in MongoDB
      const emailContent: MockEmailContent = {
        htmlBody: options.htmlBody,
        textBody: options.textBody,
        metadata: {
          emailType: options.emailType,
          templateUsed: 'default',
          variables: {}
        }
      };

      const mongoDb = mongoConnection.getDatabase();
      const emailsCollection = mongoDb.collection('development_emails');
      
      const mongoResult = await emailsCollection.insertOne({
        messageId,
        content: emailContent,
        createdAt: new Date(),
        type: 'email_content'
      });

      const mongoContentId = mongoResult.insertedId.toString();

      // Store metadata in PostgreSQL (using existing infrastructure)
      const emailData = {
        messageId,
        sender: options.sender,
        recipient: options.recipient,
        subject: options.subject,
        status: 'sent' as const,
        emailType: options.emailType,
        mongoContentId,
        verificationToken: options.verificationToken || null
      };

      // For now, store in memory until schema is pushed
      // This will be replaced with proper database storage
      if (!global.mockEmails) {
        global.mockEmails = [];
      }
      global.mockEmails.push({
        id: global.mockEmails.length + 1,
        ...emailData,
        sentAt: new Date(),
        readAt: null,
        clickedAt: null
      });

      console.log(`📧 Mock Email Sent: ${options.subject} → ${options.recipient}`);
      
      return { messageId, success: true };
    } catch (error) {
      console.error('Mock email send failed:', error);
      return { messageId, success: false };
    }
  }

  /**
   * Generate verification email for testing
   */
  async sendVerificationEmail(
    recipient: string, 
    verificationToken: string,
    baseUrl: string = 'http://localhost:5000'
  ): Promise<{ messageId: string; success: boolean }> {
    const verificationLink = `${baseUrl}/verify-email/${verificationToken}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Verify Your Email Address</h1>
        <p>Welcome to CrewPlots Pro! Please verify your email address to complete your registration.</p>
        <div style="margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationLink}</p>
        <hr style="margin: 30px 0; border: 1px solid #eee;">
        <p style="color: #888; font-size: 12px;">
          This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `;

    const textBody = `
Welcome to CrewPlots Pro!

Please verify your email address by clicking this link:
${verificationLink}

This verification link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.
    `;

    return this.sendEmail({
      sender: 'noreply@crewplots.com',
      recipient,
      subject: 'Verify Your Email Address - CrewPlots Pro',
      htmlBody,
      textBody,
      emailType: 'verification',
      verificationToken
    });
  }

  /**
   * Get all mock emails (development inbox)
   */
  async getEmails(): Promise<any[]> {
    if (!this.isEnabled()) {
      return [];
    }

    // Return from memory storage for now
    return global.mockEmails || [];
  }

  /**
   * Get email content by messageId
   */
  async getEmailContent(messageId: string): Promise<MockEmailContent | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const mongoDb = mongoConnection.getDatabase();
      const emailsCollection = mongoDb.collection('development_emails');
      
      const result = await emailsCollection.findOne({ messageId });
      return result?.content || null;
    } catch (error) {
      console.error('Failed to get email content:', error);
      return null;
    }
  }

  /**
   * Mark email as read (for testing click tracking)
   */
  async markEmailRead(messageId: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const emails = global.mockEmails || [];
      const email = emails.find(e => e.messageId === messageId);
      if (email && !email.readAt) {
        email.readAt = new Date();
        email.status = 'read';
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to mark email as read:', error);
      return false;
    }
  }

  /**
   * Mark email link as clicked (for verification tracking)
   */
  async markEmailClicked(messageId: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const emails = global.mockEmails || [];
      const email = emails.find(e => e.messageId === messageId);
      if (email) {
        email.clickedAt = new Date();
        email.status = 'clicked';
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to mark email as clicked:', error);
      return false;
    }
  }
}

export const mockEmailService = new MockEmailService();