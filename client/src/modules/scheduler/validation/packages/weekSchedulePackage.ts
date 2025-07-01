import { insertWeekScheduleSchema } from '@shared/schema';

/**
 * Week Schedule Validation Package
 * Extracted from server/services/validation-package-service.ts
 * Defines validation rules, permissions, and business logic for week schedules
 */

export interface WeekScheduleData {
  id?: number;
  scheduleBlockId?: number;
  weekNumber: number;
  templateId?: number;
  createdBy?: number;
}

export interface WeekSchedulePackage {
  entityType: 'weekSchedule';
  
  // Schema validation
  validateSchema: (data: WeekScheduleData, operation: 'create' | 'update') => {
    isValid: boolean;
    errors: string[];
  };
  
  // Permission requirements
  getRequiredPermissions: (operation: 'create' | 'update' | 'delete') => string[];
  
  // Business rule validation
  validateBusinessRules: (data: WeekScheduleData, context: ValidationContext) => Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  // Package assembly for week schedules
  assembleWeekSchedules: (weekSchedulesData: any[], user: any, operation: 'create' | 'update') => Promise<WeekScheduleData[]>;
}

export interface ValidationContext {
  userId: number;
  userRole: string;
  permissions: string[];
  locationAccess: number[] | 'all';
  sessionId: string;
}

export const weekSchedulePackage: WeekSchedulePackage = {
  entityType: 'weekSchedule',
  
  validateSchema(data: WeekScheduleData, operation: 'create' | 'update') {
    const errors: string[] = [];
    
    try {
      if (operation === 'create') {
        // For creation, validate required fields but skip scheduleBlockId (assigned during transaction)
        if (!data.weekNumber) {
          errors.push('weekNumber: Required');
        }
        if (data.weekNumber && (data.weekNumber < 1 || data.weekNumber > 52)) {
          errors.push('weekNumber: Must be between 1 and 52');
        }
      } else {
        // For updates, validate all fields including IDs
        const result = insertWeekScheduleSchema.partial().safeParse(data);
        if (!result.success) {
          errors.push(...result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
        }
      }
    } catch (error) {
      errors.push(`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  getRequiredPermissions(operation: 'create' | 'update' | 'delete') {
    const basePermissions = ['scheduler_development'];
    
    switch (operation) {
      case 'create':
        return [...basePermissions, 'schedule.create'];
      case 'update':
        return [...basePermissions, 'schedule.update'];
      case 'delete':
        return [...basePermissions, 'schedule.delete'];
      default:
        return basePermissions;
    }
  },
  
  async validateBusinessRules(data: WeekScheduleData, context: ValidationContext) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Week schedules inherit location access from their parent schedule block
    // No location-specific validation needed at this level
    
    // Week number validation
    if (data.weekNumber && (data.weekNumber < 1 || data.weekNumber > 52)) {
      errors.push('Week number must be between 1 and 52');
    }
    
    // Template validation
    if (data.templateId && data.templateId < 1) {
      errors.push('Invalid template ID');
    }
    
    // Parent relationship validation
    if (data.scheduleBlockId && data.scheduleBlockId < 1) {
      errors.push('Invalid schedule block ID');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  async assembleWeekSchedules(weekSchedulesData: any[], user: any, operation: 'create' | 'update') {
    // Extracted from validation-package-service.ts assemblePackageFromRequest method
    return weekSchedulesData.map(ws => {
      const weekScheduleData: WeekScheduleData = {
        ...ws,
        id: ws?.id || undefined
      };
      
      if (operation === 'create') {
        weekScheduleData.createdBy = user.id;
      }
      
      return weekScheduleData;
    });
  }
};