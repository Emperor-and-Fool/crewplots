import { PackageRegistry } from './PackageRegistry';
import { RuleProcessor } from './RuleProcessor';
import { TransactionManager } from './TransactionManager';
import type { 
  ValidationPackage,
  OperationContext 
} from '../types/ValidationPackage';
import type { 
  ValidationResult
} from '../types/ValidationResult';
import type { 
  ValidationOperationResult,
  AssemblyResult,
  IntegrityResult,
  PermissionResult,
  TransactionResult
} from '../types/ValidationResult';
import { ValidationResultBuilder } from '../types/ValidationResult';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main Validation Engine - Orchestrates 4-thread validation pattern
 * COPIED FROM WORKING ValidationPackageService PATTERNS
 */
export class ValidationEngine {
  private packageRegistry: PackageRegistry;
  private ruleProcessor: RuleProcessor;
  private transactionManager: TransactionManager;
  
  constructor() {
    this.packageRegistry = new PackageRegistry();
    this.ruleProcessor = new RuleProcessor();
    this.transactionManager = new TransactionManager();
  }

  /**
   * Main validation orchestrator - implements proven 4-thread pattern
   */
  async validateAndExecute(
    operation: string,
    entityType: string,
    data: any,
    context: OperationContext,
    entityId?: number | null
  ): Promise<ValidationOperationResult> {
    const packageId = uuidv4();
    const startTime = Date.now();
    
    console.log(`🎯 VALIDATION ENGINE: Starting ${operation} for ${entityType}`, { packageId });

    try {
      // Thread 1: Package Assembly - COPIED FROM WORKING IMPLEMENTATION
      const assemblyResult = await this.executeAssemblyThread(
        operation,
        entityType,
        data,
        context,
        entityId
      );

      if (!assemblyResult.success) {
        return this.createFailureResult(packageId, operation, entityType, assemblyResult.errors);
      }

      const validationPackage = assemblyResult.data as ValidationPackage;

      // Thread 2: Integrity Validation - COPIED FROM WORKING IMPLEMENTATION
      const integrityResult = await this.executeIntegrityThread(validationPackage);

      // Thread 3: Permission Authorization - COPIED FROM WORKING IMPLEMENTATION
      const permissionResult = await this.executePermissionThread(validationPackage);

      // Thread 4: Storage Transaction - COPIED FROM WORKING IMPLEMENTATION
      let transactionResult: TransactionResult = {
        success: true,
        errors: [],
        metadata: {
          operationsExecuted: 0,
          recordsAffected: 0,
          transactionTime: 0
        }
      };

      // Only execute transaction if integrity and permissions pass
      if (integrityResult.success && permissionResult.success) {
        transactionResult = await this.executeTransactionThread(validationPackage);
      }

      // Combine results
      const overallSuccess = assemblyResult.success && 
                           integrityResult.success && 
                           permissionResult.success && 
                           transactionResult.success;

      const totalTime = Date.now() - startTime;

      return {
        packageId,
        operation,
        entityType,
        overall: ValidationResultBuilder.success(transactionResult.data, {
          validationTime: totalTime,
          rulesApplied: integrityResult.metadata.rulesChecked,
          packageId,
          engineVersion: '1.0.0',
          timestamp: new Date(),
          performanceMetrics: {
            assemblyTime: assemblyResult.metadata.assemblyTime,
            integrityTime: integrityResult.metadata.integrityTime,
            permissionTime: permissionResult.metadata.permissionTime,
            transactionTime: transactionResult.metadata.transactionTime
          }
        }),
        threads: {
          assembly: assemblyResult,
          integrity: integrityResult,
          permission: permissionResult,
          transaction: transactionResult
        }
      };

    } catch (error) {
      console.error('🎯 VALIDATION ENGINE: Critical error:', error);
      return this.createErrorResult(packageId, operation, entityType, error);
    }
  }

