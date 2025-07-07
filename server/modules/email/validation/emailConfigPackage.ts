/**
 * Email Configuration VE30 Package
 * Handles email administration settings through ValidationEngine30
 * Operations: configure (update SMTP settings), status (read current config)
 */

import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

// Email configuration schema for SMTP settings
export const emailConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().min(1).max(65535, 'Port must be between 1-65535'),
  secure: z.boolean(),
  auth: z.object({
    user: z.string().email('Valid email address required'),
    pass: z.string().min(1, 'Password is required')
  }).optional(),
  from: z.string().email('Valid from email address required'),
  testMode: z.boolean().optional().default(false)
});

// Business rules for email configuration validation
const emailConfigBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // SMTP port security validation
    if (data.secure && data.port !== 465 && data.port !== 587) {
      warnings.push('Secure SMTP typically uses port 465 or 587');
    }
    
    if (!data.secure && data.port === 465) {
      errors.push('Port 465 requires secure connection');
    }

    // Required field validation
    if (!data.host || data.host.trim().length === 0) {
      errors.push('SMTP host is required');
    }

    return { warnings, errors };
  }
];

// VE30 Package for email configuration operations
export const emailConfigPackage: VE30Package = VE30PackageBuilder.createPackage({
  entityType: 'emailConfig',
  schema: emailConfigSchema,
  permissionMap: {
    configure: ['email.admin'],  // Update SMTP configuration
    status: ['email.admin']      // Read current configuration
  },
  businessRules: emailConfigBusinessRules
});