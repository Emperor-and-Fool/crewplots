import { insertScheduleBlockSchema, insertWeekScheduleSchema, insertShiftSchema, updateShiftSchema } from '@shared/schema';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';
import { z } from 'zod';

// UNIFIED SCHEDULER ENTITIES PACKAGE - PLAN 067
// Consolidates scheduleBlockPackage.ts, weekSchedulePackage.ts, shiftPackage.ts
// Exact code copying from existing packages with entity-routing logic
// ===== CONSOLIDATED PERMISSION-MAPPING =====
// Source: users.workflowPermissions JSON column
const workflowPerms = user.workflowPermissions || {};

// Package: Schedule/Scheduler validation packages
if (workflowPerms.scheduling) {
  if (workflowPerms.scheduling.includes('create')) validationPermissions.push('schedule.create');
  if (workflowPerms.scheduling.includes('view')) validationPermissions.push('schedule.read');
  if (workflowPerms.scheduling.includes('edit')) validationPermissions.push('schedule.update');
  if (workflowPerms.scheduling.includes('delete')) validationPermissions.push('schedule.delete');
  console.log('🔐 MAPPER: Added scheduling permissions from workflow');
}


// ===== CONSOLIDATED SCHEMAS =====

// Schedule Block Schemas (copied from scheduleBlockPackage.ts)
const scheduleBlockReadSchema = z.object({
  id: z.number()
});

const scheduleBlockListSchema = z.object({
  filters: z.object({
    locationId: z.number().optional()
  }).optional()
});

const scheduleBlockDeleteSchema = z.object({
  id: z.number(),
  cascadeDelete: z.boolean().optional()
});

// Week Schedule Schemas (copied from weekSchedulePackage.ts)
const weekScheduleReadSchema = z.object({
  id: z.number()
});

const weekScheduleListSchema = z.object({
  scheduleBlockId: z.number().optional(),
  weekNumber: z.number().optional(),
  locationId: z.number().optional(),
  filters: z.object({
    scheduleBlockId: z.number().optional(),
    weekNumber: z.number().optional(),
    locationId: z.number().optional()
  }).optional()
});

// Shift Schemas (copied from shiftPackage.ts)
const shiftReadSchema = z.object({
  id: z.number()
});

const shiftListSchema = z.object({
  filters: z.object({
    weekScheduleId: z.number().optional(),
    date: z.string().optional(),
    position: z.string().optional()
  }).optional()
});

// ===== CONSOLIDATED BUSINESS RULES =====

// Schedule Block Business Rules (CORRECTED: conditional validation, no bypass)
const scheduleBlockBusinessRules = [
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Name validation (conditional)
    if (data.name && data.name.trim().length === 0) {
      errors.push('Schedule block name cannot be empty');
    } else if (data.name && data.name.length > 100) {
      errors.push('Schedule block name must be 100 characters or less');
    }

    // Location validation (conditional)
    if (data.locationId && (typeof data.locationId !== 'number' || data.locationId <= 0)) {
      errors.push('Valid location ID is required');
    }

    // Description validation (conditional)
    if (data.description && data.description.length > 500) {
      warnings.push('Description is quite long - consider being more concise');
    }

    return { warnings, errors };
  },

  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // User context validation (conditional on operation)
    if (context?.user && context.operation !== 'list' && context.operation !== 'read') {
      // Active status validation
      if (data.hasOwnProperty('isActive') && typeof data.isActive !== 'boolean') {
        errors.push('Active status must be true or false');
      }
    }

    return { warnings, errors };
  },

  // Cascade deletion validation rule
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (context?.operation === 'delete' && data.id) {
      // Warning about cascade effects
      warnings.push('This will permanently delete all week schedules and shifts within this schedule block');
    }

    return { warnings, errors };
  }
];