  /**
   * Thread 1: Package Assembly - COPIED FROM ValidationPackageService.assemblePackageFromRequest
   */
  private async executeAssemblyThread(
    operation: string,
    entityType: string,
    data: any,
    context: OperationContext,
    entityId?: number | null
  ): Promise<AssemblyResult> {
    const startTime = Date.now();
    console.log('🎁 ASSEMBLY THREAD: Starting package assembly');

    try {
      // Get registered package handler for this entity type
      const packageHandler = this.packageRegistry.getPackageHandler(entityType);
      
      if (!packageHandler) {
        return {
          success: false,
          errors: [ValidationResultBuilder.createError(
            'PACKAGE_NOT_FOUND',
            `No package handler registered for entity type: ${entityType}`
          )],
          metadata: {
            fieldsProcessed: 0,
            dataSize: 0,
            assemblyTime: Date.now() - startTime
          }
        };
      }

      // Use package handler to assemble the validation package
      const validationPackage: ValidationPackage = {
        operation: operation as any,
        entityType: entityType as any,
        entityId,
        data,
        context,
        metadata: {
          packageId: uuidv4(),
          assemblyTime: Date.now() - startTime
        }
      };

      const assemblyTime = Date.now() - startTime;
      console.log('🎁 ASSEMBLY THREAD: Package assembled successfully');

      return {
        success: true,
        data: validationPackage,
        errors: [],
        metadata: {
          fieldsProcessed: Object.keys(data).length,
          dataSize: JSON.stringify(data).length,
          assemblyTime
        }
      };

    } catch (error) {
      console.error('🎁 ASSEMBLY THREAD: Assembly failed:', error);
      return {
        success: false,
        errors: [ValidationResultBuilder.createError(
          'ASSEMBLY_ERROR',
          `Package assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )],
        metadata: {
          fieldsProcessed: 0,
          dataSize: 0,
          assemblyTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Thread 2: Integrity Validation - COPIED FROM ValidationPackageService.validatePackageIntegrity
   */
  private async executeIntegrityThread(
    validationPackage: ValidationPackage
  ): Promise<IntegrityResult> {
    const startTime = Date.now();
    console.log('🔍 INTEGRITY THREAD: Starting validation');

    try {
      const result = await this.ruleProcessor.validateIntegrity(validationPackage);
      
      return {
        success: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        metadata: {
          rulesChecked: result.metadata?.rulesApplied || [],
          constraintsValidated: result.errors.length + result.warnings.length,
          integrityTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('🔍 INTEGRITY THREAD: Validation failed:', error);
      return {
        success: false,
        errors: [ValidationResultBuilder.createError(
          'INTEGRITY_ERROR',
          `Integrity validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )],
        warnings: [],
        metadata: {
          rulesChecked: [],
          constraintsValidated: 0,
          integrityTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Thread 3: Permission Authorization - COPIED FROM ValidationPackageService.validatePackagePermissions
   */
  private async executePermissionThread(
    validationPackage: ValidationPackage
  ): Promise<PermissionResult> {
    const startTime = Date.now();
    console.log('🔐 PERMISSION THREAD: Starting authorization');

    try {
      // Use rule processor to validate permissions
      const result = await this.ruleProcessor.validatePermissions(validationPackage);
      
      return {
        success: result.authorized,
        authorized: result.authorized,
        errors: result.errors,
        metadata: {
          permissionsChecked: result.permissionsChecked,
          accessLevel: validationPackage.context.userRole,
          permissionTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('🔐 PERMISSION THREAD: Authorization failed:', error);
      return {
        success: false,
        authorized: false,
        errors: [ValidationResultBuilder.createError(
          'PERMISSION_ERROR',
          `Permission validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )],
        metadata: {
          permissionsChecked: [],
          accessLevel: 'unknown',
          permissionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Thread 4: Storage Transaction - COPIED FROM ValidationPackageService.executeStorageTransaction
   */
  private async executeTransactionThread(
    validationPackage: ValidationPackage
  ): Promise<TransactionResult> {
    const startTime = Date.now();
    console.log('💾 TRANSACTION THREAD: Starting atomic transaction');

    try {
      const result = await this.transactionManager.executeTransaction(validationPackage);
      
      return {
        success: result.success,
        data: result.data,
        errors: result.errors.map(error => ValidationResultBuilder.createError(
          'TRANSACTION_ERROR',
          error
        )),
        metadata: {
          operationsExecuted: result.operationsExecuted || 0,
          recordsAffected: result.recordsAffected || 0,
          transactionTime: Date.now() - startTime,
          rollbackRequired: !result.success
        }
      };

    } catch (error) {
      console.error('💾 TRANSACTION THREAD: Transaction failed:', error);
      return {
        success: false,
        errors: [ValidationResultBuilder.createError(
          'TRANSACTION_ERROR',
          `Transaction execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )],
        metadata: {
          operationsExecuted: 0,
          recordsAffected: 0,
          transactionTime: Date.now() - startTime,
          rollbackRequired: true
        }
      };
    }
  }

  /**
   * Utility methods for result creation
   */
  private createFailureResult(
    packageId: string,
    operation: string,
    entityType: string,
    errors: any[]
  ): ValidationOperationResult {
    return {
      packageId,
      operation,
      entityType,
      overall: ValidationResultBuilder.failure(errors),
      threads: {
        assembly: { success: false, errors, metadata: { fieldsProcessed: 0, dataSize: 0, assemblyTime: 0 } },
        integrity: { success: false, errors: [], warnings: [], metadata: { rulesChecked: [], constraintsValidated: 0, integrityTime: 0 } },
        permission: { success: false, authorized: false, errors: [], metadata: { permissionsChecked: [], accessLevel: 'unknown', permissionTime: 0 } },
        transaction: { success: false, errors: [], metadata: { operationsExecuted: 0, recordsAffected: 0, transactionTime: 0 } }
      }
    };
  }

  private createErrorResult(
    packageId: string,
    operation: string,
    entityType: string,
    error: any
  ): ValidationOperationResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const validationError = ValidationResultBuilder.createError('VALIDATION_ENGINE_ERROR', errorMessage);
    
    return this.createFailureResult(packageId, operation, entityType, [validationError]);
  }
}