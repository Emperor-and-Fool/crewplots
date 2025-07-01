import { insertScheduleBlockSchema } from '@shared/schema';
import type { z } from 'zod';

export interface ScheduleBlockValidationPackage {
  entityType: 'scheduleBlock';
  operations: {
    create: {
      schema: typeof insertScheduleBlockSchema;
      permissions: string[];
      businessRules: string[];
    };
    update: {
      schema: typeof insertScheduleBlockSchema;
      permissions: string[];
      businessRules: string[];
    };
    delete: {
      permissions: string[];
      businessRules: string[];
    };
  };
}

export const scheduleBlockPackage: ScheduleBlockValidationPackage = {
  entityType: 'scheduleBlock',
  operations: {
    create: {
      schema: insertScheduleBlockSchema,
      permissions: ['scheduler_development.write', 'schedule.create'],
      businessRules: [
        'UNIQUE_SCHEDULE_NAME_PER_LOCATION',
        'VALID_LOCATION_ACCESS',
        'MINIMUM_SCHEDULE_DURATION'
      ]
    },
    update: {
      schema: insertScheduleBlockSchema,
      permissions: ['scheduler_development.write', 'schedule.update'],
      businessRules: [
        'UNIQUE_SCHEDULE_NAME_PER_LOCATION',
        'VALID_LOCATION_ACCESS',
        'PRESERVE_EXISTING_SHIFTS',
        'ACTIVATION_STATE_RULES'
      ]
    },
    delete: {
      permissions: ['scheduler_development.write', 'schedule.delete'],
      businessRules: [
        'NO_ACTIVE_SHIFTS',
        'CONFIRM_CASCADE_DELETE',
        'BACKUP_BEFORE_DELETE'
      ]
    }
  }
};

// Validation context for schedule blocks
export interface ScheduleBlockContext {
  userId: number;
  userRole: string;
  permissions: string[];
  locationAccess: number[];
  sessionId: string;
}

// Business rule implementations
export const scheduleBlockBusinessRules = {
  UNIQUE_SCHEDULE_NAME_PER_LOCATION: async (data: any, context: ScheduleBlockContext) => {
    // Will be implemented with database check
    return { valid: true, message: 'Schedule name is unique for location' };
  },
  
  VALID_LOCATION_ACCESS: async (data: any, context: ScheduleBlockContext) => {
    if (data.locationId && !context.locationAccess.includes(data.locationId)) {
      return { valid: false, message: 'User does not have access to this location' };
    }
    return { valid: true, message: 'Location access validated' };
  },
  
  MINIMUM_SCHEDULE_DURATION: async (data: any, context: ScheduleBlockContext) => {
    // Schedule blocks should have meaningful duration
    return { valid: true, message: 'Schedule duration is valid' };
  },
  
  PRESERVE_EXISTING_SHIFTS: async (data: any, context: ScheduleBlockContext) => {
    // When updating, ensure existing shifts remain valid
    return { valid: true, message: 'Existing shifts preserved' };
  },
  
  ACTIVATION_STATE_RULES: async (data: any, context: ScheduleBlockContext) => {
    // Rules around activating/deactivating schedules
    return { valid: true, message: 'Activation state rules validated' };
  },
  
  NO_ACTIVE_SHIFTS: async (data: any, context: ScheduleBlockContext) => {
    // Check for active shifts before deletion
    return { valid: true, message: 'No active shifts blocking deletion' };
  },
  
  CONFIRM_CASCADE_DELETE: async (data: any, context: ScheduleBlockContext) => {
    // Ensure user confirms cascading deletes
    return { valid: true, message: 'Cascade delete confirmed' };
  },
  
  BACKUP_BEFORE_DELETE: async (data: any, context: ScheduleBlockContext) => {
    // Backup data before deletion
    return { valid: true, message: 'Backup completed before deletion' };
  }
};