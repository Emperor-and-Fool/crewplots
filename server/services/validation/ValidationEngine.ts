import { v4 as uuidv4 } from 'uuid';
import { storage } from '../../storage';

// Import extracted validation packages from server packages
import { scheduleBlockPackage } from './packages/scheduleBlockPackage';
import { weekSchedulePackage } from './packages/weekSchedulePackage';
import { shiftPackage } from './packages/shiftPackage';

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
      
      // Thread 1: Data Assembly (inject server-side fields BEFORE validation)
      console.log('🎁 UNIFIED ENGINE: Starting data assembly');
      console.log('🎁 UNIFIED ENGINE: Raw frontend data:', JSON.stringify(data, null, 2));
      
      // Inject authenticated user fields following legacy pattern
      const assembledData = { ...data };
      if (operation === 'create') {
        assembledData.createdBy = context.userId; // Server-side injection from authenticated session
        console.log('🎁 UNIFIED ENGINE: Injected createdBy from authenticated user:', context.userId);
      }
      
      // CRITICAL FIX: Convert date strings to Date objects for database compatibility
      if (entityType === 'shift' && assembledData.subscriptionDeadline) {
        if (typeof assembledData.subscriptionDeadline === 'string') {
          assembledData.subscriptionDeadline = new Date(assembledData.subscriptionDeadline);
          console.log('🎁 UNIFIED ENGINE: Converted subscriptionDeadline string to Date object');
        }
      }
      
      console.log('🎁 UNIFIED ENGINE: Assembled data with server fields:', JSON.stringify(assembledData, null, 2));
      
      // Thread 2: Schema Validation using extracted package (on assembled data)
      console.log('🔍 UNIFIED ENGINE: Starting schema validation on assembled data');
      const schemaResult = pkg.validateSchema(assembledData, operation as any);
      console.log('🔍 UNIFIED ENGINE: Schema validation result:', schemaResult);
      if (!schemaResult.isValid) {
        return this.createFailureResult(packageId, operation, entityType, schemaResult.errors);
      }

      // Thread 3: Permission Validation using extracted package
      console.log('🔐 UNIFIED ENGINE: Starting permission validation');
      const requiredPermissions = pkg.getRequiredPermissions(operation as any);
      const userPermissions = context.permissions || [];
      const hasPermissions = requiredPermissions.every(perm => userPermissions.includes(perm));
      
      if (!hasPermissions) {
        const missingPermissions = requiredPermissions.filter(perm => !userPermissions.includes(perm));
        return this.createFailureResult(packageId, operation, entityType, [`Missing permissions: ${missingPermissions.join(', ')}`]);
      }

      // Thread 4: Business Rule Validation using extracted package (on assembled data)
      console.log('📋 UNIFIED ENGINE: Starting business rule validation');
      const businessRuleResult = await pkg.validateBusinessRules(assembledData, context);
      if (!businessRuleResult.isValid) {
        return this.createFailureResult(packageId, operation, entityType, businessRuleResult.errors);
      }

      // Thread 4: Success - all validations passed
      console.log('✅ UNIFIED ENGINE: All validations passed');
      
      // Thread 5: Execute Database Transaction
      console.log('💾 UNIFIED ENGINE: Starting database transaction');
      let transactionResult;
      try {
        if (entityType === 'scheduleBlock' && operation === 'create') {
          transactionResult = await storage.createScheduleBlock(assembledData);
          console.log('💾 UNIFIED ENGINE: Schedule block created with ID:', transactionResult.id);
        } else if (entityType === 'scheduleBlock' && operation === 'update') {
          transactionResult = await storage.updateScheduleBlock(assembledData.id, assembledData);
          console.log('💾 UNIFIED ENGINE: Schedule block updated ID:', assembledData.id);
        } else if (entityType === 'weekSchedule' && operation === 'create') {
          transactionResult = await storage.createWeekSchedule(assembledData);
          console.log('💾 UNIFIED ENGINE: Week schedule created with ID:', transactionResult.id);
        } else if (entityType === 'weekSchedule' && operation === 'update') {
          transactionResult = await storage.updateWeekSchedule(assembledData.id, assembledData);
          console.log('💾 UNIFIED ENGINE: Week schedule updated ID:', assembledData.id);
        } else if (entityType === 'shift' && operation === 'create') {
          transactionResult = await storage.createShift(assembledData);
          console.log('💾 UNIFIED ENGINE: Shift created with ID:', transactionResult.id);
        } else if (entityType === 'shift' && operation === 'update') {
          transactionResult = await storage.updateShift(assembledData.id, assembledData);
          console.log('💾 UNIFIED ENGINE: Shift updated ID:', assembledData.id);
        } else {
          throw new Error(`Transaction execution not implemented for ${entityType} ${operation}`);
        }
      } catch (error) {
        console.error('🚨 UNIFIED ENGINE: Transaction failed:', error);
        return this.createFailureResult(packageId, operation, entityType, [`Database transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      }
      
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
              'Business rule validation',
              'Database transaction'
            ],
            packageId
          }
        },
        threads: {
          schema: { success: true, errors: [], data: assembledData },
          permission: { success: true, errors: [], permissions: requiredPermissions },
          businessRules: { success: true, errors: [], warnings: businessRuleResult.warnings || [] },
          transaction: { success: true, errors: [], data: transactionResult }
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