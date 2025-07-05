import { v4 as uuidv4 } from 'uuid';
import { storage } from '../../storage';
import { dataAggregationEngine, DataAggregationTask, AggregatedUserData } from './DataAggregationEngine';
import { MessageService } from '../message-storage-service';
import { mongoConnection } from '../../db-mongo';
import type { User } from '@shared/schema';

// Import proven validation packages from existing ValidationEngine.ts
import { scheduleBlockPackage } from '../../../client/src/modules/scheduler/validation/packages/scheduleBlockPackage';
import { weekSchedulePackage } from '../../../client/src/modules/scheduler/validation/packages/weekSchedulePackage';
import { shiftPackage } from '../../../client/src/modules/scheduler/validation/packages/shiftPackage';

// Import messaging validation package
import { messagingPackage } from '../../../client/src/modules/messaging/validation/packages/messagingPackage';

// Import motivation note validation package
import { motivationNotePackage } from '../../../client/src/modules/messaging/validation/packages/motivationNotePackage';

// Import user profile validation package
import { userProfilePackage } from '../../../client/src/modules/users/validation/packages/userProfilePackage';

// Import auth profile validation package
import { authProfilePackage } from '../../../client/src/modules/users/validation/packages/authProfilePackage';

// Import user registration validation package
import { userRegistrationPackage } from '../../../client/src/modules/users/validation/packages/userRegistrationPackage';

/**
 * ValidationEngine30.ts - Enhanced Validation Engine
 * Plan 050: Enhanced version based on PROVEN ValidationEngine.ts patterns
 * Parent: Plan 048 Generic Data Aggregation dual-use architecture
 * 
 * BUILDS ON PROVEN TECHNOLOGY:
 * - 5-Thread validation process from ValidationEngine.ts
 * - Package registry system (scheduleBlock, weekSchedule, shift)
 * - Data assembly with server-side field injection
 * - Proven result structure with packageId, threads, metadata
 * 
 * ENHANCEMENTS:
 * - Supports aggregated context from DataAggregationEngine
 * - Enhanced permission validation with aggregated data
 * - Dual-use patterns (with/without aggregation)
 */

/**
 * Enhanced Package Registry - builds on proven ValidationEngine.ts registry
 */
const enhancedPackageRegistry = {
  scheduleBlock: scheduleBlockPackage,
  weekSchedule: weekSchedulePackage,
  shift: shiftPackage,
  messaging: messagingPackage,
  motivationNote: motivationNotePackage,
  userProfile: userProfilePackage,
  authProfile: authProfilePackage,
  userRegistration: userRegistrationPackage
} as const;

export interface ValidationRequest30 {
  operation: string;
  entityType: string;
  data: any;
  context: {
    userId: number;
    userRole: string;
    permissions?: string[];
    aggregatedData?: AggregatedUserData; // Optional: provided by orchestrator
  };
  entityId?: number | null;
}

export interface ValidationResult30 {
  packageId: string;
  operation: string;
  entityType: string;
  overall: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata: {
      validationTime: number;
      rulesApplied: string[];
      packageId: string;
      usedAggregation: boolean;
      engine: 'ValidationEngine30';
    };
  };
  threads: {
    dataAssembly?: { success: boolean; errors: string[]; data: any };
    schema?: { success: boolean; errors: string[]; data: any };
    permission?: { success: boolean; errors: string[]; permissions: string[] };
    businessRules?: { success: boolean; errors: string[]; warnings: string[] };
    transaction?: { success: boolean; errors: string[]; data: any };
    error?: { success: boolean; errors: string[]; data: any };
  };
}

/**
 * HybridTransactionHandler - Manages coordinated PostgreSQL + MongoDB transactions
 * Following MessageStorageService patterns for hybrid storage
 */
class HybridTransactionHandler {
  private messageService: MessageService;

  constructor() {
    this.messageService = MessageService.getInstance();
  }

