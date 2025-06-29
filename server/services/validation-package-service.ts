import { z } from 'zod';
import { db } from '../db';
import { 
  scheduleBlocks, 
  weekSchedules, 
  shifts, 
  users, 
  userLocations,
  insertScheduleBlockSchema,
  insertWeekScheduleSchema,
  insertShiftSchema,
  updateShiftSchema
} from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { User } from '@shared/schema';

// Validation Package Types - Aligned with actual database schema
export interface ScheduleValidationPackage {
  packageType: 'create' | 'update' | 'duplicate' | 'delete';
  scheduleBlock: {
    id?: number;
    name: string;
    description?: string;
    locationId: number;
    isActive: boolean;
  };
  weekSchedules: Array<{
    id?: number;
    scheduleBlockId?: number;
    weekNumber: number;
    templateId?: number;
  }>;
  shifts: Array<{
    id?: number;
    weekScheduleId?: number;
    title: string;
    position?: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    maxSlots: number;
    subscriptionDeadline?: string;
  }>;
  metadata: {
    userId: number;
    userRole: string;
    requestedPermissions: string[];
    locationAccess: number[];
    timestamp: Date;
  };
}

const packageMetadataSchema = z.object({
  userId: z.number().min(1),
  userRole: z.string().min(1),
  requestedPermissions: z.array(z.string()),
  locationAccess: z.array(z.number()),
  timestamp: z.date()
});

export class ValidationPackageService {
  
  // Thread 1: Package Assembly
  async assemblePackageFromRequest(
    requestData: any,
    user: User,
    packageType: 'create' | 'update' | 'duplicate' | 'delete'
  ): Promise<ScheduleValidationPackage> {
    console.log('🎁 PACKAGE ASSEMBLY: Starting package assembly for user:', user.id);
    
    // Get user's location access
    const userLocationAccess = await this.getUserLocationAccess(user.id);
    
    // Assemble package with security metadata
    const packageData: ScheduleValidationPackage = {
      packageType,
      scheduleBlock: {
        ...requestData.scheduleBlock,
        id: requestData.scheduleBlock?.id || undefined
      },
      weekSchedules: requestData.weekSchedules || [],
      shifts: requestData.shifts || [],
      metadata: {
        userId: user.id,
        userRole: user.role,
        requestedPermissions: this.extractRequestedPermissions(requestData, packageType),
        locationAccess: userLocationAccess,
        timestamp: new Date()
      }
    };

    console.log('🎁 PACKAGE ASSEMBLY: Package assembled successfully');

    return packageData;
  }

  // Thread 2: Integrity Validation
  async validatePackageIntegrity(packageData: ScheduleValidationPackage): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    console.log('🔍 INTEGRITY VALIDATION: Starting validation for package type:', packageData.packageType);
    
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate schedule block using existing schemas
      if (packageData.scheduleBlock) {
        const scheduleBlockResult = packageData.packageType === 'create' 
          ? insertScheduleBlockSchema.safeParse(packageData.scheduleBlock)
          : insertScheduleBlockSchema.partial().safeParse(packageData.scheduleBlock);
        if (!scheduleBlockResult.success) {
          errors.push(...scheduleBlockResult.error.errors.map(e => `Schedule Block: ${e.path.join('.')}: ${e.message}`));
        }
      }

      // Validate week schedules using existing schemas
      if (packageData.weekSchedules && packageData.weekSchedules.length > 0) {
        packageData.weekSchedules.forEach((weekSchedule, index) => {
          const result = packageData.packageType === 'create'
            ? insertWeekScheduleSchema.safeParse(weekSchedule)
            : insertWeekScheduleSchema.partial().safeParse(weekSchedule);
          if (!result.success) {
            errors.push(...result.error.errors.map(e => `Week Schedule ${index + 1}: ${e.path.join('.')}: ${e.message}`));
          }
        });
      }

      // Validate shifts using existing schemas
      if (packageData.shifts && packageData.shifts.length > 0) {
        packageData.shifts.forEach((shift, index) => {
          const result = packageData.packageType === 'create'
            ? insertShiftSchema.safeParse(shift)
            : updateShiftSchema.safeParse(shift);
          if (!result.success) {
            errors.push(...result.error.errors.map(e => `Shift ${index + 1}: ${e.path.join('.')}: ${e.message}`));
          }

          // Time validation
          if (shift.startTime && shift.endTime && shift.startTime >= shift.endTime) {
            errors.push(`Shift ${index + 1}: End time must be after start time`);
          }
        });
      }

      // Validate metadata if present
      if (packageData.metadata) {
        const metadataResult = packageMetadataSchema.safeParse(packageData.metadata);
        if (!metadataResult.success) {
          errors.push(...metadataResult.error.errors.map(e => `Metadata: ${e.path.join('.')}: ${e.message}`));
        }
      }

