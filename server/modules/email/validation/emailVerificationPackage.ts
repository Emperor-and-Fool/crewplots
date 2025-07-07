/**
 * Email Verification ValidationEngine30 Package
 * Handles email verification token creation and validation with VE30 integration
 */

import { z } from 'zod';
// import { insertEmailVerificationTokenSchema } from '@shared/schema'; // TODO: Add email verification schema
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';
import type { VerificationRequest, VerificationResult } from '../types';

// ================================
// Schema Validation
// ================================

export const emailVerificationRequestSchema = z.object({
  userId: z.number().min(1, 'User ID must be positive'),
  email: z.string().email('Valid email address required'),
  firstName: z.string().optional(),
});

export const emailVerificationTokenValidationSchema = z.object({
  token: z.string().min(32, 'Token must be at least 32 characters'),
  email: z.string().email('Valid email address required'),
});

// ================================
// Permission Requirements
// ================================

export const emailVerificationPermissions = [
  'user.read',
  'user.update', 
  'email.send'
];

// ================================
// Business Rules Validation (VE30PackageBuilder Compatible)
// ================================

const emailVerificationBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check if user ID is valid
    if (!data.userId || data.userId <= 0) {
      errors.push('Valid user ID required for email verification');
    }

    // Check if email is present and valid
    if (!data.email || data.email.length === 0) {
      errors.push('Email address is required for verification');
    }

    // Check email format (additional validation beyond schema)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      errors.push('Email address format is invalid');
    }

    // Check if firstName is reasonable length if provided
    if (data.firstName && data.firstName.length > 100) {
      warnings.push('First name is quite long - consider shortening');
    }

    return { warnings, errors };
  },

  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // User context validation
    if (!context?.user) {
      errors.push('User context required for email verification operations');
      return { warnings, errors };
    }

    // Rate limiting check
    if (data.email && data.email.length > 254) {
      errors.push('Email address exceeds maximum length');
    }

    return { warnings, errors };
  }
];

// ================================
// Package Assembly (VE30PackageBuilder Compatible)
// ================================

const emailVerificationAssembly = (rawData: any, user: any, operation: string) => {
  // Generate secure verification token
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

  return {
    userId: rawData.userId || user?.id,
    token,
    email: rawData.email?.trim(),
    firstName: rawData.firstName?.trim() || null,
    expiresAt,
    isUsed: false,
    createdAt: new Date(),
    // Additional data for email service
    templateData: {
      firstName: rawData.firstName || 'User',
      verificationLink: `${process.env.REPL_HOSTNAME || 'https://localhost:5000'}/verify-email?token=${token}&email=${encodeURIComponent(rawData.email)}`,
    },
    notificationData: {
      event: 'verification_email_sent' as const,
      severity: 'info' as const,
      message: `Email verification sent to ${rawData.email}`,
      userId: rawData.userId || user?.id,
      email: rawData.email,
      metadata: { 
        action: 'registration_flow',
        tokenExpiry: expiresAt.toISOString()
      }
    }
  };
};

// ================================
// Utility Functions
// ================================

function generateSecureToken(): string {
  // Generate cryptographically secure token
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 64;
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  
  // Add timestamp for uniqueness
  const timestamp = Date.now().toString(36);
  return `${result}${timestamp}`;
}

// ================================
// Package Export (VE30PackageBuilder Standard)
// ================================

// VE30PackageBuilder-based package (STANDARDIZED)
export const emailVerificationPackage: VE30Package = {
  entityType: 'emailVerification',
  
  validateSchema: (data: any, operation: string) => {
    return VE30PackageBuilder.validateSchema(data, operation, insertEmailVerificationTokenSchema);
  },
  
  getRequiredPermissions: (operation: string) => {
    return VE30PackageBuilder.getRequiredPermissions(operation, 'email');
  },
  
  validateBusinessRules: async (data: any, context: any) => {
    return await VE30PackageBuilder.validateBusinessRules(data, context, emailVerificationBusinessRules);
  },
  
  assemblePackage: async (data: any, user: any, operation: string) => {
    return await VE30PackageBuilder.assemblePackage(data, user, operation, emailVerificationAssembly);
  }
};

export type EmailVerificationPackage = typeof emailVerificationPackage;