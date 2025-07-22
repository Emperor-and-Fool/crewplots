import { insertScheduleBlockSchema, insertWeekScheduleSchema, insertShiftSchema, updateShiftSchema } from '@shared/schema';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';
import { z } from 'zod';

// UNIFIED SCHEDULER ENTITIES PACKAGE - PLAN 067
// Consolidates scheduleBlockPackage.ts, weekSchedulePackage.ts, shiftPackage.ts
// Exact code copying from existing packages with entity-routing logic

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

      // Schedule block validation for creation (conditional)
      if (!data.scheduleBlockId && data.id === undefined) {
        errors.push('Schedule block ID is required for new week schedules');
      }
    }

    return { warnings, errors };
  },

  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // User context validation (conditional on operation)
    if (context?.operation !== 'read' && context?.operation !== 'list') {
      if (!context?.user) {
        errors.push('User context required for week schedule operations');
        return { warnings, errors };
      }

      // Template validation (conditional)
      if (data.templateId && (typeof data.templateId !== 'number' || data.templateId <= 0)) {
        warnings.push('Invalid template ID provided - will proceed without template');
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

    // Validation only for create/update operations (conditional)
    if (context?.operation !== 'read' && context?.operation !== 'list') {
      // Title validation (conditional)
      if (data.title && data.title.trim().length === 0) {
        errors.push('Shift title cannot be empty');
      } else if (data.title && data.title.length > 100) {
        errors.push('Shift title must be 100 characters or less');
      }

      // Time validation (conditional)
      if (data.startTime && data.endTime && data.startTime >= data.endTime) {
        errors.push('End time must be after start time');
      }

      // Max slots validation (conditional)
      if (data.maxSlots && (typeof data.maxSlots !== 'number' || data.maxSlots < 1)) {
        errors.push('Max slots must be a positive number');
      } else if (data.maxSlots && data.maxSlots > 50) {
        warnings.push('Large number of slots - verify this is correct');
      }

      // Days of week validation - Context-aware for Russian Doll operations
      if (context?.operation === 'create') {
        // Multi-day creation requires daysOfWeek array
        if (data.daysOfWeek && (!Array.isArray(data.daysOfWeek) || data.daysOfWeek.length === 0)) {
          errors.push('At least one day of the week must be selected');
        }
      } else if (context?.operation === 'update') {
        // Single-shift editing - Russian Doll constraint (flexible data format)
        const hasDayOfWeek = data.dayOfWeek && typeof data.dayOfWeek === 'string';
        const hasDaysOfWeek = data.daysOfWeek && Array.isArray(data.daysOfWeek) && data.daysOfWeek.length > 0;
        
        if (data.dayOfWeek || data.daysOfWeek) {
          if (!hasDayOfWeek && !hasDaysOfWeek) {
            errors.push('Day of week is required for shift editing (dayOfWeek or daysOfWeek)');
          }
        }
      }
    }

    return { warnings, errors };
  },

  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // User context validation (conditional on operation)
    if (context?.operation !== 'read' && context?.operation !== 'list') {
      if (!context?.user) {
        errors.push('User context required for shift operations');
        return { warnings, errors };
      }

      // Week schedule validation for creation (conditional)
      if (!data.weekScheduleId && data.id === undefined && context?.operation === 'create') {
        errors.push('Week schedule ID is required for new shifts');
      }

      // Subscription deadline validation (conditional)
      if (data.subscriptionDeadline) {
        const deadline = new Date(data.subscriptionDeadline);
        if (isNaN(deadline.getTime())) {
          warnings.push('Invalid subscription deadline format');
        }
      }
    }

    return { warnings, errors };
  }
];

// ===== CONSOLIDATED ASSEMBLY FUNCTIONS =====

