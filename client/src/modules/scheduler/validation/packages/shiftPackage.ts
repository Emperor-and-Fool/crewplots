import { insertShiftSchema, updateShiftSchema } from '@shared/schema';

/**
 * Shift Validation Package
 * Extracted from server/services/validation-package-service.ts
 * Defines validation rules, permissions, and business logic for shifts
 */

export interface ShiftData {
  id?: number;
  weekScheduleId?: number;
  title: string;
  position?: string;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  maxSlots: number;
  subscriptionDeadline?: string;
  competencyRequirements?: any[];
}

export interface ShiftPackage {
  entityType: 'shift';
  
  // Schema validation
  validateSchema: (data: ShiftData, operation: 'create' | 'update') => {
    isValid: boolean;
    errors: string[];
  };
  
  // Permission requirements
  getRequiredPermissions: (operation: 'create' | 'update' | 'delete') => string[];
  
  // Business rule validation
  validateBusinessRules: (data: ShiftData, context: ValidationContext) => Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  // Package assembly for shifts
  assembleShifts: (shiftsData: any[], user: any, operation: 'create' | 'update') => Promise<ShiftData[]>;
}

export interface ValidationContext {
  userId: number;
  userRole: string;
  permissions: string[];
  locationAccess: number[] | 'all';
  sessionId: string;
}

export const shiftPackage: ShiftPackage = {
  entityType: 'shift',
  
  validateSchema(data: ShiftData, operation: 'create' | 'update') {
    const errors: string[] = [];
    
    try {
      if (operation === 'create') {
        // For creation, validate required fields but skip weekScheduleId (assigned during transaction)
        if (!data.title) {
          errors.push('title: Required');
        }
        if (!data.daysOfWeek || !Array.isArray(data.daysOfWeek) || data.daysOfWeek.length === 0) {
          errors.push('daysOfWeek: Required and must be a non-empty array');
        }
        if (!data.startTime) {
          errors.push('startTime: Required');
        }
        if (!data.endTime) {
          errors.push('endTime: Required');
        }
        if (!data.maxSlots || data.maxSlots < 1) {
          errors.push('maxSlots: Must be at least 1');
        }
        
        // Validate days of week
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        if (data.daysOfWeek && data.daysOfWeek.length > 0) {
          for (const day of data.daysOfWeek) {
            if (!validDays.includes(day.toLowerCase())) {
              errors.push(`daysOfWeek: "${day}" is not a valid day of the week`);
            }
          }
        }
        
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (data.startTime && !timeRegex.test(data.startTime)) {
          errors.push('startTime: Must be in HH:MM format');
        }
        if (data.endTime && !timeRegex.test(data.endTime)) {
          errors.push('endTime: Must be in HH:MM format');
        }
      } else {
        // For updates, use update schema
        const result = updateShiftSchema.safeParse(data);
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
        return [...basePermissions, 'shift.create'];
      case 'update':
        return [...basePermissions, 'shift.update'];
      case 'delete':
        return [...basePermissions, 'shift.delete'];
      default:
        return basePermissions;
    }
  },
  
  async validateBusinessRules(data: ShiftData, context: ValidationContext) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Time validation
    if (data.startTime && data.endTime) {
      const [startHour, startMin] = data.startTime.split(':').map(Number);
      const [endHour, endMin] = data.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (startMinutes >= endMinutes) {
        errors.push('End time must be after start time');
      }
      
      // Warn about very short shifts
      if (endMinutes - startMinutes < 60) {
        warnings.push('Shift duration is less than 1 hour');
      }
      
      // Warn about very long shifts
      if (endMinutes - startMinutes > 12 * 60) {
        warnings.push('Shift duration is more than 12 hours');
      }
    }
    
    // Max slots validation
    if (data.maxSlots && data.maxSlots > 50) {
      warnings.push('High number of maximum slots - ensure this is intentional');
    }
    
    // Position validation
    if (data.position && data.position.trim().length < 2) {
      warnings.push('Position name is very short');
    }
    
    // Subscription deadline validation
    if (data.subscriptionDeadline) {
      const deadline = new Date(data.subscriptionDeadline);
      const now = new Date();
      
      if (deadline < now) {
        warnings.push('Subscription deadline is in the past');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  async assembleShifts(shiftsData: any[], user: any, operation: 'create' | 'update') {
    // Extracted from validation-package-service.ts assemblePackageFromRequest method
    return shiftsData.map(shift => {
      const shiftData: ShiftData = {
        ...shift,
        id: shift?.id || undefined,
        // Normalize day of week to lowercase for consistency
        dayOfWeek: shift.dayOfWeek?.toLowerCase() || '',
        // Ensure maxSlots is a number
        maxSlots: Number(shift.maxSlots) || 1
      };
      
      return shiftData;
    });
  }
};