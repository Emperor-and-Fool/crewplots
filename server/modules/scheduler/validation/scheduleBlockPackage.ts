import { insertScheduleBlockSchema } from '@shared/schema';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';
import { z } from 'zod';

/**
 * Schedule Block Validation Package - VE30PackageBuilder Standard
 * COMPLIANT with userListPackage pattern using operation-appropriate schemas
 */

// List operations schema - handles empty data objects like userListPackage
export const scheduleBlockListSchema = z.object({
  filters: z.object({
    locationId: z.number().optional(),
    isActive: z.boolean().optional(),
    searchTerm: z.string().optional()
  }).optional()
});

// ID-only schema for delete operations
export const scheduleBlockDeleteSchema = z.object({
  id: z.number().positive()
});

export interface ScheduleBlockData {
  id?: number;
  name: string;
  description?: string;
  locationId: number;
  maxWeeks?: number | null;
  weekStructureLocked?: boolean;
  isActive: boolean;
  createdBy?: number;
}

// Business rules for schedule blocks
const scheduleBlockBusinessRules = [
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Name validation
    if (data.name && data.name.trim().length === 0) {
      errors.push('Schedule block name cannot be empty');
    } else if (data.name && data.name.length > 100) {
      errors.push('Schedule block name must be 100 characters or less');
    }

    // Location validation
    if (data.locationId && (typeof data.locationId !== 'number' || data.locationId <= 0)) {
      errors.push('Valid location ID is required');
    }

    // Description validation
    if (data.description && data.description.length > 500) {
      warnings.push('Description is quite long - consider being more concise');
    }

    return { warnings, errors };
  },

  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // User context validation
    if (context?.user && context.operation !== 'list' && context.operation !== 'read') {
      // Active status validation
      if (data.hasOwnProperty('isActive') && typeof data.isActive !== 'boolean') {
        errors.push('Active status must be true or false');
      }
    }

    return { warnings, errors };
  },

  // Week structure lock immutability validation rule
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Week structure lock validation for update operations
    if (context?.operation === 'update' && data.hasOwnProperty('maxWeeks')) {
      // Check if trying to modify week count on locked schedule
      if (context.existingData?.weekStructureLocked) {
        errors.push('Cannot modify week count - week structure is locked. Week schedules already exist.');
      }
      
      // Warning when week count is being set (potential lock point)
      if (data.maxWeeks && !context.existingData?.maxWeeks) {
        warnings.push('Setting week count will lock the week structure after first week schedule is created');
      }
    }

    // Week structure lock status validation
    if (data.hasOwnProperty('weekStructureLocked') && typeof data.weekStructureLocked !== 'boolean') {
      errors.push('Week structure lock status must be true or false');
    }

    return { warnings, errors };
  },

  // Cascade deletion validation rule
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (context?.operation === 'delete' && data.id) {
      // Validate cascade deletion permissions
      if (!context.user?.permissions?.includes('schedule.delete')) {
        errors.push('Insufficient permissions for cascade deletion');
      }
      
      // Warning about cascade effects
      warnings.push('This will permanently delete all week schedules and shifts within this schedule block');
    }

    return { warnings, errors };
  }
];

// Assembly function for schedule blocks
const scheduleBlockAssembly = (rawData: any, user: any, operation: string) => {
  if (operation === 'delete') {
    return {
      id: rawData.id,
      cascadeDelete: rawData.cascadeDelete ?? true  // Allow frontend to control cascade behavior, default to true for safety
    };
  }
  
  if (operation === 'read') {
    return {
      id: rawData.id,
      // Preserve includeDeleteInfo flag for deletion info queries (historical ValidationPackageService pattern)
      ...(rawData.includeDeleteInfo && { includeDeleteInfo: rawData.includeDeleteInfo })
    };
  }
  
  const baseData = {
    name: rawData.name?.trim(),
    description: rawData.description?.trim() || null,
    locationId: parseInt(rawData.locationId) || rawData.locationId,
    isActive: Boolean(rawData.isActive),
    createdBy: user?.id || rawData.createdBy,
    // Include ID for update operations
    ...(operation === 'update' && rawData.id && { id: rawData.id })
  };

  // Include maxWeeks only for create operations or update when not locked
  if (operation === 'create' && rawData.maxWeeks !== undefined) {
    baseData.maxWeeks = parseInt(rawData.maxWeeks) || null;
  }

  // Handle weekStructureLocked field for both create and update
  if (rawData.hasOwnProperty('weekStructureLocked')) {
    baseData.weekStructureLocked = Boolean(rawData.weekStructureLocked);
  }

  return baseData;
};

