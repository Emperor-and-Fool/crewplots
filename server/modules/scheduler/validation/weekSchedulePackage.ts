import { insertWeekScheduleSchema } from '@shared/schema';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';
import { z } from 'zod';

// READ operation schema - only needs ID
const weekScheduleReadSchema = z.object({
  id: z.number()
});

// LIST operation schema - handles filters
const weekScheduleListSchema = z.object({
  filters: z.object({
    scheduleBlockId: z.number().optional(),
    weekNumber: z.number().optional(),
    locationId: z.number().optional()
  }).optional()
});

/**
 * Week Schedule Validation Package - VE30PackageBuilder Standard
 * Converted from function-based implementation to VE30PackageBuilder configuration
 */

export interface WeekScheduleData {
  id?: number;
  scheduleBlockId?: number;
  weekNumber: number;
  templateId?: number;
  createdBy?: number;
}

// Business rules for week schedules
const weekScheduleBusinessRules = [
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Skip most validation for READ operations
    if (context?.operation === 'read' || context?.operation === 'list') {
      return { warnings, errors };
    }

    // Week number validation (only for create/update)
    if (!data.weekNumber || typeof data.weekNumber !== 'number') {
      errors.push('Week number is required and must be a number');
    } else if (data.weekNumber < 1 || data.weekNumber > 53) {
      errors.push('Week number must be between 1 and 53');
    }

    // Schedule block validation for creation
    if (!data.scheduleBlockId && data.id === undefined) {
      errors.push('Schedule block ID is required for new week schedules');
    }

    return { warnings, errors };
  },

  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Skip user context validation for READ operations
    if (context?.operation === 'read' || context?.operation === 'list') {
      return { warnings, errors };
    }

    // User context validation
    if (!context?.user) {
      errors.push('User context required for week schedule operations');
      return { warnings, errors };
    }

    // Template validation (optional)
    if (data.templateId && (typeof data.templateId !== 'number' || data.templateId <= 0)) {
      warnings.push('Invalid template ID provided - will proceed without template');
    }

    return { warnings, errors };
  }
];

// Custom assembly function for week schedules
const weekScheduleAssembly = (rawData: any, user: any, operation: string) => {
  // For READ operations, just return the ID
  if (operation === 'read') {
    return { id: rawData.id };
  }

  // For LIST operations, return filters
  if (operation === 'list') {
    return rawData.filters || {};
  }

  // For CREATE/UPDATE operations, return full data
  return {
    scheduleBlockId: parseInt(rawData.scheduleBlockId) || rawData.scheduleBlockId,
    weekNumber: parseInt(rawData.weekNumber) || rawData.weekNumber,
    templateId: rawData.templateId ? parseInt(rawData.templateId) : null,
    createdBy: user?.id || rawData.createdBy,
    // Include ID for update operations
    ...(operation === 'update' && rawData.id && { id: rawData.id })
  };
};

// VE30PackageBuilder-based package (STANDARDIZED from working function-based)
export const weekSchedulePackage: VE30Package = {
  entityType: 'weekSchedule',
  
  // Operation-appropriate schema validation
  validateSchema: (data: any, operation: string) => {
    if (operation === 'read') {
      return VE30PackageBuilder.validateSchema(data, operation, weekScheduleReadSchema);
    }
    if (operation === 'list') {
      return VE30PackageBuilder.validateSchema(data, operation, weekScheduleListSchema);
    }
    return VE30PackageBuilder.validateSchema(data, operation, insertWeekScheduleSchema);
  },
  
  // Custom permissions for scheduler operations
  getRequiredPermissions: (operation: string) => {
    if (operation === 'list' || operation === 'read') return ['schedule.read'];
    if (operation === 'create') return ['schedule.read', 'schedule.create'];
    if (operation === 'update') return ['schedule.read', 'schedule.update'];
    if (operation === 'delete') return ['schedule.read', 'schedule.delete'];
    return ['schedule.read'];
  },
  
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, weekScheduleBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, weekScheduleAssembly)
};

export type WeekSchedulePackage = typeof weekSchedulePackage;