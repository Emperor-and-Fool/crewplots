import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

// Motivation note validation schema
const motivationNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000, 'Content too long'),
  userId: z.number().positive('User ID is required'),
  workflow: z.string().default('user-management'),
  messageType: z.string().default('motivation-note'),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  isPrivate: z.boolean().default(true),
  noteType: z.string().default('motivation'),
  visibility: z.string().default('private')
});

// Business rules for motivation notes
const motivationNoteBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Content quality checks
    if (data.content && data.content.length < 10) {
      warnings.push('Very short motivation note - consider adding more detail');
    }

    // Professionalism check (basic)
    const unprofessionalWords = ['bad', 'terrible', 'awful', 'stupid'];
    const hasUnprofessional = unprofessionalWords.some(word => 
      data.content?.toLowerCase().includes(word)
    );
    if (hasUnprofessional) {
      warnings.push('Consider using more professional language in motivation notes');
    }

    return { warnings, errors };
  },
  
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // User ID validation
    if (!data.userId || typeof data.userId !== 'number') {
      errors.push('Valid user ID is required for motivation note');
    }

    // Ensure motivation notes are properly categorized
    if (data.workflow !== 'user-management') {
      warnings.push('Motivation notes should use user-management workflow');
    }

    return { warnings, errors };
  }
];

// Custom assembly function for motivation notes
const motivationNoteAssembly = (rawData: any, user: any, operation: string) => {
  return {
    content: rawData.content || rawData.notes || '',
    userId: parseInt(rawData.userId) || rawData.userId,
    workflow: 'user-management',
    messageType: 'motivation-note',
    priority: rawData.priority || 'normal',
    isPrivate: true,
    noteType: 'motivation',
    visibility: 'private',
    createdBy: user?.id || rawData.createdBy,
  };
};

// VE30PackageBuilder-based package (CONVERTED from property-based)
export const motivationNotePackage: VE30Package = {
  entityType: 'motivationNote',
  validateSchema: (data: any, operation: string) => VE30PackageBuilder.validateSchema(data, operation, motivationNoteSchema),
  getRequiredPermissions: (operation: string) => VE30PackageBuilder.getRequiredPermissions(operation, 'motivationNote'),
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, motivationNoteBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, motivationNoteAssembly)
};