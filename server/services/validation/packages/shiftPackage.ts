import { insertShiftSchema, updateShiftSchema } from '@shared/schema';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

/**
 * Shift Validation Package - VE30PackageBuilder Standard
 * Converted from function-based implementation to VE30PackageBuilder configuration
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

// Business rules for shifts
const shiftBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Title validation
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Shift title is required');
    } else if (data.title.length > 100) {
      errors.push('Shift title must be 100 characters or less');
    }

    // Time validation
    if (!data.startTime) {
      errors.push('Start time is required');
    }
    if (!data.endTime) {
      errors.push('End time is required');
    }
    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      errors.push('End time must be after start time');
    }

    // Max slots validation
    if (!data.maxSlots || typeof data.maxSlots !== 'number' || data.maxSlots < 1) {
      errors.push('Max slots must be a positive number');
    } else if (data.maxSlots > 50) {
      warnings.push('Large number of slots - verify this is correct');
    }

    // Days of week validation
    if (!data.daysOfWeek || !Array.isArray(data.daysOfWeek) || data.daysOfWeek.length === 0) {
      errors.push('At least one day of the week must be selected');
    }

    return { warnings, errors };
  },

  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // User context validation
    if (!context?.user) {
      errors.push('User context required for shift operations');
      return { warnings, errors };
    }

    // Week schedule validation for creation
    if (!data.weekScheduleId && data.id === undefined) {
      errors.push('Week schedule ID is required for new shifts');
    }

    // Subscription deadline validation
    if (data.subscriptionDeadline) {
      const deadline = new Date(data.subscriptionDeadline);
      if (isNaN(deadline.getTime())) {
        warnings.push('Invalid subscription deadline format');
      }
    }

    return { warnings, errors };
  }
];

// Custom assembly function for shifts
const shiftAssembly = (rawData: any, user: any, operation: string) => {
  return {
    weekScheduleId: parseInt(rawData.weekScheduleId) || rawData.weekScheduleId,
    title: rawData.title?.trim(),
    position: rawData.position?.trim() || null,
    daysOfWeek: Array.isArray(rawData.daysOfWeek) ? rawData.daysOfWeek : [],
    startTime: rawData.startTime,
    endTime: rawData.endTime,
    maxSlots: parseInt(rawData.maxSlots) || rawData.maxSlots,
    subscriptionDeadline: rawData.subscriptionDeadline ? new Date(rawData.subscriptionDeadline) : null,
    competencyRequirements: rawData.competencyRequirements || [],
    // Include ID for update operations
    ...(operation === 'update' && rawData.id && { id: rawData.id })
  };
};

// VE30PackageBuilder-based package (STANDARDIZED from working function-based)
export const shiftPackage: VE30Package = {
  entityType: 'shift',
  validateSchema: (data: any, operation: string) => VE30PackageBuilder.validateSchema(data, operation, operation === 'update' ? updateShiftSchema : insertShiftSchema),
  getRequiredPermissions: (operation: string) => VE30PackageBuilder.getRequiredPermissions(operation, 'shift'),
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, shiftBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, shiftAssembly)
};

export type ShiftPackage = typeof shiftPackage;