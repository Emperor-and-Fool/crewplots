import type { ValidationPackage } from '../types/ValidationPackage';
import type { ValidationResult } from '../types/ValidationResult';
import { ValidationResultBuilder } from '../types/ValidationResult';

/**
 * Rule Processor - Handles integrity validation and permission checking
 * COPIED FROM ValidationPackageService integrity and permission methods
 */
export class RuleProcessor {

  /**
   * Validate package integrity - COPIED FROM validatePackageIntegrity
   */
  async validateIntegrity(validationPackage: ValidationPackage): Promise<ValidationResult> {
    console.log('🔍 RULE PROCESSOR: Starting integrity validation');
    
    const errors: any[] = [];
    const warnings: any[] = [];
    const rulesApplied: string[] = [];

    try {
      // Basic data structure validation
      rulesApplied.push('data_structure_validation');
      this.validateDataStructure(validationPackage, errors);

      // Entity-specific validation based on type
      rulesApplied.push(`${validationPackage.entityType}_validation`);
      await this.validateEntitySpecific(validationPackage, errors, warnings);

      // Business rule validation
      rulesApplied.push('business_rules_validation');
      await this.validateBusinessRules(validationPackage, errors, warnings);

      // Foreign key and relationship validation
      rulesApplied.push('relationship_validation');
      await this.validateRelationships(validationPackage, errors, warnings);

      const isValid = errors.length === 0;
      
      console.log('🔍 RULE PROCESSOR: Integrity validation completed:', {
        isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length
      });

      return ValidationResultBuilder.success(null, {
        validationTime: 0,
        rulesApplied,
        packageId: validationPackage.metadata?.packageId || ''
      });

    } catch (error) {
      console.error('🔍 RULE PROCESSOR: Integrity validation failed:', error);
      errors.push(ValidationResultBuilder.createError(
        'INTEGRITY_VALIDATION_ERROR',
        `Integrity validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
      
      return ValidationResultBuilder.failure(errors, {
        validationTime: 0,
        rulesApplied,
        packageId: validationPackage.metadata?.packageId || ''
      });
    }
  }

  /**
   * Validate permissions - COPIED FROM validatePackagePermissions pattern
   */
  async validatePermissions(validationPackage: ValidationPackage): Promise<{
    authorized: boolean;
    errors: any[];
    permissionsChecked: string[];
  }> {
    console.log('🔐 RULE PROCESSOR: Starting permission validation');
    
    const errors: any[] = [];
    const permissionsChecked: string[] = [];

    try {
      // Get required permissions for this operation
      const requiredPermissions = this.getRequiredPermissions(
        validationPackage.entityType,
        validationPackage.operation
      );
      
      permissionsChecked.push(...requiredPermissions);

      // Check user permissions
      const userPermissions = validationPackage.context.permissions || [];
      
      // Validate each required permission
      const deniedPermissions = requiredPermissions.filter(permission => 
        !userPermissions.includes(permission)
      );

      if (deniedPermissions.length > 0) {
        errors.push(ValidationResultBuilder.createError(
          'INSUFFICIENT_PERMISSIONS',
          `Missing required permissions: ${deniedPermissions.join(', ')}`
        ));
      }

      // Validate location access if applicable
      if (validationPackage.data.locationId) {
        const hasLocationAccess = validationPackage.context.locationAccess.includes(
          validationPackage.data.locationId
        );
        
        if (!hasLocationAccess) {
          errors.push(ValidationResultBuilder.createError(
            'LOCATION_ACCESS_DENIED',
            `Access denied to location ID: ${validationPackage.data.locationId}`
          ));
        }
      }

      const authorized = errors.length === 0;
      
      console.log('🔐 RULE PROCESSOR: Permission validation completed:', { authorized });

      return {
        authorized,
        errors,
        permissionsChecked
      };

    } catch (error) {
      console.error('🔐 RULE PROCESSOR: Permission validation failed:', error);
      errors.push(ValidationResultBuilder.createError(
        'PERMISSION_VALIDATION_ERROR',
        `Permission validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
      
      return {
        authorized: false,
        errors,
        permissionsChecked
      };
    }
  }

  /**
   * Validate data structure consistency
   */
  private validateDataStructure(validationPackage: ValidationPackage, errors: any[]): void {
    if (!validationPackage.data) {
      errors.push(ValidationResultBuilder.createError(
        'MISSING_DATA',
        'Validation package must contain data'
      ));
      return;
    }

    if (!validationPackage.context) {
      errors.push(ValidationResultBuilder.createError(
        'MISSING_CONTEXT',
        'Validation package must contain operation context'
      ));
      return;
    }

    if (!validationPackage.operation) {
      errors.push(ValidationResultBuilder.createError(
        'MISSING_OPERATION',
        'Validation package must specify operation type'
      ));
      return;
    }
  }

  /**
   * Entity-specific validation based on type
   */
  private async validateEntitySpecific(
    validationPackage: ValidationPackage,
    errors: any[],
    warnings: any[]
  ): Promise<void> {
    switch (validationPackage.entityType) {
      case 'schedule':
        await this.validateScheduleEntity(validationPackage, errors, warnings);
        break;
      case 'user':
        await this.validateUserEntity(validationPackage, errors, warnings);
        break;
      case 'location':
        await this.validateLocationEntity(validationPackage, errors, warnings);
        break;
      default:
        warnings.push(ValidationResultBuilder.createWarning(
          'UNKNOWN_ENTITY_TYPE',
          `Unknown entity type: ${validationPackage.entityType}`,
          undefined,
          'Consider registering a validation handler for this entity type'
        ));
    }
  }

  /**
   * Schedule entity validation - COPIED FROM ValidationPackageService patterns
   */
  private async validateScheduleEntity(
    validationPackage: ValidationPackage,
    errors: any[],
    warnings: any[]
  ): Promise<void> {
    const data = validationPackage.data;
    
    // Schedule block validation
    if (data.scheduleBlock) {
      if (!data.scheduleBlock.name) {
        errors.push(ValidationResultBuilder.createError(
          'MISSING_REQUIRED_FIELD',
          'Schedule block name is required'
        ));
      }
      if (!data.scheduleBlock.locationId) {
        errors.push(ValidationResultBuilder.createError(
          'MISSING_REQUIRED_FIELD',
          'Schedule block location ID is required'
        ));
      }
    }

    // Week schedules validation
    if (data.weekSchedules && Array.isArray(data.weekSchedules)) {
      data.weekSchedules.forEach((weekSchedule: any, index: number) => {
        if (typeof weekSchedule.weekNumber !== 'number') {
          errors.push(ValidationResultBuilder.createError(
            'INVALID_DATA_TYPE',
            `Week schedule ${index + 1}: weekNumber must be a number`
          ));
        }
      });
    }

    // Shifts validation
    if (data.shifts && Array.isArray(data.shifts)) {
      data.shifts.forEach((shift: any, index: number) => {
        if (!shift.title) {
          errors.push(ValidationResultBuilder.createError(
            'MISSING_REQUIRED_FIELD',
            `Shift ${index + 1}: title is required`
          ));
        }
        if (!shift.dayOfWeek) {
          errors.push(ValidationResultBuilder.createError(
            'MISSING_REQUIRED_FIELD',
            `Shift ${index + 1}: dayOfWeek is required`
          ));
        }
        if (shift.startTime && shift.endTime && shift.startTime >= shift.endTime) {
          errors.push(ValidationResultBuilder.createError(
            'BUSINESS_RULE_VIOLATION',
            `Shift ${index + 1}: End time must be after start time`
          ));
        }
      });
    }
  }

  /**
   * User entity validation - PLACEHOLDER FOR FUTURE IMPLEMENTATION
   */
  private async validateUserEntity(
    validationPackage: ValidationPackage,
    errors: any[],
    warnings: any[]
  ): Promise<void> {
    const data = validationPackage.data;
    
    if (data.profile) {
      if (!data.profile.email) {
        errors.push(ValidationResultBuilder.createError(
          'MISSING_REQUIRED_FIELD',
          'User email is required'
        ));
      }
      if (!data.profile.username) {
        errors.push(ValidationResultBuilder.createError(
          'MISSING_REQUIRED_FIELD',
          'Username is required'
        ));
      }
    }
  }

  /**
   * Location entity validation - PLACEHOLDER FOR FUTURE IMPLEMENTATION
   */
  private async validateLocationEntity(
    validationPackage: ValidationPackage,
    errors: any[],
    warnings: any[]
  ): Promise<void> {
    const data = validationPackage.data;
    
    if (!data.name) {
      errors.push(ValidationResultBuilder.createError(
        'MISSING_REQUIRED_FIELD',
        'Location name is required'
      ));
    }
  }

  /**
   * Business rules validation
   */
  private async validateBusinessRules(
    validationPackage: ValidationPackage,
    errors: any[],
    warnings: any[]
  ): Promise<void> {
    // Business rules would be implemented here
    // Examples: scheduling conflicts, capacity limits, etc.
  }

  /**
   * Relationship validation
   */
  private async validateRelationships(
    validationPackage: ValidationPackage,
    errors: any[],
    warnings: any[]
  ): Promise<void> {
    // Foreign key and relationship validation would be implemented here
    // Examples: checking if referenced entities exist
  }

  /**
   * Get required permissions for operation - COPIED FROM working patterns
   */
  private getRequiredPermissions(entityType: string, operation: string): string[] {
    const permissionMap: Record<string, Record<string, string[]>> = {
      schedule: {
        create: ['schedule.create', 'scheduler_development.write'],
        update: ['schedule.update', 'scheduler_development.write'],
        delete: ['schedule.delete', 'scheduler_development.execute'],
        read: ['schedule.read', 'scheduler_development.read']
      },
      user: {
        create: ['user.create'],
        update: ['user.update'],
        delete: ['user.delete'],
        read: ['user.read']
      },
      location: {
        create: ['location.create'],
        update: ['location.update'],
        delete: ['location.delete'],
        read: ['location.read']
      }
    };

    return permissionMap[entityType]?.[operation] || [];
  }
}