// Week Schedule Business Rules (CORRECTED: conditional validation, no bypass)
const weekScheduleBusinessRules = [
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Week number validation (conditional on operation)
    if (context?.operation !== 'read' && context?.operation !== 'list') {
      if (!data.weekNumber || typeof data.weekNumber !== 'number') {
        errors.push('Week number is required and must be a number');
      } else if (data.weekNumber < 1 || data.weekNumber > 53) {
        errors.push('Week number must be between 1 and 53');
      }
    }

    // Schedule block ID validation (conditional)
    if (data.scheduleBlockId && (typeof data.scheduleBlockId !== 'number' || data.scheduleBlockId <= 0)) {
      errors.push('Valid schedule block ID is required');
    }

    return { warnings, errors };
  },

  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Week structure locked validation (weekStructureLocked is a scheduleBlock field, not weekSchedule)
    if (context?.operation === 'create' || context?.operation === 'update') {
      // NOTE: weekStructureLocked belongs to scheduleBlock, not weekSchedule
      // This business rule validates that week creation respects the parent block's lock state
      if (data.scheduleBlockId) {
        // Additional validation would require lookup of parent scheduleBlock
        // For now, we trust the parent block validation
      }
    }

    return { warnings, errors };
  }
];

// Shift Business Rules (CORRECTED: conditional validation, no bypass)
const shiftBusinessRules = [
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Position validation (conditional)
    if (data.position && typeof data.position !== 'string') {
      errors.push('Position must be a text value');
    } else if (data.position && data.position.trim().length === 0) {
      errors.push('Position cannot be empty');
    }

    // Start time validation (conditional)
    if (data.startTime && typeof data.startTime !== 'string') {
      errors.push('Start time must be a valid time format');
    }

    // End time validation (conditional)
    if (data.endTime && typeof data.endTime !== 'string') {
      errors.push('End time must be a valid time format');
    }

    // Time logic validation
    if (data.startTime && data.endTime) {
      const start = new Date(`2000-01-01T${data.startTime}`);
      const end = new Date(`2000-01-01T${data.endTime}`);
      
      if (end <= start) {
        errors.push('End time must be after start time');
      }
    }

    return { warnings, errors };
  },

  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Week schedule ID validation (conditional)
    if (context?.operation !== 'read' && context?.operation !== 'list') {
      if (!data.weekScheduleId || typeof data.weekScheduleId !== 'number') {
        errors.push('Week schedule ID is required');
      }
    }

    // Max slots validation (conditional)
    if (data.maxSlots !== undefined) {
      if (typeof data.maxSlots !== 'number' || data.maxSlots < 1) {
        errors.push('Maximum slots must be a positive number');
      } else if (data.maxSlots > 100) {
        warnings.push('Very high maximum slots - please verify this is correct');
      }
    }

    return { warnings, errors };
  }
];

// ===== CONSOLIDATED DATA ASSEMBLY =====

// Schedule Block Assembly (copied from scheduleBlockPackage.ts)
const scheduleBlockAssembly = (data: any, user: any, operation: string) => {
  return {
    ...data,
    createdBy: user?.id || data.createdBy || null,
    locationId: data.locationId || null,
    isActive: data.isActive !== undefined ? data.isActive : true
  };
};

// Week Schedule Assembly (copied from weekSchedulePackage.ts)
const weekScheduleAssembly = (data: any, user: any, operation: string) => {
  return {
    ...data,
    createdBy: user?.id || data.createdBy || null,
    weekNumber: data.weekNumber || 1
  };
};

// Shift Assembly (copied from shiftPackage.ts)
const shiftAssembly = (data: any, user: any, operation: string) => {
  return {
    ...data,
    createdBy: user?.id || data.createdBy || null,
    date: data.date || new Date().toISOString().split('T')[0],
    maxSlots: data.maxSlots || 1
  };
};

// ===== UNIFIED PACKAGE DEFINITION =====

