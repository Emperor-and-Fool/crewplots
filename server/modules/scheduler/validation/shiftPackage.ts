import { insertShiftSchema, updateShiftSchema } from '@shared/schema';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';
import { z } from 'zod';

// READ operation schema - only needs ID
const shiftReadSchema = z.object({
  id: z.number()
});

// LIST operation schema - handles filters
const shiftListSchema = z.object({
  filters: z.object({
    weekScheduleId: z.number().optional(),
    date: z.string().optional(),
    position: z.string().optional()
  }).optional()
});

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
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Skip most validation for READ operations
    if (context?.operation === 'read' || context?.operation === 'list') {
      return { warnings, errors };
    }

    // Title validation (only for create/update)
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Shift title is required');
    } else if (data.title.length > 100) {
      errors.push('Shift title must be 100 characters or less');
    }

    // Time validation (only for create/update)
    if (!data.startTime) {
      errors.push('Start time is required');
    }
    if (!data.endTime) {
      errors.push('End time is required');
    }
    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      errors.push('End time must be after start time');
    }

    // Max slots validation (only for create/update)
    if (!data.maxSlots || typeof data.maxSlots !== 'number' || data.maxSlots < 1) {
      errors.push('Max slots must be a positive number');
    } else if (data.maxSlots > 50) {
      warnings.push('Large number of slots - verify this is correct');
    }

    // Days of week validation - Context-aware for Russian Doll operations
    if (context?.operation === 'create') {
      // Multi-day creation requires daysOfWeek array
      if (!data.daysOfWeek || !Array.isArray(data.daysOfWeek) || data.daysOfWeek.length === 0) {
        errors.push('At least one day of the week must be selected');
      }
    } else if (context?.operation === 'update') {
      // Single-shift editing - Russian Doll constraint (flexible data format)
      // Frontend may send either dayOfWeek or daysOfWeek for updates
      const hasDayOfWeek = data.dayOfWeek && typeof data.dayOfWeek === 'string';
      const hasDaysOfWeek = data.daysOfWeek && Array.isArray(data.daysOfWeek) && data.daysOfWeek.length > 0;
      
      if (!hasDayOfWeek && !hasDaysOfWeek) {
        errors.push('Day of week is required for shift editing (dayOfWeek or daysOfWeek)');
      }
      
      // Log what we received for debugging
      console.log('🔍 SHIFT VALIDATION: Update operation data format check:', {
        hasDayOfWeek,
        hasDaysOfWeek,
        dayOfWeek: data.dayOfWeek,
        daysOfWeek: data.daysOfWeek,
        operation: context?.operation
      });
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

// Custom assembly function for shifts - Russian Doll compliant
const shiftAssembly = (rawData: any, user: any, operation: string) => {
  // For READ operations, just return the ID
  if (operation === 'read') {
    return { id: rawData.id };
  }

  // For LIST operations, return filters
  if (operation === 'list') {
    return rawData.filters || {};
  }

  // For CREATE operations - multi-day array format
  if (operation === 'create') {
    return {
      weekScheduleId: parseInt(rawData.weekScheduleId) || rawData.weekScheduleId,
      title: rawData.title?.trim(),
      position: rawData.position?.trim() || null,
      daysOfWeek: Array.isArray(rawData.daysOfWeek) ? rawData.daysOfWeek : [],
      startTime: rawData.startTime,
      endTime: rawData.endTime,
      maxSlots: parseInt(rawData.maxSlots) || rawData.maxSlots,
      subscriptionDeadline: rawData.subscriptionDeadline ? new Date(rawData.subscriptionDeadline) : null,
      competencyRequirements: rawData.competencyRequirements || []
    };
  }

  // For UPDATE operations - flexible format handling (Russian Doll editing)
  if (operation === 'update') {
    const assembledData = {
      id: rawData.id,
      weekScheduleId: parseInt(rawData.weekScheduleId) || rawData.weekScheduleId,
      title: rawData.title?.trim(),
      position: rawData.position?.trim() || null,
      startTime: rawData.startTime,
      endTime: rawData.endTime,
      maxSlots: parseInt(rawData.maxSlots) || rawData.maxSlots,
      subscriptionDeadline: rawData.subscriptionDeadline ? new Date(rawData.subscriptionDeadline) : null,
      competencyRequirements: rawData.competencyRequirements || []
    };

    // Handle flexible day format for Russian Doll operations
    if (rawData.dayOfWeek) {
      assembledData.dayOfWeek = rawData.dayOfWeek;
    } else if (rawData.daysOfWeek && Array.isArray(rawData.daysOfWeek)) {
      // Convert array to single day for update operations
      assembledData.dayOfWeek = rawData.daysOfWeek[0];
      console.log('🔄 ASSEMBLY: Converted daysOfWeek array to single dayOfWeek for update:', rawData.daysOfWeek[0]);
    }

    console.log('🔄 ASSEMBLY: Update operation assembled data:', JSON.stringify(assembledData, null, 2));
    return assembledData;
  }

  // Fallback for other operations
  return rawData;
};

// VE30PackageBuilder-based package (STANDARDIZED from working function-based)
export const shiftPackage: VE30Package = {
  entityType: 'shift',
  
  // Operation-appropriate schema validation
  validateSchema: (data: any, operation: string) => {
    if (operation === 'read') {
      return VE30PackageBuilder.validateSchema(data, operation, shiftReadSchema);
    }
    if (operation === 'list') {
      return VE30PackageBuilder.validateSchema(data, operation, shiftListSchema);
    }
    return VE30PackageBuilder.validateSchema(data, operation, operation === 'update' ? updateShiftSchema : insertShiftSchema);
  },
  
  // Custom permissions for scheduler operations
  getRequiredPermissions: (operation: string) => {
    if (operation === 'list' || operation === 'read') return ['schedule.read'];
    if (operation === 'create') return ['schedule.read', 'schedule.create'];
    if (operation === 'update') return ['schedule.read', 'schedule.update'];
    if (operation === 'delete') return ['schedule.read', 'schedule.delete'];
    return ['schedule.read'];
  },
  
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, shiftBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, shiftAssembly),
  
  // Storage actions implementation - Plan 066 Phase 2 + Critical Bug Fix
  storageActions: {
    executeCreate: async (data, storage) => await storage.createShift(data),
    executeRead: async (data, storage) => await storage.getShift(data.id),
    executeUpdate: async (data, storage) => await storage.updateShift(data.id, data),
    executeDelete: async (data, storage) => await storage.deleteShift(data.id),
    executeList: async (data, storage) => {
      // CRITICAL FIX: Plan 066 lines 629-633 - Apply weekScheduleId filtering
      if (data.filters?.weekScheduleId) {
        return await storage.getShiftsByWeekSchedule(data.filters.weekScheduleId);
      }
      return await storage.getShifts();
    }
  }
};

export type ShiftPackage = typeof shiftPackage;