// Schedule Block Assembly (copied from scheduleBlockPackage.ts lines 88-113)
const scheduleBlockAssembly = (rawData: any, user: any, operation: string) => {
  if (operation === 'read') {
    return { 
      id: rawData.id,
      entityType: rawData.entityType  // CRITICAL: Preserve for storage routing
    };
  }

  if (operation === 'list') {
    const assembled = {
      entityType: rawData.entityType,  // CRITICAL: Preserve for storage routing
      filters: rawData.filters || {}
    };
    console.log('🔧 SCHEDULE BLOCK ASSEMBLY [LIST]: Raw entityType:', rawData.entityType);
    console.log('🔧 SCHEDULE BLOCK ASSEMBLY [LIST]: Assembled data:', assembled);
    return assembled;
  }

  if (operation === 'delete') {
    return {
      id: rawData.id,
      entityType: rawData.entityType,  // CRITICAL: Preserve for storage routing
      cascadeDelete: rawData.cascadeDelete || false
    };
  }

  return {
    name: rawData.name?.trim(),
    description: rawData.description?.trim() || null,
    locationId: parseInt(rawData.locationId) || rawData.locationId,
    isActive: rawData.isActive !== undefined ? Boolean(rawData.isActive) : true,
    createdBy: user?.id || rawData.createdBy,
    ...(operation === 'update' && rawData.id && { id: rawData.id })
  };
};

// Week Schedule Assembly (copied from weekSchedulePackage.ts lines 88-113)
const weekScheduleAssembly = (rawData: any, user: any, operation: string) => {
  if (operation === 'read') {
    return { 
      id: rawData.id,
      entityType: rawData.entityType  // CRITICAL: Preserve for storage routing
    };
  }

  if (operation === 'list') {
    const assembled: any = {
      entityType: rawData.entityType,  // CRITICAL: Preserve for storage routing
      filters: rawData.filters || {}
    };
    if (rawData.scheduleBlockId) {
      assembled.scheduleBlockId = parseInt(rawData.scheduleBlockId);
    }
    return assembled;
  }

  return {
    scheduleBlockId: parseInt(rawData.scheduleBlockId) || rawData.scheduleBlockId,
    weekNumber: parseInt(rawData.weekNumber) || rawData.weekNumber,
    templateId: rawData.templateId ? parseInt(rawData.templateId) : null,
    createdBy: user?.id || rawData.createdBy,
    ...(operation === 'update' && rawData.id && { id: rawData.id })
  };
};

// Shift Assembly (copied from shiftPackage.ts lines 135-175)
const shiftAssembly = (rawData: any, user: any, operation: string) => {
  if (operation === 'read') {
    return { 
      id: rawData.id,
      entityType: rawData.entityType  // CRITICAL: Preserve for storage routing
    };
  }

  if (operation === 'list') {
    const assembled: any = {
      entityType: rawData.entityType,  // CRITICAL: Preserve for storage routing
      filters: rawData.filters || {}
    };
    if (rawData.weekScheduleId) {
      assembled.weekScheduleId = parseInt(rawData.weekScheduleId);
    }
    return assembled;
  }

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

  return {
    weekScheduleId: parseInt(rawData.weekScheduleId) || rawData.weekScheduleId,
    title: rawData.title?.trim(),
    position: rawData.position?.trim() || null,
    startTime: rawData.startTime,
    endTime: rawData.endTime,
    maxSlots: parseInt(rawData.maxSlots) || rawData.maxSlots,
    subscriptionDeadline: rawData.subscriptionDeadline ? new Date(rawData.subscriptionDeadline) : null,
    competencyRequirements: rawData.competencyRequirements || [],
    ...(operation === 'update' && rawData.id && { id: rawData.id })
  };
};

// ===== UNIFIED VE30 PACKAGE =====

