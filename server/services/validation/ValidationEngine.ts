import { db } from '../../db';
import { 
  scheduleBlocks, 
  weekSchedules, 
  shifts,
  users,
  locations 
} from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ValidationPackage, 
  ValidationOperationResult,
  ValidationError,
  AssemblyResult,
  IntegrityResult,
  PermissionResult,
  TransactionResult
} from './types';

/**
 * Simplified Validation Engine - COPIED FROM WORKING ValidationPackageService
 * KISS approach: All 4-thread validation logic in one file
 */
export class ValidationEngine {
  
  /**
   * Main validation orchestrator - COPIED FROM ValidationPackageService.validateAndExecute
   */
  async validateAndExecute(
    operation: string,
    entityType: string,
    data: any,
    context: any,
    entityId?: number | null
  ): Promise<ValidationOperationResult> {
    const packageId = uuidv4();
    const startTime = Date.now();
    
    console.log(`🎯 VALIDATION ENGINE: Starting ${operation} for ${entityType}`, { packageId });

    try {
      // Create validation package
      const validationPackage: ValidationPackage = {
        operation: operation as any,
        entityType: entityType as any,
        entityId,
        data,
        context,
        metadata: { packageId, assemblyTime: Date.now() - startTime }
      };

      // Thread 1: Assembly - COPIED FROM assemblePackageFromRequest
      const assemblyResult = await this.executeAssemblyThread(validationPackage);
      if (!assemblyResult.success) {
        return this.createFailureResult(packageId, operation, entityType, assemblyResult.errors);
      }

      // Thread 2: Integrity - COPIED FROM validatePackageIntegrity
      const integrityResult = await this.executeIntegrityThread(validationPackage);

      // Thread 3: Permission - COPIED FROM validatePackagePermissions  
      const permissionResult = await this.executePermissionThread(validationPackage);

      // Thread 4: Transaction - COPIED FROM executeStorageTransaction
      let transactionResult: TransactionResult = {
        success: true,
        errors: [],
        metadata: { operationsExecuted: 0, recordsAffected: 0, transactionTime: 0 }
      };

      if (integrityResult.success && permissionResult.success) {
        transactionResult = await this.executeTransactionThread(validationPackage);
      }

      const overallSuccess = assemblyResult.success && 
                           integrityResult.success && 
                           permissionResult.success && 
                           transactionResult.success;

      return {
        packageId,
        operation,
        entityType,
        overall: {
          isValid: overallSuccess,
          errors: [...assemblyResult.errors, ...integrityResult.errors, ...permissionResult.errors, ...transactionResult.errors],
          warnings: integrityResult.warnings,
          metadata: {
            validationTime: Date.now() - startTime,
            rulesApplied: integrityResult.metadata.rulesChecked,
            packageId
          }
        },
        threads: { assembly: assemblyResult, integrity: integrityResult, permission: permissionResult, transaction: transactionResult }
      };

    } catch (error) {
      console.error('🎯 VALIDATION ENGINE: Critical error:', error);
      return this.createErrorResult(packageId, operation, entityType, error);
    }
  }

  /**
   * Thread 1: Assembly - COPIED FROM ValidationPackageService
   */
  private async executeAssemblyThread(validationPackage: ValidationPackage): Promise<AssemblyResult> {
    const startTime = Date.now();
    console.log('🎁 ASSEMBLY THREAD: Starting package assembly');

    try {
      const assemblyTime = Date.now() - startTime;
      console.log('🎁 ASSEMBLY THREAD: Package assembled successfully');

      return {
        success: true,
        data: validationPackage,
        errors: [],
        metadata: {
          fieldsProcessed: Object.keys(validationPackage.data).length,
          dataSize: JSON.stringify(validationPackage.data).length,
          assemblyTime
        }
      };

    } catch (error) {
      console.error('🎁 ASSEMBLY THREAD: Assembly failed:', error);
      return {
        success: false,
        errors: [this.createError('ASSEMBLY_ERROR', `Package assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`)],
        metadata: { fieldsProcessed: 0, dataSize: 0, assemblyTime: Date.now() - startTime }
      };
    }
  }