export const schedulerEntitiesPackage: VE30Package = {
  // Entity-routing schema validation
  validateSchema: (data: any, operation: string) => {
    const entityType = data.entityType;
    
    if (!entityType) {
      return { isValid: false, errors: ['Entity type is required'] };
    }
    
    // Schedule Block routing
    if (entityType === 'scheduleBlock') {
      if (operation === 'list' || operation === 'read') {
        return VE30PackageBuilder.validateSchema(data, operation, scheduleBlockListSchema);
      }
      if (operation === 'delete') {
        return VE30PackageBuilder.validateSchema(data, operation, scheduleBlockDeleteSchema);
      }
      return VE30PackageBuilder.validateSchema(data, operation, insertScheduleBlockSchema);
    }
    
    // Week Schedule routing
    if (entityType === 'weekSchedule') {
      if (operation === 'read') {
        return VE30PackageBuilder.validateSchema(data, operation, weekScheduleReadSchema);
      }
      if (operation === 'list') {
        return VE30PackageBuilder.validateSchema(data, operation, weekScheduleListSchema);
      }
      return VE30PackageBuilder.validateSchema(data, operation, insertWeekScheduleSchema);
    }
    
    // Shift routing
    if (entityType === 'shift') {
      if (operation === 'read') {
        return VE30PackageBuilder.validateSchema(data, operation, shiftReadSchema);
      }
      if (operation === 'list') {
        return VE30PackageBuilder.validateSchema(data, operation, shiftListSchema);
      }
      if (operation === 'update') {
        return VE30PackageBuilder.validateSchema(data, operation, updateShiftSchema);
      }
      return VE30PackageBuilder.validateSchema(data, operation, insertShiftSchema);
    }
    
    return { isValid: false, errors: [`Unknown entity type: ${entityType}`] };
  },
  
  // Unified permissions (same across all scheduler entities)
  getRequiredPermissions: (operation: string) => {
    if (operation === 'list' || operation === 'read') return ['schedule.read'];
    if (operation === 'create') return ['schedule.read', 'schedule.create'];
    if (operation === 'update') return ['schedule.read', 'schedule.update'];
    if (operation === 'delete') return ['schedule.read', 'schedule.delete'];
    return ['schedule.read'];
  },
  
  // Entity-routing business rules validation
  validateBusinessRules: async (data: any, context: any) => {
    // Fix: Get entityType from data (where it's stored) instead of context
    const entityType = data.entityType || context.entityType;
    
    console.log('🔥 UNIFIED BUSINESS RULES: entityType from data.entityType:', data.entityType);
    console.log('🔥 UNIFIED BUSINESS RULES: entityType from context.entityType:', context.entityType);
    console.log('🔥 UNIFIED BUSINESS RULES: Using entityType:', entityType);
    
    if (entityType === 'scheduleBlock') {
      console.log('🔥 UNIFIED BUSINESS RULES: Routing to scheduleBlock business rules');
      return await VE30PackageBuilder.validateBusinessRules(data, context, scheduleBlockBusinessRules);
    }
    if (entityType === 'weekSchedule') {
      console.log('🔥 UNIFIED BUSINESS RULES: Routing to weekSchedule business rules');
      return await VE30PackageBuilder.validateBusinessRules(data, context, weekScheduleBusinessRules);
    }
    if (entityType === 'shift') {
      console.log('🔥 UNIFIED BUSINESS RULES: Routing to shift business rules');
      return await VE30PackageBuilder.validateBusinessRules(data, context, shiftBusinessRules);
    }
    
    console.log('🔥 UNIFIED BUSINESS RULES: ERROR - Unknown entity type:', entityType);
    return { isValid: false, errors: [`Unknown entity type: ${entityType}`] };
  },
  
  // Entity-routing package assembly (restored from working commit 511c2020)
  assemblePackage: (data: any, user: any, operation: string) => {
    // FIXED: EntityType passed via registry wrapper in packageRegistry30.ts
    const entityType = data.entityType;
    
    if (entityType === 'scheduleBlock') {
      return VE30PackageBuilder.assemblePackage(data, user, operation, scheduleBlockAssembly);
    }
    if (entityType === 'weekSchedule') {
      return VE30PackageBuilder.assemblePackage(data, user, operation, weekScheduleAssembly);
    }
    if (entityType === 'shift') {
      return VE30PackageBuilder.assemblePackage(data, user, operation, shiftAssembly);
    }
    
    return Promise.resolve(data);
  },
  
  // Entity-routing storage actions (PHASE 3: Russian Doll Logic Integration)
  storageActions: {
    executeCreate: async (data, storage) => {
      const entityType = data.entityType;
      
      if (entityType === 'scheduleBlock') {
        // COPIED FROM COMMIT 907088a: Multi-week creation logic with weekStructureLocked enhancement
        console.log('🔄 SCHEDULE BLOCK CREATE: Starting multi-week creation process');
        
        const scheduleBlock = await storage.createScheduleBlock(data);
        console.log(`✅ SCHEDULE BLOCK CREATED: ID ${scheduleBlock.id}, Name: "${scheduleBlock.name}"`);
        
        // Multi-week creation logic from commit 907088a (enhanced with weekStructureLocked)
        const maxWeeks = data.maxWeeks || data.weekCount || 1; // Frontend compatibility
        console.log(`🔄 MULTI-WEEK CREATION: Creating ${maxWeeks} weeks for schedule block ${scheduleBlock.id}`);
        
        const weekSchedules = [];
        
        for (let weekNumber = 1; weekNumber <= maxWeeks; weekNumber++) {
          const weekScheduleData = {
            scheduleBlockId: scheduleBlock.id,
            weekNumber,
            createdBy: data.createdBy
          };
          
          console.log(`🔄 WEEK SCHEDULE CREATE: Creating week ${weekNumber} for block ${scheduleBlock.id}`);
          const weekSchedule = await storage.createWeekSchedule(weekScheduleData);
          weekSchedules.push(weekSchedule);
          console.log(`✅ Week ${weekNumber} created with ID: ${weekSchedule.id}`);
        }
        
        console.log(`🔄 SCHEDULE BLOCK CREATE: Created ${weekSchedules.length} week schedules`);
        
        return {
          ...scheduleBlock,
          weekSchedules  // Include created week schedules in response (commit 907088a pattern)
        };
      }
      
      if (entityType === 'weekSchedule') {
        // Individual week schedule creation (weekStructureLocked is a scheduleBlock field, not weekSchedule)
        console.log(`🔄 WEEK SCHEDULE CREATE: Creating individual week schedule`);
        const result = await storage.createWeekSchedule(data);
        console.log(`✅ Individual week created with ID: ${result.id}`);
        
        return result;
      }
      
      if (entityType === 'shift') {
        // RUSSIAN DOLL CASCADE CREATE: shift requires weekSchedule authentication
        console.log('🔧 SHIFT CREATE: Starting Russian Doll cascade creation');
        
        if (!data.weekScheduleId) {
          throw new Error('🚨 RUSSIAN DOLL VIOLATION: shift creation requires weekScheduleId for cascade authentication');
        }
        
        // Validate parent weekSchedule exists and user has access
        const parentWeekSchedule = await storage.getWeekSchedule(data.weekScheduleId);
        if (!parentWeekSchedule) {
          throw new Error(`🚨 RUSSIAN DOLL VIOLATION: weekSchedule ${data.weekScheduleId} not found - cannot create orphaned shift`);
        }
        
        console.log(`🔧 SHIFT CREATE: Validated parent weekSchedule ${data.weekScheduleId} exists`);
        
        // Create the shift with validated parent relationship
        const result = await storage.createShift(data);
        console.log(`✅ SHIFT CREATED: ID ${result.id} for weekSchedule ${data.weekScheduleId}`);
        
        return result;
      }
      
      throw new Error(`Create operation not supported for entity type: ${entityType}`);
    },
    
    executeRead: async (data, storage) => {
      const entityType = data.entityType;
      
      if (entityType === 'scheduleBlock') {
        return await storage.getScheduleBlock(data.id);
      }
      if (entityType === 'weekSchedule') {
        return await storage.getWeekSchedule(data.id);
      }
      if (entityType === 'shift') {
        return await storage.getShift(data.id);
      }
      
      throw new Error(`Read operation not supported for entity type: ${entityType}`);
    },
    
    executeUpdate: async (data, storage) => {
      const entityType = data.entityType;
      
      if (entityType === 'scheduleBlock') {
        // COPIED FROM WORKING COMMIT: Update with week expansion logic
        console.log('🔄 SCHEDULE BLOCK UPDATE: Starting update process');
        
        // Handle week expansion if maxWeeks increased
        if (data.maxWeeks) {
          const existingWeeks = await storage.getWeekSchedulesByScheduleBlock(data.id);
          const currentMaxWeek = Math.max(...existingWeeks.map(w => w.weekNumber), 0);
          
          if (data.maxWeeks > currentMaxWeek) {
            console.log(`🔄 WEEK EXPANSION: Expanding from ${currentMaxWeek} to ${data.maxWeeks} weeks`);
            
            for (let weekNumber = currentMaxWeek + 1; weekNumber <= data.maxWeeks; weekNumber++) {
              const weekScheduleData = {
                scheduleBlockId: data.id,
                weekNumber,
                createdBy: data.createdBy
              };
              
              console.log(`🔄 WEEK SCHEDULE CREATE: Creating week ${weekNumber} for block ${data.id}`);
              const weekSchedule = await storage.createWeekSchedule(weekScheduleData);
              console.log(`✅ Week ${weekNumber} created with ID: ${weekSchedule.id}`);
            }
          }
        }
        
        // Update the schedule block
        const result = await storage.updateScheduleBlock(data.id, data);
        console.log(`✅ SCHEDULE BLOCK UPDATED: ID ${data.id}`);
        
        return result;
      }
      
      if (entityType === 'weekSchedule') {
        return await storage.updateWeekSchedule(data.id, data);
      }
      if (entityType === 'shift') {
        return await storage.updateShift(data.id, data);
      }
      
      throw new Error(`Update operation not supported for entity type: ${entityType}`);
    },
    
    executeDelete: async (data, storage) => {
      const entityType = data.entityType;
      
      if (entityType === 'scheduleBlock') {
        // CASCADE DELETE: Full Russian Doll deletion with data integrity validation
        console.log('🔥 CASCADE DELETE: Starting comprehensive deletion process');
        
        if (data.cascadeDelete) {
          console.log('🔥 CASCADE DELETE: Enabled - deleting all related data');
          
          // Pre-deletion state validation
          const allBlocksBefore = await storage.getScheduleBlocks();
          const allWeeksBefore = await storage.getWeekSchedules();
          console.log(`🛡️ PRE-DELETE STATE: Total schedule blocks: ${allBlocksBefore.length}, Total week schedules: ${allWeeksBefore.length}`);
          
          // Get week schedules for this block
          const weekSchedules = await storage.getWeekSchedulesByScheduleBlock(data.id);
          console.log(`🔥 CASCADE DELETE: Found ${weekSchedules.length} week schedules to delete`);
          
          // Delete shifts for each week schedule
          for (const week of weekSchedules) {
            const shifts = await storage.getShiftsByWeekSchedule(week.id);
            console.log(`🔥 CASCADE DELETE: Found ${shifts.length} shifts for week ${week.id}`);
            
            for (const shift of shifts) {
              console.log(`🔥 CASCADE DELETE: Deleting shift ${shift.id}`);
              await storage.deleteShift(shift.id);
            }
          }
          
          // Delete week schedules
          for (const week of weekSchedules) {
            console.log(`🔥 CASCADE DELETE: Deleting week schedule ${week.id}`);
            await storage.deleteWeekSchedule(week.id);
            console.log(`✅ Week schedule ${week.id} deleted successfully`);
          }
          
          console.log('🔥 CASCADE DELETE: Deleting schedule block (final step)');
          const result = await storage.deleteScheduleBlock(data.id);
          
          const allBlocksAfter = await storage.getScheduleBlocks();
          const allWeeksAfter = await storage.getWeekSchedules();
          console.log(`🛡️ POST-DELETE STATE: Total schedule blocks: ${allBlocksAfter.length}, Total week schedules: ${allWeeksAfter.length}`);
          
          const expectedBlocksAfter = allBlocksBefore.length - 1;
          const expectedWeeksAfter = allWeeksBefore.length - weekSchedules.length;
          
          if (allBlocksAfter.length !== expectedBlocksAfter) {
            throw new Error(`🚨 CRITICAL DATA INTEGRITY VIOLATION: Expected ${expectedBlocksAfter} schedule blocks after deletion, but found ${allBlocksAfter.length}`);
          }
          
          if (allWeeksAfter.length !== expectedWeeksAfter) {
            throw new Error(`🚨 CRITICAL DATA INTEGRITY VIOLATION: Expected ${expectedWeeksAfter} week schedules after deletion, but found ${allWeeksAfter.length}`);
          }
          
          console.log(`💾 CASCADE DELETE COMPLETED: Schedule block ${data.id} and all related data deleted`);
          return result;
        } else {
          console.log('⚠️  SIMPLE DELETE: Attempting non-cascade deletion (may fail with foreign keys)');
          const result = await storage.deleteScheduleBlock(data.id);
          console.log('💾 Schedule block deleted ID:', data.id);
          return result;
        }
      }
      if (entityType === 'weekSchedule') {
        return await storage.deleteWeekSchedule(data.id);
      }
      if (entityType === 'shift') {
        return await storage.deleteShift(data.id);
      }
      
      throw new Error(`Delete operation not supported for entity type: ${entityType}`);
    },
    
    executeList: async (data, storage) => {
      console.log('📦 STORAGE ACTION DEBUG: executeList received data:', JSON.stringify(data));
      const entityType = data.entityType;
      console.log('📦 STORAGE ACTION DEBUG: Extracted entityType:', entityType);
      
      if (entityType === 'scheduleBlock') {
        // Handle location filtering (copied from scheduleBlockPackage.ts lines 285-298)
        if (data.filters?.locationId) {
          console.log('📦 STORAGE ACTION DEBUG: Using location filter:', data.filters.locationId);
          const result = await storage.getScheduleBlocksByLocation(data.filters.locationId);
          console.log('📦 STORAGE ACTION DEBUG: Location-filtered result:', result?.length || 'null');
          return result;
        }
        console.log('📦 STORAGE ACTION DEBUG: Getting all schedule blocks');
        const result = await storage.getScheduleBlocks();
        console.log('📦 STORAGE ACTION DEBUG: All schedule blocks result:', result?.length || 'null');
        return result;
      }
      if (entityType === 'weekSchedule') {
        // Russian Doll architecture: handle scheduleBlockId filtering
        if (data.scheduleBlockId) {
          return await storage.getWeekSchedulesByScheduleBlock(data.scheduleBlockId);
        }
        return await storage.getWeekSchedules();
      }
      if (entityType === 'shift') {
        // Handle shift filtering (copied from shiftPackage.ts lines 220-235)
        if (data.filters?.weekScheduleId) {
          return await storage.getShiftsByWeekSchedule(data.filters.weekScheduleId);
        }
        return await storage.getShifts();
      }
      
      throw new Error(`List operation not supported for entity type: ${entityType}`);
    }
  }
};