  /**
   * Execute hybrid transaction for messaging operations
   * Coordinates PostgreSQL metadata with MongoDB content storage
   */
  async executeMessagingTransaction(validationPackage: any, request: any): Promise<any> {
    console.log(`[HybridTransactionHandler] Executing messaging transaction for ${request.operation}`);
    
    try {
      // Verify MongoDB connection availability (no fallbacks allowed)
      const db = mongoConnection.getDatabase();
      if (!db) {
        throw new Error('CRITICAL: MongoDB connection required for messaging operations - no fallbacks allowed');
      }

      // For messaging operations, delegate to MessageService hybrid storage patterns
      if (request.operation === 'create') {
        return await this.handleMessagingCreate(request.data, request.context);
      } else if (request.operation === 'update') {
        return await this.handleMessagingUpdate(request.data, request.context);
      } else if (request.operation === 'delete') {
        return await this.handleMessagingDelete(request.data, request.context);
      } else {
        throw new Error(`Unsupported messaging operation: ${request.operation}`);
      }

    } catch (error) {
      console.error(`[HybridTransactionHandler] Transaction failed:`, error);
      throw error;
    }
  }

  private async handleMessagingCreate(data: any, context: any): Promise<any> {
    // Use MessageService createNoteRef for hybrid storage transaction
    console.log(`[HybridTransactionHandler] Creating messaging note for user ${context.userId}`);
    console.log(`[HybridTransactionHandler] Input data:`, JSON.stringify(data, null, 2));
    
    // Map validation data to InsertNoteRef schema fields
    const noteRefData = {
      userId: context.userId,
      content: data.content || '',
      messageType: data.messageType || 'rich-text', // Correct field name from schema
      workflow: data.workflow || 'application',
      priority: data.priority || 'normal',
      isPrivate: data.isPrivate || false,
      receiverId: data.targetUserId || null, // Map targetUserId to receiverId
      noteType: 'message' // Default note type for messaging
    };
    
    console.log(`[HybridTransactionHandler] Mapped note data:`, JSON.stringify(noteRefData, null, 2));
    
    const result = await this.messageService.createNoteRef(noteRefData);

    return {
      isValid: true,
      errors: [],
      data: result
    };
  }

  private async handleMessagingUpdate(data: any, context: any): Promise<any> {
    console.log(`[HybridTransactionHandler] Updating messaging note ${data.id} for user ${context.userId}`);
    
    if (!data.id) {
      throw new Error('Note ID required for update operation');
    }

    const result = await this.messageService.updateNoteRef(
      data.id,
      { content: data.content || '' }
    );

    return {
      isValid: true,
      errors: [],
      data: result
    };
  }

  private async handleMessagingDelete(data: any, context: any): Promise<any> {
    console.log(`[HybridTransactionHandler] Deleting messaging note ${data.id} for user ${context.userId}`);
    
    if (!data.id) {
      throw new Error('Note ID required for delete operation');
    }

    const result = await this.messageService.deleteNoteRef(data.id);
    
    return {
      isValid: true,
      errors: [],
      data: { deleted: result, id: data.id }
    };
  }

  /**
   * Rollback capabilities for failed hybrid transactions
   */
  async rollbackTransaction(transactionId: string, operations: any[]): Promise<void> {
    console.log(`[HybridTransactionHandler] Rolling back transaction ${transactionId}`);
    console.warn(`[HybridTransactionHandler] Rollback not fully implemented - manual intervention may be required`);
  }
}

/**
 * ValidationEngine30 - Enhanced validation engine using proven 5-thread patterns
 * Built on ValidationEngine.ts proven architecture with aggregation enhancements
 */
export class ValidationEngine30 {
  private hybridTransactionHandler: HybridTransactionHandler;

  constructor() {
    this.hybridTransactionHandler = new HybridTransactionHandler();
  }

  /**
   * Get validation package for entity type (proven pattern from ValidationEngine.ts)
   */
  private getPackage(entityType: string) {
    const pkg = enhancedPackageRegistry[entityType as keyof typeof enhancedPackageRegistry];
    if (!pkg) {
      throw new Error(`No validation package found for entity type: ${entityType}`);
    }
    return pkg;
  }

