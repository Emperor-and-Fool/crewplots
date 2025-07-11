/**
 * Email Sent History Package - ValidationEngine30
 * Handles validation for email sent history operations (read, delete)
 */

import { z } from 'zod';
import { VE30PackageBuilder } from '@shared/validation/VE30PackageBuilder';

// Schema for email sent operations (minimal - mostly read/delete operations)
const emailSentSchema = z.object({
  operation: z.enum(['read', 'delete']).optional(),
}).optional();

/**
 * Email Sent Package - VE30-compliant package using VE30PackageBuilder
 */
export const emailSentPackage = {
  entityType: 'emailSent',

  // Standard VE30 schema validation method
  validateSchema: (data: any, operation: string) => 
    VE30PackageBuilder.validateSchema(data, operation, emailSentSchema),

  // Permission requirements for operations
  getRequiredPermissions: (operation: string): string[] => {
    return ['email.read']; // Base permission for all email sent operations
  },

  // Business rules validation  
  validateBusinessRules: async (data: any, context: any) => {
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  },

  // Package assembly with user context
  assemblePackage: async (data: any, user: any, operation: string) => {
    return data || {};
  }
};