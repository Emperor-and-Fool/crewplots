/**
 * Email Template Initialization Package
 * VE30 package for initializing default email templates in MongoDB
 */

import { z } from 'zod';
import type { ValidationPackage } from '../../../validation/types';
import { templateService } from '../services/TemplateService';

// Schema for template initialization request
const emailTemplateInitializationSchema = z.object({
  operation: z.literal('emailTemplateInitialization'),
  forceReset: z.boolean().optional().default(false)
});

export const emailTemplateInitializationPackage: ValidationPackage = {
  // Schema validation
  schema: emailTemplateInitializationSchema,
  
  // Permission requirements
  permissions: ['admin.email_templates'],
  
  // Business rule validation
  async validateBusinessRules(data: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Check if templates already exist (unless force reset)
      if (!data.forceReset) {
        const existingTemplates = await templateService.listTemplates();
        if (existingTemplates.length > 0) {
          errors.push(`${existingTemplates.length} templates already exist. Use forceReset: true to reinitialize.`);
        }
      }
    } catch (error) {
      errors.push('Failed to check existing templates');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  // Package assembly
  assemblePackage(data: any) {
    return {
      operation: 'emailTemplateInitialization',
      forceReset: data.forceReset || false,
      timestamp: new Date().toISOString()
    };
  },
  
  // Database transaction execution
  async executeTransaction(assembledData: any) {
    try {
      // Initialize default templates
      await templateService.initializeDefaultTemplates();
      
      // Get created templates
      const templates = await templateService.listTemplates();
      
      return {
        success: true,
        data: {
          templatesCreated: templates.length,
          templates: templates.map(t => ({ 
            templateId: t.templateId, 
            name: t.name,
            createdAt: t.createdAt
          })),
          forceReset: assembledData.forceReset
        }
      };
    } catch (error) {
      console.error('[VE30] Template initialization failed:', error);
      return {
        success: false,
        error: 'Failed to initialize email templates'
      };
    }
  }
};