  /**
   * Thread 2: Integrity - COPIED FROM ValidationPackageService
   */
  private async executeIntegrityThread(validationPackage: ValidationPackage): Promise<IntegrityResult> {
    const startTime = Date.now();
    console.log('🔍 INTEGRITY THREAD: Starting validation');

    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationError[] = [];
      const rulesChecked: string[] = [];

      // Basic validation based on entity type - COPIED FROM working patterns
      switch (validationPackage.entityType) {
        case 'schedule':
          rulesChecked.push('schedule_validation');
          await this.validateScheduleEntity(validationPackage, errors, warnings);
          break;
        case 'user':
          rulesChecked.push('user_validation');
          await this.validateUserEntity(validationPackage, errors, warnings);
          break;
        case 'location':
          rulesChecked.push('location_validation');
          await this.validateLocationEntity(validationPackage, errors, warnings);
          break;
      }

      return {
        success: errors.length === 0,
        errors,
        warnings,
        metadata: {
          rulesChecked,
          constraintsValidated: errors.length + warnings.length,
          integrityTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('🔍 INTEGRITY THREAD: Validation failed:', error);
      return {
        success: false,
        errors: [this.createError('INTEGRITY_ERROR', `Integrity validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)],
        warnings: [],
        metadata: { rulesChecked: [], constraintsValidated: 0, integrityTime: Date.now() - startTime }
      };
    }
  }

  /**
   * Thread 3: Permission - COPIED FROM ValidationPackageService
   */
  private async executePermissionThread(validationPackage: ValidationPackage): Promise<PermissionResult> {
    const startTime = Date.now();
    console.log('🔐 PERMISSION THREAD: Starting authorization');

    try {
      const errors: ValidationError[] = [];
      const permissionsChecked: string[] = [];

      // Get required permissions - COPIED FROM working patterns
      const requiredPermissions = this.getRequiredPermissions(validationPackage.entityType, validationPackage.operation);
      permissionsChecked.push(...requiredPermissions);

      // Check user permissions
      const userPermissions = validationPackage.context.permissions || [];
      const deniedPermissions = requiredPermissions.filter(permission => !userPermissions.includes(permission));

      if (deniedPermissions.length > 0) {
        errors.push(this.createError('INSUFFICIENT_PERMISSIONS', `Missing required permissions: ${deniedPermissions.join(', ')}`));
      }

      const authorized = errors.length === 0;
      console.log('🔐 PERMISSION THREAD: Authorization completed:', { authorized });

      return {
        success: authorized,
        authorized,
        errors,
        metadata: {
          permissionsChecked,
          accessLevel: validationPackage.context.userRole,
          permissionTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('🔐 PERMISSION THREAD: Authorization failed:', error);
      return {
        success: false,
        authorized: false,
        errors: [this.createError('PERMISSION_ERROR', `Permission validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)],
        metadata: { permissionsChecked: [], accessLevel: 'unknown', permissionTime: Date.now() - startTime }
      };
    }
  }

  /**
   * Thread 4: Transaction - COPIED FROM ValidationPackageService
   */
  private async executeTransactionThread(validationPackage: ValidationPackage): Promise<TransactionResult> {
    const startTime = Date.now();
    console.log('💾 TRANSACTION THREAD: Starting atomic transaction');

    try {
      return await db.transaction(async (tx) => {
        let result: any = {};
        let operationsExecuted = 0;
        let recordsAffected = 0;

        switch (validationPackage.entityType) {
          case 'schedule':
            result = await this.executeScheduleTransaction(validationPackage, tx);
            operationsExecuted = result.operationsExecuted || 0;
            recordsAffected = result.recordsAffected || 0;
            break;
          default:
            console.log('💾 TRANSACTION THREAD: Entity type not implemented yet:', validationPackage.entityType);
        }

        console.log('💾 TRANSACTION THREAD: Transaction completed successfully');

        return {
          success: true,
          data: result.data,
          errors: [],
          metadata: {
            operationsExecuted,
            recordsAffected,
            transactionTime: Date.now() - startTime
          }
        };
      });

    } catch (error) {
      console.error('💾 TRANSACTION THREAD: Transaction failed:', error);
      return {
        success: false,
        errors: [this.createError('TRANSACTION_ERROR', `Transaction execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)],
        metadata: { operationsExecuted: 0, recordsAffected: 0, transactionTime: Date.now() - startTime }
      };
    }
  }

  /**
   * Schedule entity validation - COPIED FROM ValidationPackageService
   */
  private async validateScheduleEntity(validationPackage: ValidationPackage, errors: ValidationError[], warnings: ValidationError[]): Promise<void> {
    const data = validationPackage.data;
    
    if (data.scheduleBlock) {
      if (!data.scheduleBlock.name) {
        errors.push(this.createError('MISSING_REQUIRED_FIELD', 'Schedule block name is required'));
      }
      if (!data.scheduleBlock.locationId) {
        errors.push(this.createError('MISSING_REQUIRED_FIELD', 'Schedule block location ID is required'));
      }
    }

    if (data.shifts && Array.isArray(data.shifts)) {
      data.shifts.forEach((shift: any, index: number) => {
        if (!shift.title) {
          errors.push(this.createError('MISSING_REQUIRED_FIELD', `Shift ${index + 1}: title is required`));
        }
        if (shift.startTime && shift.endTime && shift.startTime >= shift.endTime) {
          errors.push(this.createError('BUSINESS_RULE_VIOLATION', `Shift ${index + 1}: End time must be after start time`));
        }
      });
    }
  }

  /**
   * User and location validation - PLACEHOLDERS
   */
  private async validateUserEntity(validationPackage: ValidationPackage, errors: ValidationError[], warnings: ValidationError[]): Promise<void> {
    // User validation logic would go here
  }

  private async validateLocationEntity(validationPackage: ValidationPackage, errors: ValidationError[], warnings: ValidationError[]): Promise<void> {
    // Location validation logic would go here
  }

  /**
   * Schedule transaction - COPIED FROM ValidationPackageService
   */
  private async executeScheduleTransaction(validationPackage: ValidationPackage, tx: any): Promise<{ data: any; operationsExecuted: number; recordsAffected: number }> {
    const data = validationPackage.data;
    let operationsExecuted = 0;
    let recordsAffected = 0;
    let scheduleBlockId: number | null = null;

    if (data.scheduleBlock) {
      if (validationPackage.operation === 'create') {
        const [createdScheduleBlock] = await tx
          .insert(scheduleBlocks)
          .values({
            name: data.scheduleBlock.name,
            description: data.scheduleBlock.description || '',
            locationId: data.scheduleBlock.locationId,
            isActive: data.scheduleBlock.isActive ?? true,
            createdBy: validationPackage.context.userId
          })
          .returning({ id: scheduleBlocks.id });

        scheduleBlockId = createdScheduleBlock.id;
        operationsExecuted++;
        recordsAffected++;
        console.log('💾 TRANSACTION: Schedule block created with ID:', scheduleBlockId);
      }
    }

    return { data: { scheduleBlockId }, operationsExecuted, recordsAffected };
  }

  /**
   * Get required permissions - COPIED FROM working patterns
   */
  private getRequiredPermissions(entityType: string, operation: string): string[] {
    const permissionMap: Record<string, Record<string, string[]>> = {
      schedule: {
        create: ['schedule.create', 'scheduler_development.write'],
        update: ['schedule.update', 'scheduler_development.write'],
        delete: ['schedule.delete', 'scheduler_development.execute'],
        read: ['schedule.read', 'scheduler_development.read']
      }
    };

    return permissionMap[entityType]?.[operation] || [];
  }

  /**
   * Utility methods
   */
  private createError(code: string, message: string, field?: string): ValidationError {
    return { code, message, field, severity: 'error' };
  }

  private createFailureResult(packageId: string, operation: string, entityType: string, errors: ValidationError[]): ValidationOperationResult {
    return {
      packageId,
      operation,
      entityType,
      overall: { isValid: false, errors, warnings: [] },
      threads: {
        assembly: { success: false, errors, metadata: { fieldsProcessed: 0, dataSize: 0, assemblyTime: 0 } },
        integrity: { success: false, errors: [], warnings: [], metadata: { rulesChecked: [], constraintsValidated: 0, integrityTime: 0 } },
        permission: { success: false, authorized: false, errors: [], metadata: { permissionsChecked: [], accessLevel: 'unknown', permissionTime: 0 } },
        transaction: { success: false, errors: [], metadata: { operationsExecuted: 0, recordsAffected: 0, transactionTime: 0 } }
      }
    };
  }

  private createErrorResult(packageId: string, operation: string, entityType: string, error: any): ValidationOperationResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const validationError = this.createError('VALIDATION_ENGINE_ERROR', errorMessage);
    return this.createFailureResult(packageId, operation, entityType, [validationError]);
  }
}