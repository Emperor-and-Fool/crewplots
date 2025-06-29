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

// Validation Package Types
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
    position: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    maxSlots: number;
    subscriptionDeadline?: string;
    competencyRequirements?: any[];
  }>;
  metadata: {
    userId: number;
    userRole: string;
    requestedPermissions: string[];
    locationAccess: number[];
    timestamp: Date;
  };
}

// Use existing validation schemas from shared/schema.ts instead of duplicating
// This leverages the existing schema-first architecture

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

    console.log('🎁 PACKAGE ASSEMBLY: Package assembled with metadata:', {
      packageType,
      userId: user.id,
      userRole: user.role,
      locationAccess: userLocationAccess.length,
      permissionsRequested: packageData.metadata.requestedPermissions.length
    });

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
        for (const [index, weekSchedule] of packageData.weekSchedules.entries()) {
          const result = packageData.packageType === 'create'
            ? insertWeekScheduleSchema.safeParse(weekSchedule)
            : insertWeekScheduleSchema.partial().safeParse(weekSchedule);
          if (!result.success) {
            errors.push(...result.error.errors.map(e => `Week Schedule ${index + 1}: ${e.path.join('.')}: ${e.message}`));
          }
        }
      }

      // Validate shifts using existing schemas
      if (packageData.shifts && packageData.shifts.length > 0) {
        for (const [index, shift] of packageData.shifts.entries()) {
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
        }
      }

      // Validate metadata if present
      if (packageData.metadata) {
        const metadataResult = packageMetadataSchema.safeParse(packageData.metadata);
        if (!metadataResult.success) {
          errors.push(...metadataResult.error.errors.map(e => `Metadata: ${e.path.join('.')}: ${e.message}`));
        }
      }

      // Russian Doll integrity checks - only if methods exist
      if (this.validateRussianDollIntegrity) {
        await this.validateRussianDollIntegrity(packageData, errors, warnings);
      }

      // Business logic validation - only if methods exist
      if (this.validateBusinessRules) {
        await this.validateBusinessRules(packageData, errors, warnings);
      }

      const isValid = errors.length === 0;
      
      console.log('🔍 INTEGRITY VALIDATION: Validation completed:', {
        isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        errors: errors.slice(0, 3) // Show first 3 errors for debugging
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
    securityViolations: string[];
  }> {
    console.log('🔐 PERMISSION AUTHORIZATION: Starting authorization for user:', packageData.metadata.userId);
    
    const deniedPermissions: string[] = [];
    const securityViolations: string[] = [];

    try {
      // Location access validation
      const locationId = packageData.scheduleBlock.locationId;
      if (!packageData.metadata.locationAccess.includes(locationId)) {
        securityViolations.push(`User does not have access to location ${locationId}`);
      }

      // Role-based permission validation
      const requiredPermissions = this.getRequiredPermissions(packageData.packageType);
      const userPermissions = await this.getUserPermissions(packageData.metadata.userId, packageData.metadata.userRole);

      for (const permission of requiredPermissions) {
        if (!userPermissions.includes(permission)) {
          deniedPermissions.push(permission);
        }
      }

      // Package-specific security checks
      await this.validatePackageSpecificSecurity(packageData, securityViolations);

      const isAuthorized = deniedPermissions.length === 0 && securityViolations.length === 0;

      console.log('🔐 PERMISSION AUTHORIZATION: Authorization completed:', {
        isAuthorized,
        deniedCount: deniedPermissions.length,
        violationsCount: securityViolations.length
      });

      return { isAuthorized, deniedPermissions, securityViolations };

    } catch (error) {
      console.error('🔐 PERMISSION AUTHORIZATION: Authorization failed:', error);
      securityViolations.push('Critical authorization error occurred');
      return { isAuthorized: false, deniedPermissions, securityViolations };
    }
  }

  // Thread 4: Storage Transaction
  async savePackageTransaction(packageData: ScheduleValidationPackage): Promise<{
    success: boolean;
    createdEntities: {
      scheduleBlockId?: number;
      weekScheduleIds: number[];
      shiftIds: number[];
    };
    errors: string[];
  }> {
    console.log('💾 STORAGE TRANSACTION: Starting atomic save for package type:', packageData.packageType);
    
    const errors: string[] = [];
    let scheduleBlockId: number | undefined;
    const weekScheduleIds: number[] = [];
    const shiftIds: number[] = [];

    try {
      // Start transaction
      return await db.transaction(async (tx) => {
        
        // Save schedule block
        if (packageData.packageType === 'create') {
          const [createdBlock] = await tx
            .insert(scheduleBlocks)
            .values({
              name: packageData.scheduleBlock.name,
              description: packageData.scheduleBlock.description || null,
              locationId: packageData.scheduleBlock.locationId,
              isActive: packageData.scheduleBlock.isActive
            })
            .returning();
          scheduleBlockId = createdBlock.id;
          
        } else if (packageData.packageType === 'update' && packageData.scheduleBlock.id) {
          await tx
            .update(scheduleBlocks)
            .set({
              name: packageData.scheduleBlock.name,
              description: packageData.scheduleBlock.description || null,
              locationId: packageData.scheduleBlock.locationId,
              isActive: packageData.scheduleBlock.isActive
            })
            .where(eq(scheduleBlocks.id, packageData.scheduleBlock.id));
          scheduleBlockId = packageData.scheduleBlock.id;
        }

        // Save week schedules
        for (const weekSchedule of packageData.weekSchedules) {
          if (packageData.packageType === 'create') {
            const [createdWeek] = await tx
              .insert(weekSchedules)
              .values({
                scheduleBlockId: scheduleBlockId!,
                weekNumber: weekSchedule.weekNumber,
                templateId: weekSchedule.templateId || null
              })
              .returning();
            weekScheduleIds.push(createdWeek.id);
            
          } else if (packageData.packageType === 'update' && weekSchedule.id) {
            await tx
              .update(weekSchedules)
              .set({
                weekNumber: weekSchedule.weekNumber,
                templateId: weekSchedule.templateId || null
              })
              .where(eq(weekSchedules.id, weekSchedule.id));
            weekScheduleIds.push(weekSchedule.id);
          }
        }

        // Save shifts
        for (const [index, shift] of packageData.shifts.entries()) {
          const targetWeekScheduleId = shift.weekScheduleId || weekScheduleIds[index] || weekScheduleIds[0];
          
          if (packageData.packageType === 'create') {
            const [createdShift] = await tx
              .insert(shifts)
              .values({
                weekScheduleId: targetWeekScheduleId,
                title: shift.title,
                position: shift.position,
                dayOfWeek: shift.dayOfWeek as any,
                startTime: shift.startTime,
                endTime: shift.endTime,
                maxSlots: shift.maxSlots,
                subscriptionDeadline: shift.subscriptionDeadline ? new Date(shift.subscriptionDeadline) : null,
                competencyRequirements: shift.competencyRequirements || []
              })
              .returning();
            shiftIds.push(createdShift.id);
            
          } else if (packageData.packageType === 'update' && shift.id) {
            await tx
              .update(shifts)
              .set({
                title: shift.title,
                position: shift.position,
                dayOfWeek: shift.dayOfWeek as any,
                startTime: shift.startTime,
                endTime: shift.endTime,
                maxSlots: shift.maxSlots,
                subscriptionDeadline: shift.subscriptionDeadline ? new Date(shift.subscriptionDeadline) : null,
                competencyRequirements: shift.competencyRequirements || []
              })
              .where(eq(shifts.id, shift.id));
            shiftIds.push(shift.id);
          }
        }

        console.log('💾 STORAGE TRANSACTION: Transaction completed successfully:', {
          scheduleBlockId,
          weekSchedulesCreated: weekScheduleIds.length,
          shiftsCreated: shiftIds.length
        });

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

  // Helper Methods for Security and Validation

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
        shift.weekScheduleId === weekSchedule.id || shift.weekNumber === weekSchedule.weekNumber
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
    
    // Location consistency
    if (packageData.scheduleBlock.locationId) {
      const locationShifts = packageData.shifts.filter(shift => 
        shift.locationId && shift.locationId !== packageData.scheduleBlock.locationId
      );
      
      if (locationShifts.length > 0) {
        warnings.push('Location mismatch: Some shifts have different locations than schedule block');
      }
    }
    
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
    shiftsByDay.forEach((shifts, day) => {
      for (let i = 0; i < shifts.length; i++) {
        for (let j = i + 1; j < shifts.length; j++) {
          const shift1 = shifts[i];
          const shift2 = shifts[j];
          
          if (shift1.startTime && shift1.endTime && shift2.startTime && shift2.endTime) {
            const overlap = (shift1.startTime < shift2.endTime && shift2.startTime < shift1.endTime);
            if (overlap) {
              warnings.push(`${day}: Potential shift overlap between "${shift1.title}" and "${shift2.title}"`);
            }
          }
        }
      }
    });
  }

  private getRequiredPermissions(packageType: string): string[] {
    // NEW PERMISSION MAPPING - matches the clean permission system
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
    // NEW PERMISSION SYSTEM - Clean implementation for flexible scheduler
    // This replaces the legacy permission patterns with unified approach
    
    // Base permissions by role - this is the new security context
    const newRolePermissions: Record<string, string[]> = {
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
        'schedule.assign_users',
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
      ],
      applicant: [
        'schedule.read'
      ]
    };

    // Get user-specific blocked permissions from database
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length > 0 && user[0].blockedPermissions) {
        const blockedPerms = user[0].blockedPermissions as Record<string, string[]>;
        const rolePerms = newRolePermissions[userRole] || [];
        
        // Remove blocked permissions
        const schedulerBlocked = blockedPerms['scheduler'] || [];
        return rolePerms.filter(perm => !schedulerBlocked.includes(perm));
      }
    } catch (error) {
      console.warn('Could not fetch user-specific permissions, using role defaults:', error);
    }

    return newRolePermissions[userRole] || [];
  }

  private async validateRussianDollIntegrity(
    packageData: ScheduleValidationPackage,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check week number uniqueness within schedule block
    const weekNumbers = packageData.weekSchedules.map(ws => ws.weekNumber);
    const uniqueWeekNumbers = new Set(weekNumbers);
    if (weekNumbers.length !== uniqueWeekNumbers.size) {
      errors.push('Duplicate week numbers found within schedule block');
    }

    // Check shift time overlaps within same day/week
    for (const weekSchedule of packageData.weekSchedules) {
      const weekShifts = packageData.shifts.filter(s => 
        s.weekScheduleId === weekSchedule.id || !s.weekScheduleId
      );
      
      this.validateShiftTimeOverlaps(weekShifts, errors, warnings);
    }
  }

  private validateShiftTimeOverlaps(shifts: any[], errors: string[], warnings: string[]): void {
    const dayGroups = shifts.reduce((groups, shift) => {
      const key = shift.dayOfWeek;
      if (!groups[key]) groups[key] = [];
      groups[key].push(shift);
      return groups;
    }, {} as Record<string, any[]>);

    for (const [day, dayShifts] of Object.entries(dayGroups)) {
      dayShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      for (let i = 0; i < dayShifts.length - 1; i++) {
        const current = dayShifts[i];
        const next = dayShifts[i + 1];
        
        if (current.endTime > next.startTime) {
          warnings.push(`Overlapping shifts detected on ${day}: ${current.position} and ${next.position}`);
        }
      }
    }
  }

  private async validateBusinessRules(
    packageData: ScheduleValidationPackage,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Validate subscription deadlines
    for (const shift of packageData.shifts) {
      if (shift.subscriptionDeadline) {
        const deadline = new Date(shift.subscriptionDeadline);
        if (deadline < new Date()) {
          warnings.push(`Subscription deadline for ${shift.position} is in the past`);
        }
      }
    }

    // Validate max slots
    for (const shift of packageData.shifts) {
      if (shift.maxSlots > 50) {
        warnings.push(`Unusually high max slots (${shift.maxSlots}) for ${shift.position}`);
      }
    }
  }

  private async validatePackageSpecificSecurity(
    packageData: ScheduleValidationPackage,
    securityViolations: string[]
  ): Promise<void> {
    // Validate that user isn't trying to modify schedules they don't own
    if (packageData.packageType === 'update' && packageData.scheduleBlock.id) {
      const existingBlock = await db
        .select()
        .from(scheduleBlocks)
        .where(eq(scheduleBlocks.id, packageData.scheduleBlock.id))
        .limit(1);

      if (existingBlock.length === 0) {
        securityViolations.push('Schedule block not found or access denied');
      } else if (existingBlock[0].locationId !== packageData.scheduleBlock.locationId) {
        securityViolations.push('Cannot change location of existing schedule block');
      }
    }

    // Validate time constraints (e.g., no shifts longer than 24 hours)
    for (const shift of packageData.shifts) {
      const start = new Date(`2024-01-01 ${shift.startTime}`);
      const end = new Date(`2024-01-01 ${shift.endTime}`);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      if (duration > 24 || duration < 0) {
        securityViolations.push(`Invalid shift duration for ${shift.position}`);
      }
    }
  }
}

export const validationPackageService = new ValidationPackageService();