export const schedulerEntitiesPackage: VE30Package = {
  entityType: 'schedulerEntities', // Unified entity type
  
  // Entity-routing schema validation
  validateSchema: (data: any, operation: string) => {
    const entityType = data.entityType || 'scheduleBlock'; // Default fallback
    
    // PHASE 4: Entity-type validation (Plan 067 requirement)
    if (!['scheduleBlock', 'weekSchedule', 'shift'].includes(entityType)) {
      return { isValid: false, errors: [`Invalid scheduler entity type: ${entityType}`] };
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
  
  // Entity-routing package assembly
  assemblePackage: (data: any, user: any, operation: string) => {
    // FIXED: EntityType passed via registry wrapper in packageRegistry30.ts
    const entityType = data.entityType;
    
    if (entityType === 'scheduleBlock') {
      return scheduleBlockAssembly(data, user, operation);
    }
    if (entityType === 'weekSchedule') {
      return weekScheduleAssembly(data, user, operation);
    }
    if (entityType === 'shift') {
      return shiftAssembly(data, user, operation);
    }
    
    return Promise.resolve(data);
  },
  
  // Entity-routing storage actions (PHASE 3: Russian Doll Logic Integration)
  storageActions: {
    executeCreate: async (data, storage) => {
      const entityType = data.entityType;
      
      if (entityType === 'scheduleBlock') {
        return await storage.createScheduleBlock(data);
      }
      if (entityType === 'weekSchedule') {
        return await storage.createWeekSchedule(data);
      }
      if (entityType === 'shift') {
        // PHASE 4: Multi-day shift creation logic (copied from shiftPackage.ts lines 190-225)
        if (data.daysOfWeek && Array.isArray(data.daysOfWeek) && data.daysOfWeek.length > 1) {
          console.log(`🔄 MULTI-DAY SHIFT CREATION: Creating ${data.daysOfWeek.length} shifts for days:`, data.daysOfWeek);
          
          const createdShifts = [];
          for (const dayOfWeek of data.daysOfWeek) {
            const shiftData = {
              ...data,
              dayOfWeek: dayOfWeek,
              daysOfWeek: [dayOfWeek] // Convert to single-day array for storage
            };
            
            console.log(`📅 Creating shift for ${dayOfWeek}:`, shiftData.title);
            const createdShift = await storage.createShift(shiftData);
            createdShifts.push(createdShift);
            console.log(`✅ Shift created for ${dayOfWeek} with ID:`, createdShift.id);
          }
          
          console.log(`🎉 MULTI-DAY CREATION COMPLETE: Created ${createdShifts.length} shifts`);
          return createdShifts;
        } else {
          // Single shift creation
          return await storage.createShift(data);
        }
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
        return await storage.updateScheduleBlock(data.id, data);
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
        // PHASE 3: Russian Doll cascade delete logic (copied from scheduleBlockPackage.ts lines 207-284)
        console.log('📦 SCHEDULE BLOCK DELETE: Starting package-driven deletion with cascade');
        
        const targetBlock = await storage.getScheduleBlock(data.id);
        if (!targetBlock) {
          throw new Error(`⚠️ SAFETY CHECK FAILED: Schedule block ${data.id} not found - aborting deletion`);
        }
        console.log(`🛡️ SAFETY CHECK: Confirmed schedule block exists - ID: ${targetBlock.id}, Name: "${targetBlock.name}"`);
        
        if (data.cascadeDelete) {
          console.log('🔥 CASCADE DELETE: Starting Russian Doll cascade deletion for schedule block:', data.id);
          
          const allBlocksBefore = await storage.getScheduleBlocks();
          const allWeeksBefore = await storage.getWeekSchedules();
          console.log(`🛡️ PRE-DELETE STATE: Total schedule blocks: ${allBlocksBefore.length}, Total week schedules: ${allWeeksBefore.length}`);
          
          const weekSchedules = await storage.getWeekSchedulesByScheduleBlock(data.id);
          console.log(`🔥 CASCADE DELETE: Found ${weekSchedules.length} week schedules to cascade delete for block ${data.id}`);
          
          const invalidWeeks = weekSchedules.filter((week: any) => week.scheduleBlockId !== data.id);
          if (invalidWeeks.length > 0) {
            throw new Error(`🚨 BOUNDARY VIOLATION: Found week schedules not belonging to block ${data.id}: ${invalidWeeks.map((w: any) => w.id).join(', ')}`);
          }
          console.log(`✅ BOUNDARY CHECK PASSED: All ${weekSchedules.length} week schedules belong to block ${data.id}`);
          
          for (const week of weekSchedules) {
            console.log(`🔥 CASCADE DELETE: Deleting week schedule ${week.id} (scheduleBlockId: ${week.scheduleBlockId}, including its shifts)`);
            
            if (week.scheduleBlockId !== data.id) {
              throw new Error(`🚨 CRITICAL SAFETY VIOLATION: Week schedule ${week.id} belongs to block ${week.scheduleBlockId}, not target block ${data.id}`);
            }
            
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

export type SchedulerEntitiesPackage = typeof schedulerEntitiesPackage;