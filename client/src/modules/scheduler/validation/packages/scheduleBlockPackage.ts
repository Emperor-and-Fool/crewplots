import { insertScheduleBlockSchema } from '@shared/schema';

/**
 * Schedule Block Validation Package
 * Extracted from server/services/validation-package-service.ts
 * Defines validation rules, permissions, and business logic for schedule blocks
 */

export interface ScheduleBlockData {
  id?: number;
  name: string;
  description?: string;
  locationId: number;
  isActive: boolean;
  createdBy?: number;
}

export interface ScheduleBlockPackage {
  entityType: 'scheduleBlock';
  
  // Schema validation
  validateSchema: (data: ScheduleBlockData, operation: 'create' | 'update') => {
    isValid: boolean;
    errors: string[];
  };
  
  // Permission requirements
  getRequiredPermissions: (operation: 'create' | 'update' | 'delete') => string[];
  
  // Business rule validation
  validateBusinessRules: (data: ScheduleBlockData, context: ValidationContext) => Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  // Package assembly
  assemblePackage: (requestData: any, user: any, operation: 'create' | 'update' | 'delete') => Promise<any>;
}

export interface ValidationContext {
  userId: number;
  userRole: string;
  permissions: string[];
  locationAccess: number[];
  sessionId: string;
}

export const scheduleBlockPackage: ScheduleBlockPackage = {
  entityType: 'scheduleBlock',
  
  validateSchema(data: ScheduleBlockData, operation: 'create' | 'update') {
    const errors: string[] = [];
    
    try {
      if (operation === 'create') {
        const result = insertScheduleBlockSchema.safeParse(data);
        if (!result.success) {
          errors.push(...result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
        }
      } else {
        const result = insertScheduleBlockSchema.partial().safeParse(data);
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
  
  async validateBusinessRules(data: ScheduleBlockData, context: ValidationContext) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Location access validation
    if (data.locationId && !context.locationAccess.includes(data.locationId)) {
      errors.push('User does not have access to the specified location');
    }
    
    // Schedule name validation
    if (!data.name || data.name.trim().length < 3) {
      errors.push('Schedule name must be at least 3 characters long');
    }
    
    // Active status validation
    if (data.isActive === undefined) {
      warnings.push('Schedule activation status not specified, defaulting to active');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  async assemblePackage(requestData: any, user: any, operation: 'create' | 'update' | 'delete') {
    // Extracted from validation-package-service.ts assemblePackageFromRequest method
    const scheduleBlockData = {
      ...requestData.scheduleBlock,
      id: requestData.scheduleBlock?.id || undefined
    };
    
    if (operation === 'create') {
      scheduleBlockData.createdBy = user.id;
    }
    
    return {
      packageType: operation,
      scheduleBlock: scheduleBlockData,
      weekSchedules: requestData.weekSchedules || [],
      shifts: requestData.shifts || [],
      metadata: {
        userId: user.id,
        userRole: user.role,
        requestedPermissions: scheduleBlockPackage.getRequiredPermissions(operation),
        locationAccess: [], // Will be populated by service
        timestamp: new Date()
      }
    };
  }
};