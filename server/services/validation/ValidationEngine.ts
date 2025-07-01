import { v4 as uuidv4 } from 'uuid';

// Import extracted validation packages
import { scheduleBlockPackage } from '../../../client/src/modules/scheduler/validation/packages/scheduleBlockPackage';
import { weekSchedulePackage } from '../../../client/src/modules/scheduler/validation/packages/weekSchedulePackage';
import { shiftPackage } from '../../../client/src/modules/scheduler/validation/packages/shiftPackage';

/**
 * Package Registry for Validation Engine
 * Maps entity types to their extracted validation packages
 */
const packageRegistry = {
  scheduleBlock: scheduleBlockPackage,
  weekSchedule: weekSchedulePackage,
  shift: shiftPackage
} as const;

/**
 * Unified Validation Engine 
 * Uses extracted validation packages from scheduler module
 */
export class ValidationEngine {
  
  /**
   * Get validation package for entity type
   */
  private getPackage(entityType: string) {
    const pkg = packageRegistry[entityType as keyof typeof packageRegistry];
    if (!pkg) {
      throw new Error(`No validation package found for entity type: ${entityType}`);
    }
    return pkg;
  }
  
  /**
   * Main validation orchestrator using extracted packages
   */
  async validateAndExecute(
    operation: string,
    entityType: string,
    data: any,
    context: any,
    entityId?: number | null
  ) {
    const packageId = uuidv4();
    const startTime = Date.now();
    
    console.log(`🎯 UNIFIED ENGINE: Starting ${operation} for ${entityType}`, { packageId });

    try {
      // Get validation package for entity type
      const pkg = this.getPackage(entityType);
      
      // Thread 1: Schema Validation using extracted package
      console.log('🔍 UNIFIED ENGINE: Starting schema validation');
      const schemaResult = pkg.validateSchema(data, operation as any);
      if (!schemaResult.isValid) {
        return this.createFailureResult(packageId, operation, entityType, schemaResult.errors);
      }

      // Thread 2: Permission Validation using extracted package
      console.log('🔐 UNIFIED ENGINE: Starting permission validation');
      const requiredPermissions = pkg.getRequiredPermissions(operation as any);
      const userPermissions = context.permissions || [];
      const hasPermissions = requiredPermissions.every(perm => userPermissions.includes(perm));
      
      if (!hasPermissions) {
        const missingPermissions = requiredPermissions.filter(perm => !userPermissions.includes(perm));
        return this.createFailureResult(packageId, operation, entityType, [`Missing permissions: ${missingPermissions.join(', ')}`]);
      }

      // Thread 3: Business Rule Validation using extracted package
      console.log('📋 UNIFIED ENGINE: Starting business rule validation');
      const businessRuleResult = await pkg.validateBusinessRules(data, context);
      if (!businessRuleResult.isValid) {
        return this.createFailureResult(packageId, operation, entityType, businessRuleResult.errors);
      }

      // Thread 4: Success - all validations passed
      console.log('✅ UNIFIED ENGINE: All validations passed');
      
      const validationTime = Date.now() - startTime;
      
      return {
        packageId,
        operation,
        entityType,
        overall: {
          isValid: true,
          errors: [],
          warnings: businessRuleResult.warnings || [],
          metadata: {
            validationTime,
            rulesApplied: [
              'Schema validation',
              'Permission validation', 
              'Business rule validation'
            ],
            packageId
          }
        },
        threads: {
          schema: { success: true, errors: [], data: data },
          permission: { success: true, errors: [], permissions: requiredPermissions },
          businessRules: { success: true, errors: [], warnings: businessRuleResult.warnings || [] },
          transaction: { success: true, errors: [], data: { validated: true } }
        }
      };

    } catch (error) {
      console.error('🎯 UNIFIED ENGINE: Critical error:', error);
      return this.createFailureResult(packageId, operation, entityType, [`Critical validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  }

  /**
   * Create failure result for validation errors
   */
  private createFailureResult(packageId: string, operation: string, entityType: string, errors: string[]) {
    return {
      packageId,
      operation,
      entityType,
      overall: {
        isValid: false,
        errors,
        warnings: [],
        metadata: {
          validationTime: 0,
          rulesApplied: [],
          packageId
        }
      },
      threads: {
        error: { success: false, errors, data: null }
      }
    };
  }
}