  /**
   * Main validation method - enhanced version using proven 5-thread validation
   * PROVEN PATTERN: Based on ValidationEngine.validateAndExecute() with aggregation support
   */
  async validateAndExecute(
    operation: string,
    entityType: string,
    data: any,
    context: any,
    entityId?: number | null
  ): Promise<ValidationResult30> {
    const packageId = uuidv4();
    const startTime = Date.now();
    
    console.log(`🎯 VALIDATION ENGINE 30: Starting ${operation} for ${entityType}`, { packageId });

    try {
      // Get validation package (PROVEN PATTERN from ValidationEngine.ts)
      const pkg = this.getPackage(entityType);
      
      // THREAD 1: Enhanced Data Assembly (proven pattern + aggregation enhancement)
      console.log('🎁 VALIDATION ENGINE 30: Starting enhanced data assembly');
      console.log('🎁 Raw frontend data:', JSON.stringify(data, null, 2));
      
      const assembledData = { ...data };
      if (operation === 'create') {
        assembledData.createdBy = context.userId; // Proven server-side injection
        console.log('🎁 Injected createdBy from authenticated user:', context.userId);
      }
      
      // PROVEN DATE CONVERSION from ValidationEngine.ts
      if (entityType === 'shift' && assembledData.subscriptionDeadline) {
        if (typeof assembledData.subscriptionDeadline === 'string') {
          assembledData.subscriptionDeadline = new Date(assembledData.subscriptionDeadline);
          console.log('🎁 Converted subscriptionDeadline string to Date object');
        }
      }
      
      // ENHANCEMENT: Add aggregation metadata if available
      if (context.aggregatedData) {
        assembledData._aggregationContext = {
          hasAggregatedData: true,
          aggregationTimestamp: context.aggregatedData.metadata?.timestamp
        };
        console.log('🎁 ENHANCEMENT: Added aggregation context to assembled data');
      }
      
      console.log('🎁 Final assembled data:', JSON.stringify(assembledData, null, 2));

      // THREAD 2: Schema Validation (PROVEN PATTERN)
      console.log('🔍 VALIDATION ENGINE 30: Starting schema validation');
      const schemaResult = await pkg.validateSchema(assembledData, operation as 'create' | 'update' | 'delete' | 'read');
      console.log('🔍 Schema validation result:', schemaResult);
      if (!schemaResult.isValid) {
        return this.createFailureResult(packageId, operation, entityType, schemaResult.errors, false);
      }

      // THREAD 3: Enhanced Permission Validation
      console.log('🔐 VALIDATION ENGINE 30: Starting enhanced permission validation');
      let userPermissions: string[];
      
      if (context.aggregatedData?.aggregatedPermissions?.rolePermissions) {
        // ENHANCEMENT: Use aggregated permissions
        userPermissions = context.aggregatedData.aggregatedPermissions.rolePermissions || [];
        console.log('🔐 ENHANCEMENT: Using aggregated permissions:', userPermissions);
      } else {
        // PROVEN FALLBACK: Use context permissions
        userPermissions = context.permissions || [];
        console.log('🔐 PROVEN: Using context permissions:', userPermissions);
      }
      
      const requiredPermissions = pkg.getRequiredPermissions(operation as any);
      const hasPermissions = requiredPermissions.every(perm => userPermissions.includes(perm));
      
      if (!hasPermissions) {
        const missingPermissions = requiredPermissions.filter(perm => !userPermissions.includes(perm));
        return this.createFailureResult(packageId, operation, entityType, [`Missing permissions: ${missingPermissions.join(', ')}`], !!context.aggregatedData);
      }

      // THREAD 4: Enhanced Business Rule Validation
      console.log('📋 VALIDATION ENGINE 30: Starting enhanced business rule validation');
      const businessRuleResult = await pkg.validateBusinessRules(assembledData, context);
      if (!businessRuleResult.isValid) {
        return this.createFailureResult(packageId, operation, entityType, businessRuleResult.errors, !!context.aggregatedData);
      }

      // THREAD 5: Enhanced Database Transaction (PROVEN PATTERN + Hybrid Storage)
      console.log('💾 VALIDATION ENGINE 30: Starting enhanced database transaction');
      let transactionResult;
      try {
        // Handle messaging operations with hybrid storage
        if (entityType === 'messaging') {
          console.log('🔄 VALIDATION ENGINE 30: Using hybrid transaction handler for messaging');
          const hybridResult = await this.hybridTransactionHandler.executeMessagingTransaction(
            pkg, 
            { operation, data: assembledData, context }
          );
          transactionResult = hybridResult.data;
          console.log('💾 Messaging operation completed via hybrid handler');
        }
        // Handle scheduler operations with PostgreSQL storage (existing patterns)
        else if (entityType === 'scheduleBlock' && operation === 'create') {
          transactionResult = await storage.createScheduleBlock(assembledData);
          console.log('💾 Schedule block created with ID:', transactionResult.id);
        } else if (entityType === 'scheduleBlock' && operation === 'update') {
          transactionResult = await storage.updateScheduleBlock(assembledData.id, assembledData);
          console.log('💾 Schedule block updated ID:', assembledData.id);
        } else if (entityType === 'weekSchedule' && operation === 'create') {
          transactionResult = await storage.createWeekSchedule(assembledData);
          console.log('💾 Week schedule created with ID:', transactionResult.id);
        } else if (entityType === 'weekSchedule' && operation === 'update') {
          transactionResult = await storage.updateWeekSchedule(assembledData.id, assembledData);
          console.log('💾 Week schedule updated ID:', assembledData.id);
        } else if (entityType === 'shift' && operation === 'create') {
          transactionResult = await storage.createShift(assembledData);
          console.log('💾 Shift created with ID:', transactionResult.id);
        } else if (entityType === 'shift' && operation === 'update') {
          transactionResult = await storage.updateShift(assembledData.id, assembledData);
          console.log('💾 Shift updated ID:', assembledData.id);
        } 
        // Handle authProfile operations - lightweight user data fetching
        else if (entityType === 'authProfile' && operation === 'read') {
          console.log('🔍 VALIDATION ENGINE 30: Reading auth profile for user:', assembledData.userId || context.userId);
          const userId = assembledData.userId || context.userId;
          const user = await storage.getUser(userId);
          if (!user) {
            throw new Error(`User not found: ${userId}`);
          }
          transactionResult = { user };
          console.log('💾 Auth profile read completed for user:', user.username);
        } 
        else {
          throw new Error(`Transaction execution not implemented for ${entityType} ${operation}`);
        }
      } catch (error) {
        console.error('🚨 VALIDATION ENGINE 30: Transaction failed:', error);
        return this.createFailureResult(packageId, operation, entityType, [`Database transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`], !!context.aggregatedData);
      }
      
      const validationTime = Date.now() - startTime;
      
      // PROVEN SUCCESS RESULT STRUCTURE
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
              'Enhanced data assembly',
              'Schema validation',
              'Enhanced permission validation', 
              'Enhanced business rule validation',
              'Database transaction'
            ],
            packageId,
            usedAggregation: !!context.aggregatedData,
            engine: 'ValidationEngine30'
          }
        },
        threads: {
          dataAssembly: { success: true, errors: [], data: assembledData },
          schema: { success: true, errors: [], data: assembledData },
          permission: { success: true, errors: [], permissions: requiredPermissions },
          businessRules: { success: true, errors: [], warnings: businessRuleResult.warnings || [] },
          transaction: { success: true, errors: [], data: transactionResult }
        }
      };

    } catch (error) {
      console.error('🎯 VALIDATION ENGINE 30: Critical error:', error);
      return this.createFailureResult(packageId, operation, entityType, [`Critical validation error: ${error instanceof Error ? error.message : 'Unknown error'}`], !!context.aggregatedData);
    }
  }

  /**
   * Create failure result for validation errors (PROVEN PATTERN from ValidationEngine.ts)
   */
  private createFailureResult(packageId: string, operation: string, entityType: string, errors: string[], usedAggregation: boolean): ValidationResult30 {
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
          packageId,
          usedAggregation,
          engine: 'ValidationEngine30'
        }
      },
      threads: {
        error: { success: false, errors, data: null }
      }
    };
  }
}

// Export singleton instance
export const validationEngine30 = new ValidationEngine30();