      // Russian Doll integrity checks
      await this.validateRussianDollIntegrity(packageData, errors, warnings);

      // Business logic validation
      await this.validateBusinessRules(packageData, errors, warnings);

      const isValid = errors.length === 0;
      
      console.log('🔍 INTEGRITY VALIDATION: Validation completed:', {
        isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length
      });

      return { isValid, errors, warnings };

    } catch (error) {
      console.error('🔍 INTEGRITY VALIDATION: Validation failed:', error);
      errors.push(`Critical validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors, warnings };
    }
  }

  // Thread 3: Permission Authorization
  async validatePackagePermissions(packageData: ScheduleValidationPackage): Promise<{
    isAuthorized: boolean;
    deniedPermissions: string[];
    grantedPermissions: string[];
  }> {
    console.log('🔐 PERMISSION VALIDATION: Starting authorization check');
    
    const requiredPermissions = this.getRequiredPermissions(packageData.packageType);
    const userPermissions = await this.getUserPermissions(packageData.metadata.userId, packageData.metadata.userRole);
    
    const grantedPermissions = requiredPermissions.filter(permission => 
      userPermissions.includes(permission)
    );
    const deniedPermissions = requiredPermissions.filter(permission => 
      !userPermissions.includes(permission)
    );
    
    const isAuthorized = deniedPermissions.length === 0;
    
    console.log('🔐 PERMISSION VALIDATION: Authorization completed:', { isAuthorized });
    
    return {
      isAuthorized,
      deniedPermissions,
      grantedPermissions
    };
  }

  // Thread 4: Storage Transaction
  async executeStorageTransaction(packageData: ScheduleValidationPackage): Promise<{
    success: boolean;
    createdEntities: {
      scheduleBlockId: number | null;
      weekScheduleIds: number[];
      shiftIds: number[];
    };
    errors: string[];
  }> {
    console.log('💾 STORAGE TRANSACTION: Starting atomic transaction');
    
    const errors: string[] = [];
    let scheduleBlockId: number | null = null;
    let weekScheduleIds: number[] = [];
    let shiftIds: number[] = [];

    try {
      return await db.transaction(async (tx) => {
        console.log('💾 STORAGE TRANSACTION: Transaction started');

        // Create schedule block
        if (packageData.scheduleBlock && packageData.packageType === 'create') {
          const [createdScheduleBlock] = await tx
            .insert(scheduleBlocks)
            .values({
              name: packageData.scheduleBlock.name,
              description: packageData.scheduleBlock.description || '',
              locationId: packageData.scheduleBlock.locationId,
              isActive: packageData.scheduleBlock.isActive ?? true,
              createdBy: packageData.metadata.userId
            })
            .returning({ id: scheduleBlocks.id });

          scheduleBlockId = createdScheduleBlock.id;
          console.log('💾 STORAGE TRANSACTION: Schedule block created with ID:', scheduleBlockId);
        }

        // Create week schedules
        if (packageData.weekSchedules.length > 0 && scheduleBlockId) {
          for (const weekSchedule of packageData.weekSchedules) {
            const [createdWeekSchedule] = await tx
              .insert(weekSchedules)
              .values({
                scheduleBlockId: scheduleBlockId,
                weekNumber: weekSchedule.weekNumber,
                templateId: weekSchedule.templateId || null,
                createdBy: packageData.metadata.userId
              })
              .returning({ id: weekSchedules.id });

            weekScheduleIds.push(createdWeekSchedule.id);
          }
          console.log('💾 STORAGE TRANSACTION: Week schedules created:', weekScheduleIds.length);
        }

        // Create shifts with correct field mapping
        if (packageData.shifts.length > 0 && weekScheduleIds.length > 0) {
          for (const shift of packageData.shifts) {
            const weekScheduleId = weekScheduleIds[0]; // Use first week schedule for now
            
            const [createdShift] = await tx
              .insert(shifts)
              .values({
                weekScheduleId: weekScheduleId,
                title: shift.title,
                position: shift.position || null,
                dayOfWeek: shift.dayOfWeek,
                startTime: shift.startTime,
                endTime: shift.endTime,
                maxSlots: shift.maxSlots,
                subscriptionDeadline: shift.subscriptionDeadline ? new Date(shift.subscriptionDeadline) : null
              })
              .returning({ id: shifts.id });

            shiftIds.push(createdShift.id);
          }
          console.log('💾 STORAGE TRANSACTION: Shifts created:', shiftIds.length);
        }

        console.log('💾 STORAGE TRANSACTION: Transaction completed successfully');

        return {
          success: true,
          createdEntities: {
            scheduleBlockId,
            weekScheduleIds,
            shiftIds
          },
          errors: []
        };
      });

    } catch (error) {
      console.error('💾 STORAGE TRANSACTION: Transaction failed:', error);
      errors.push(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        createdEntities: {
          scheduleBlockId,
          weekScheduleIds,
          shiftIds
        },
        errors
      };
    }
  }

  // Helper Methods

  private async getUserLocationAccess(userId: number): Promise<number[]> {
    const userLocationsData = await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.userId, userId));
    
    return userLocationsData.map(ul => ul.locationId);
  }

  private extractRequestedPermissions(requestData: any, packageType: string): string[] {
    const permissions = ['scheduler_development.read'];
    
    if (packageType === 'create') {
      permissions.push('scheduler_development.write');
    } else if (packageType === 'update') {
      permissions.push('scheduler_development.write');
    } else if (packageType === 'delete') {
      permissions.push('scheduler_development.execute');
    }

    return permissions;
  }

  // Russian Doll Architecture Validation
  private async validateRussianDollIntegrity(
    packageData: ScheduleValidationPackage,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    console.log('🏗️ RUSSIAN DOLL VALIDATION: Checking architectural integrity');
    
    // Validate Schedule Block → Week Schedules → Shifts hierarchy
    if (packageData.weekSchedules.length > 0 && !packageData.scheduleBlock.name) {
      errors.push('Russian Doll: Week schedules require a parent schedule block');
    }
    
    if (packageData.shifts.length > 0 && packageData.weekSchedules.length === 0) {
      errors.push('Russian Doll: Shifts require parent week schedules');
    }
    
    // Validate consistency between levels
    for (const weekSchedule of packageData.weekSchedules) {
      const shiftsInWeek = packageData.shifts.filter(shift => 
        shift.weekScheduleId === weekSchedule.id
      );
      
      if (shiftsInWeek.length === 0) {
        warnings.push(`Week ${weekSchedule.weekNumber}: No shifts defined`);
      }
    }
  }

  // Business Rules Validation
  private async validateBusinessRules(
    packageData: ScheduleValidationPackage,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    console.log('📋 BUSINESS RULES: Validating scheduler business logic');
    
    // Schedule timing conflicts
    const shiftsByDay = new Map<string, typeof packageData.shifts>();
    packageData.shifts.forEach(shift => {
      const day = shift.dayOfWeek || 'unknown';
      if (!shiftsByDay.has(day)) {
        shiftsByDay.set(day, []);
      }
      shiftsByDay.get(day)!.push(shift);
    });
    
    // Check for overlapping shifts on same day
    shiftsByDay.forEach((dayShifts, day) => {
      if (Array.isArray(dayShifts)) {
        for (let i = 0; i < dayShifts.length; i++) {
          for (let j = i + 1; j < dayShifts.length; j++) {
            const shift1 = dayShifts[i];
            const shift2 = dayShifts[j];
            
            if (shift1.startTime && shift1.endTime && shift2.startTime && shift2.endTime) {
              const overlap = (shift1.startTime < shift2.endTime && shift2.startTime < shift1.endTime);
              if (overlap) {
                warnings.push(`${day}: Potential shift overlap between "${shift1.title}" and "${shift2.title}"`);
              }
            }
          }
        }
      }
    });
  }

  private getRequiredPermissions(packageType: string): string[] {
    const basePermissions = ['schedule.read'];
    
    switch (packageType) {
      case 'create':
        return [...basePermissions, 'schedule.create'];
      case 'update':
        return [...basePermissions, 'schedule.update'];
      case 'delete':
        return [...basePermissions, 'schedule.delete'];
      case 'duplicate':
        return [...basePermissions, 'schedule.create'];
      default:
        return basePermissions;
    }
  }

  private async getUserPermissions(userId: number, userRole: string): Promise<string[]> {
    // Clean permission system based on roles
    const rolePermissions: Record<string, string[]> = {
      administrator: [
        'schedule.create',
        'schedule.read', 
        'schedule.update',
        'schedule.delete',
        'schedule.assign_users',
        'schedule.manage_permissions',
        'location.access_all'
      ],
      owner: [
        'schedule.create',
        'schedule.read',
        'schedule.update', 
        'schedule.delete',
        'schedule.assign_users',
        'location.access_owned'
      ],
      app_manager: [
        'schedule.create',
        'schedule.read',
        'schedule.update',
        'location.access_managed'
      ],
      crew_chief: [
        'schedule.read',
        'schedule.update',
        'location.access_assigned'
      ],
      crew_member: [
        'schedule.read',
        'location.access_assigned'
      ]
    };

    return rolePermissions[userRole] || ['schedule.read'];
  }
}

export const validationPackageService = new ValidationPackageService();