/**
 * Email Test Package
 * Development validation package for email testing operations
 */

import { z } from 'zod';
import type { ValidationPackage30 } from '../../../../services/validation/types';

export const emailTestSchema = z.object({
  recipientEmail: z.string().email('Invalid email address'),
  templateType: z.enum(['test', 'verification', 'welcome']).optional(),
  testMode: z.boolean().default(true)
});

export const emailTestPackage: ValidationPackage30 = {
  schema: emailTestSchema,
  permissions: ['email.send', 'development.testing'],
  businessRules: {
    validateEmailTest: (data: any) => {
      const errors = [];
      
      // Validate required fields
      if (!data.recipientEmail) {
        errors.push('Recipient email is required for email testing');
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (data.recipientEmail && !emailRegex.test(data.recipientEmail)) {
        errors.push('Invalid email format');
      }
      
      // Validate template type
      const validTemplates = ['test', 'verification', 'welcome'];
      if (data.templateType && !validTemplates.includes(data.templateType)) {
        errors.push(`Invalid template type. Must be one of: ${validTemplates.join(', ')}`);
      }
      
      return { 
        isValid: errors.length === 0, 
        errors 
      };
    }
  },
  assemblePackage: (data: any) => {
    return {
      operation: 'emailTest',
      payload: {
        recipientEmail: data.recipientEmail,
        templateType: data.templateType || 'test',
        subject: data.subject,
        content: data.content,
        testMode: true,
        timestamp: new Date().toISOString()
      },
      testMode: true
    };
  }
};