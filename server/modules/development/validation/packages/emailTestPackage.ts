/**
 * Email Test Package - VE30 Compliant
 * Development validation package for email testing operations
 * CONVERTED: From ValidationPackage30 to VE30Package structure
 */

import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

// Request schema for email test operations
export const emailTestRequestSchema = z.object({
  recipientEmail: z.string().email('Invalid email address'),
  templateType: z.enum(['test', 'verification', 'welcome']).optional(),
  testMode: z.boolean().default(true),
  subject: z.string().optional(),
  content: z.string().optional()
});

// Business rules for email test operations
const emailTestBusinessRules = [
  (data: any, context?: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate required fields
    if (!data.recipientEmail) {
      errors.push('Recipient email is required for email testing');
    }

    // Validate email format (double-check beyond schema)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.recipientEmail && !emailRegex.test(data.recipientEmail)) {
      errors.push('Invalid email format');
    }

    // Validate template type
    const validTemplates = ['test', 'verification', 'welcome'];
    if (data.templateType && !validTemplates.includes(data.templateType)) {
      errors.push(`Invalid template type. Must be one of: ${validTemplates.join(', ')}`);
    }

    // Development environment warning
    if (!data.testMode) {
      warnings.push('Non-test mode email operations should use production email endpoints');
    }

    return { warnings, errors };
  }
];

// Assembly function for email test requests
const emailTestAssembly = async (rawData: any, user: any, operation: string) => {
  return {
    recipientEmail: rawData.recipientEmail,
    templateType: rawData.templateType || 'test',
    subject: rawData.subject,
    content: rawData.content,
    testMode: true,
    timestamp: new Date().toISOString(),
    requestedBy: user?.id || 0,
    operation: operation
  };
};

// VE30PackageBuilder-based email test package
export const emailTestPackage: VE30Package = {
  entityType: 'emailTest',
  validateSchema: (data: any, operation: string) => 
    VE30PackageBuilder.validateSchema(data, operation, emailTestRequestSchema),
  getRequiredPermissions: (operation: string) => {
    return ['email.send', 'development.testing'];
  },
  validateBusinessRules: async (data: any, context: any) => 
    VE30PackageBuilder.validateBusinessRules(data, context, emailTestBusinessRules),
  assemblePackage: emailTestAssembly
};

export type EmailTestPackage = typeof emailTestPackage;