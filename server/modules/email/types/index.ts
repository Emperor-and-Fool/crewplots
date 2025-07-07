/**
 * Email Module Types
 * Centralized type definitions for email verification system
 */

import type { EmailVerificationToken, InsertEmailVerificationToken } from '@shared/schema';

// Re-export shared schema types
export type { EmailVerificationToken, InsertEmailVerificationToken };

// Email service types
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

// Template service types
export interface EmailTemplate {
  _id?: string;
  templateId: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateRenderData {
  [key: string]: string | number | Date;
}

// Notification service types
export interface NotificationEvent {
  id: string;
  type: 'verification_email_sent' | 'verification_link_clicked' | 'user_account_activated' | 'welcome_email_sent';
  severity: 'info' | 'warning' | 'error' | 'success';
  message: string;
  userId?: number;
  email?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface DevOpsNotification {
  event: NotificationEvent['type'];
  severity: NotificationEvent['severity'];
  message: string;
  userId?: number;
  email?: string;
  metadata?: Record<string, any>;
}

// Verification workflow types
export interface VerificationRequest {
  userId: number;
  email: string;
  firstName?: string;
}

export interface VerificationResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  error?: string;
}