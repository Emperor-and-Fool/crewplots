/**
 * Legacy Email Service - Migrated from server/services/email.ts
 * Provides email functionality with configurable SMTP settings
 * Used by administrator email settings and API routes
 */

import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface SentEmail {
  id: string;
  to: string | string[];
  subject: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'failed';
}

class EmailService {
  private config: EmailConfig | null = null;
  private transporter: any = null;
  private sentEmails: SentEmail[] = [];
  private isTestMode: boolean = true;

  constructor() {
    // Default test configuration
    this.setTestMode(true);
  }

  /**
   * Configure email service with SMTP settings
   */
  configure(config: EmailConfig) {
    this.config = config;
    
    if (this.isTestMode) {
      // Mock transporter for testing
      this.transporter = {
        sendMail: this.mockSendMail.bind(this)
      };
    } else {
      // Real nodemailer transporter
      this.transporter = nodemailer.createTransporter({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth
      });
    }
  }

  /**
   * Set test mode on/off
   */
  setTestMode(testMode: boolean) {
    this.isTestMode = testMode;
    console.log(`[EMAIL] ${testMode ? 'Test' : 'Production'} mode enabled`);
  }

  /**
   * Mock email sending for testing
   */
  private async mockSendMail(options: any): Promise<any> {
    const emailId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sentEmail: SentEmail = {
      id: emailId,
      to: options.to,
      subject: options.subject,
      content: options.html || options.text,
      timestamp: new Date(),
      status: 'sent'
    };

    this.sentEmails.push(sentEmail);

    console.log(`[EMAIL MOCK] Captured email:`, {
      id: emailId,
      to: options.to,
      subject: options.subject,
      timestamp: sentEmail.timestamp
    });

    return {
      messageId: emailId,
      response: 'Mock email captured successfully'
    };
  }

  /**
   * Send email
   */
  async sendEmail(to: string | string[], subject: string, content: string): Promise<boolean> {
    if (!this.transporter) {
      console.error('[EMAIL] Service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: this.config?.from || 'CrewPlots <noreply@crewplots.com>',
        to,
        subject,
        html: content
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`[EMAIL] ${this.isTestMode ? 'Mock' : 'Real'} email sent:`, result.messageId);
      return true;
    } catch (error) {
      console.error('[EMAIL] Send failed:', error);
      return false;
    }
  }

  /**
   * Get all captured test emails
   */
  getSentEmails(): SentEmail[] {
    return this.sentEmails;
  }

  /**
   * Clear test email history
   */
  clearSentEmails(): void {
    this.sentEmails = [];
    console.log('[EMAIL] Test email history cleared');
  }

  /**
   * Get current configuration
   */
  getConfig(): EmailConfig | null {
    return this.config;
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (this.isTestMode) {
      console.log('[EMAIL] Test mode - connection test skipped');
      return true;
    }

    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('[EMAIL] SMTP connection verified');
      return true;
    } catch (error) {
      console.error('[EMAIL] SMTP connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();