import { z } from 'zod';

// Motivation note validation package interface
interface ValidationPackage30 {
  packageType: string;
  schema: z.ZodSchema<any>;
  permissions: string[];
  businessRules: Array<(data: any) => { warnings: string[]; errors: string[]; }>;
  assembleData: (rawData: any) => any;
}

// Motivation note validation schema
const motivationNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000, 'Content too long'),
  userId: z.number().positive('User ID is required'),
  workflow: z.string().default('user-management'),
  messageType: z.string().default('motivation-note'),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  isPrivate: z.boolean().default(true),
  noteType: z.string().default('motivation'),
  visibility: z.enum(['private', 'team', 'public']).default('private'),
});

// Business rules for motivation notes
export const motivationNoteBusinessRules = {
  validateContentQuality: (data: any) => {
    const warnings = [];
    const errors = [];

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

  validateUserContext: (data: any) => {
    const warnings = [];
    const errors = [];

    // User ID validation
    if (!data.userId || typeof data.userId !== 'number') {
      errors.push('Valid user ID is required for motivation note');
    }

    return { warnings, errors };
  },

  validateWorkflowIntegrity: (data: any) => {
    const warnings = [];
    const errors = [];

    // Ensure motivation notes are properly categorized
    if (data.workflow !== 'user-management') {
      warnings.push('Motivation notes should use user-management workflow');
    }

    return { warnings, errors };
  }
};

export const motivationNotePackage: ValidationPackage30 = {
  packageType: 'motivationNote',
  schema: motivationNoteSchema,
  permissions: ['user.update'], // Permission to update user notes
  businessRules: [
    motivationNoteBusinessRules.validateContentQuality,
    motivationNoteBusinessRules.validateUserContext,
    motivationNoteBusinessRules.validateWorkflowIntegrity
  ],
  assembleData: (rawData: any) => {
    return {
      content: rawData.content || rawData.notes || '',
      userId: parseInt(rawData.userId) || rawData.userId,
      workflow: 'user-management',
      messageType: 'motivation-note',
      priority: rawData.priority || 'normal',
      isPrivate: true, // Motivation notes are always private
      noteType: 'motivation',
      visibility: 'private',
      createdBy: rawData.createdBy || rawData.currentUserId,
    };
  }
};