// VE30PackageBuilder-based schedule block package (COMPLIANT like userListPackage)
export const scheduleBlockPackage: VE30Package = {
  entityType: 'scheduleBlock',
  
  // Operation-appropriate schema validation like userListPackage
  validateSchema: (data: any, operation: string) => {
    // Use list schema for list/read operations (handles empty data {})
    if (operation === 'list' || operation === 'read') {
      return VE30PackageBuilder.validateSchema(data, operation, scheduleBlockListSchema);
    }
    // Use delete schema for delete operations (ID-only)
    if (operation === 'delete') {
      return VE30PackageBuilder.validateSchema(data, operation, scheduleBlockDeleteSchema);
    }
    // Use insert schema for create/update operations
    return VE30PackageBuilder.validateSchema(data, operation, insertScheduleBlockSchema);
  },
  
  // Custom permissions like userListPackage (bypasses centralized mapper)
  getRequiredPermissions: (operation: string) => {
    if (operation === 'list' || operation === 'read') return ['schedule.read'];
    if (operation === 'create') return ['schedule.read', 'schedule.create'];
    if (operation === 'update') return ['schedule.read', 'schedule.update'];
    if (operation === 'delete') return ['schedule.read', 'schedule.delete'];
    return ['schedule.read'];
  },
  
  // Standard VE30PackageBuilder business rules
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, scheduleBlockBusinessRules),
  
  // Standard VE30PackageBuilder assembly
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, scheduleBlockAssembly),
  
  // Storage actions implementation - Plan 066 Phase 2
  storageActions: {
    executeCreate: async (data, storage) => await storage.createScheduleBlock(data),
    executeRead: async (data, storage) => await storage.getScheduleBlock(data.id),
    executeUpdate: async (data, storage) => await storage.updateScheduleBlock(data.id, data),
    executeDelete: async (data, storage) => {
      console.log('📦 SCHEDULE BLOCK DELETE: Starting package-driven deletion with cascade');
      
      // CRITICAL SAFETY CHECK: Verify the schedule block exists and get its info
      const targetBlock = await storage.getScheduleBlock(data.id);
      if (!targetBlock) {
        throw new Error(`⚠️ SAFETY CHECK FAILED: Schedule block ${data.id} not found - aborting deletion`);
      }
      console.log(`🛡️ SAFETY CHECK: Confirmed schedule block exists - ID: ${targetBlock.id}, Name: "${targetBlock.name}"`);
      
      // Handle cascade deletion (copied from ValidationEngine30.ts.bak lines 574-597)
      if (data.cascadeDelete) {
        console.log('🔥 CASCADE DELETE: Starting Russian Doll cascade deletion for schedule block:', data.id);
        
        // CRITICAL SAFETY CHECK: Verify database state BEFORE deletion
        const allBlocksBefore = await storage.getScheduleBlocks();
        const allWeeksBefore = await storage.getWeekSchedules();
        console.log(`🛡️ PRE-DELETE STATE: Total schedule blocks: ${allBlocksBefore.length}, Total week schedules: ${allWeeksBefore.length}`);
        
        // Step 1: Get all week schedules for this specific block
        const weekSchedules = await storage.getWeekSchedulesByScheduleBlock(data.id);
        console.log(`🔥 CASCADE DELETE: Found ${weekSchedules.length} week schedules to cascade delete for block ${data.id}`);
        console.log(`🔍 WEEK SCHEDULES TO DELETE:`, weekSchedules.map(w => `ID:${w.id} Block:${w.scheduleBlockId}`));
        
        // CRITICAL SAFETY BOUNDARY CHECK: Verify all week schedules belong to target block
        const invalidWeeks = weekSchedules.filter(week => week.scheduleBlockId !== data.id);
        if (invalidWeeks.length > 0) {
          throw new Error(`🚨 BOUNDARY VIOLATION: Found week schedules not belonging to block ${data.id}: ${invalidWeeks.map(w => w.id).join(', ')}`);
        }
        console.log(`✅ BOUNDARY CHECK PASSED: All ${weekSchedules.length} week schedules belong to block ${data.id}`);
        
        // Step 2: Delete all week schedules (which cascade delete their shifts automatically)
        for (const week of weekSchedules) {
          console.log(`🔥 CASCADE DELETE: Deleting week schedule ${week.id} (scheduleBlockId: ${week.scheduleBlockId}, including its shifts)`);
          
          // Additional safety check per week schedule
          if (week.scheduleBlockId !== data.id) {
            throw new Error(`🚨 CRITICAL SAFETY VIOLATION: Week schedule ${week.id} belongs to block ${week.scheduleBlockId}, not target block ${data.id}`);
          }
          
          await storage.deleteWeekSchedule(week.id);  // This already cascades to shifts in storage layer
          console.log(`✅ Week schedule ${week.id} deleted successfully`);
        }
        
        // Step 3: Delete the schedule block itself
        console.log('🔥 CASCADE DELETE: Deleting schedule block (final step)');
        const result = await storage.deleteScheduleBlock(data.id);
        
        // CRITICAL SAFETY CHECK: Verify database state AFTER deletion
        const allBlocksAfter = await storage.getScheduleBlocks();
        const allWeeksAfter = await storage.getWeekSchedules();
        console.log(`🛡️ POST-DELETE STATE: Total schedule blocks: ${allBlocksAfter.length}, Total week schedules: ${allWeeksAfter.length}`);
        
        // Verify deletion boundaries were respected
        const expectedBlocksAfter = allBlocksBefore.length - 1;
        const expectedWeeksAfter = allWeeksBefore.length - weekSchedules.length;
        
        if (allBlocksAfter.length !== expectedBlocksAfter) {
          console.error(`🚨 OVER-DELETION DETECTED: Expected ${expectedBlocksAfter} blocks, found ${allBlocksAfter.length}`);
          throw new Error(`🚨 CRITICAL DATA INTEGRITY VIOLATION: Expected ${expectedBlocksAfter} schedule blocks after deletion, but found ${allBlocksAfter.length}`);
        }
        
        if (allWeeksAfter.length !== expectedWeeksAfter) {
          console.error(`🚨 OVER-DELETION DETECTED: Expected ${expectedWeeksAfter} weeks, found ${allWeeksAfter.length}`);
          throw new Error(`🚨 CRITICAL DATA INTEGRITY VIOLATION: Expected ${expectedWeeksAfter} week schedules after deletion, but found ${allWeeksAfter.length}`);
        }
        
        console.log(`💾 CASCADE DELETE COMPLETED: Schedule block ${data.id} and all related data deleted`);
        console.log(`✅ SAFETY VERIFIED: Deletion boundaries respected - only target data removed`);
        return result;
      } else {
        // Standard simple deletion (may fail with foreign key constraints)
        console.log('⚠️  SIMPLE DELETE: Attempting non-cascade deletion (may fail with foreign keys)');
        const result = await storage.deleteScheduleBlock(data.id);
        console.log('💾 Schedule block deleted ID:', data.id);
        return result;
      }
    },
    executeList: async (data, storage) => {
      console.log('📦 STORAGE ACTION DEBUG: executeList called with data:', JSON.stringify(data));
      // Handle location filtering for schedule blocks
      if (data.filters?.locationId) {
        console.log('📦 STORAGE ACTION DEBUG: Using location filter:', data.filters.locationId);
        const result = await storage.getScheduleBlocksByLocation(data.filters.locationId);
        console.log('📦 STORAGE ACTION DEBUG: Location-filtered result:', result?.length || 'null');
        return result;
      }
      console.log('📦 STORAGE ACTION DEBUG: Getting all schedule blocks');
      const result = await storage.getScheduleBlocks();
      console.log('📦 STORAGE ACTION DEBUG: All schedule blocks result:', result?.length || 'null', result);
      return result;
    }
  }
};

export type ScheduleBlockPackage = typeof scheduleBlockPackage;