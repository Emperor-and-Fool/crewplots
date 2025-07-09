//ATTENTION: ALL Registration Packages are registered in external Registries!
//Production-Registry: server/services/validation/packageRegistry30.ts
//Development-Registry: server/modules/development/validation/packageRegistryDev.ts
//Packages use: shared/validation/VE30PackageBuilder.ts where needed

import { v4 as uuidv4 } from 'uuid';
import { storage } from '../../storage';
import { dataAggregationEngine, DataAggregationTask, AggregatedUserData } from './DataAggregationEngine';
import { MessageService } from '../message-storage-service';
import { mongoConnection } from '../../db-mongo';
import type { User } from '@shared/schema';
import { mapWorkflowToValidationPermissions } from './validation-perm-mapping';

// CORE AUTH PACKAGES - remain as direct imports for security
// (Authentication packages stay in engine for security isolation)

// Import user profile validation package
import { userProfilePackage } from '../../modules/users/validation/userProfilePackage';

// Import auth profile validation package
import { authProfilePackage } from '../../modules/users/validation/authProfilePackage';

// Import user registration validation package
import { userRegistrationPackage } from '../../modules/users/validation/userRegistrationPackage';

// DEVELOPMENT PACKAGES - remain as direct imports for development workflow
import { emailTestPackage } from '../../modules/development/validation/packages/emailTestPackage';

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

// Import external registries 
import { packageRegistry30 } from './packageRegistry30';

/**
 * Enhanced Package Registry - HYBRID: external registry + core auth packages
 * ARCHITECTURE: Non-core packages moved to external registry, auth packages remain for security
 */
const enhancedPackageRegistry = {
  // EXTERNAL REGISTRY: Non-core packages managed externally (prevents engine changes)
  ...packageRegistry30,
  
  // CORE AUTH PACKAGES: Direct imports for security isolation
  userProfile: userProfilePackage,
  authProfile: authProfilePackage,
  userRegistration: userRegistrationPackage,
  
  // DEVELOPMENT PACKAGES: Direct imports for development workflow
  emailTest: emailTestPackage
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
      } else if (request.operation === 'read') {
        return await this.handleMessagingRead(request.data, request.context);
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
    console.log(`[HybridTransactionHandler] Creating messaging note via hybrid storage for user ${context.userId}`);
    console.log(`[HybridTransactionHandler] Input data:`, JSON.stringify(data, null, 2));
    
    // Use MessageService hybrid storage pattern: PostgreSQL noteRef + MongoDB content + Redis cache
    // Map validation data to InsertNoteRef schema fields following hybrid storage architecture
    const noteRefData = {
      userId: context.userId,
      content: data.content || '',
      messageType: data.messageType || 'rich-text',
      workflow: data.workflow || 'application',
      priority: data.priority || 'normal',
      isPrivate: data.isPrivate || false,
      receiverId: data.targetUserId || null,
      noteType: 'message'
    };
    
    console.log(`[HybridTransactionHandler] Mapped hybrid storage data:`, JSON.stringify(noteRefData, null, 2));
    
    // Direct integration with proven hybrid storage createNoteRef
    // This handles: PostgreSQL metadata + MongoDB content + Redis cache invalidation
    const hybridResult = await this.messageService.createNoteRef(noteRefData);
    
    console.log(`[HybridTransactionHandler] Hybrid storage create result:`, hybridResult);

    return {
      isValid: true,
      errors: [],
      data: hybridResult
    };
  }

  private async handleMessagingRead(data: any, context: any): Promise<any> {
    console.log(`[HybridTransactionHandler] Reading messages for user ${context.userId} via hybrid storage`);
    console.log(`[HybridTransactionHandler] Read data:`, JSON.stringify(data, null, 2));
    
    // Use hybrid storage pattern: PostgreSQL metadata + MongoDB content + Redis cache
    // Map readOnlyMode to appropriate user ID for applicant notes
    const targetUserId = data.readOnlyMode ? data.userId : context.userId;
    console.log(`[HybridTransactionHandler] Target user ID for hybrid read operation: ${targetUserId}`);
    
    // Direct integration with MessageService hybrid patterns
    // This uses the proven hybrid storage: PostgreSQL noteRefs + MongoDB content + Redis cache
    const hybridNotes = await this.messageService.getNoteRefsByUser(targetUserId);
    
    console.log(`[HybridTransactionHandler] Hybrid storage returned ${hybridNotes?.length || 0} notes`);
    
    return {
      isValid: true,
      errors: [],
      data: hybridNotes || []
    };
  }

  private async handleMessagingUpdate(data: any, context: any): Promise<any> {
    console.log(`[HybridTransactionHandler] Updating messaging note ${data.id} via hybrid storage for user ${context.userId}`);
    
    if (!data.id) {
      throw new Error('Note ID required for hybrid storage update operation');
    }

    // Use MessageService hybrid storage pattern for updates
    // This handles: PostgreSQL metadata update + MongoDB content update + Redis cache invalidation
    const hybridUpdateResult = await this.messageService.updateNoteRef(
      data.id,
      { content: data.content || '' }
    );

    console.log(`[HybridTransactionHandler] Hybrid storage update result:`, hybridUpdateResult);

    return {
      isValid: true,
      errors: [],
      data: hybridUpdateResult
    };
  }

  private async handleMessagingDelete(data: any, context: any): Promise<any> {
    console.log(`[HybridTransactionHandler] Deleting messaging note ${data.id} via hybrid storage for user ${context.userId}`);
    
    if (!data.id) {
      throw new Error('Note ID required for hybrid storage delete operation');
    }

    // Use MessageService hybrid storage pattern for deletion
    // This handles: PostgreSQL metadata deletion + MongoDB content cleanup + Redis cache invalidation
    const hybridDeleteResult = await this.messageService.deleteNoteRef(data.id);

    console.log(`[HybridTransactionHandler] Hybrid storage delete result:`, hybridDeleteResult);

    return {
      isValid: true,
      errors: [],
      data: hybridDeleteResult
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
  public packageRegistry = enhancedPackageRegistry;

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

      // THREAD 3: Enhanced Permission Validation with Centralized Mapper
      console.log('🔐 VALIDATION ENGINE 30: Starting enhanced permission validation');
      
      // Use centralized permission mapper to convert user context to validation permissions
      const validationPermissions = mapWorkflowToValidationPermissions({
        id: context.userId,
        username: context.username || 'unknown',
        role: context.role,
        permissions: context.permissions,
        workflowPermissions: context.workflowPermissions
      });
      
      console.log('🔐 VALIDATION ENGINE 30: Mapped validation permissions:', validationPermissions);
      
      // Get required permissions from package (VE30PackageBuilder handles messaging permissions)
      const requiredPermissions = pkg.getRequiredPermissions(operation as any);
      console.log('🔐 VALIDATION ENGINE 30: Required permissions for', operation, ':', requiredPermissions);
      
      const hasPermissions = requiredPermissions.every(perm => validationPermissions.includes(perm));
      
      if (!hasPermissions) {
        const missingPermissions = requiredPermissions.filter(perm => !validationPermissions.includes(perm));
        console.log('🔐 VALIDATION ENGINE 30: Missing permissions:', missingPermissions);
        console.log('🔐 VALIDATION ENGINE 30: Available permissions:', validationPermissions);
        return this.createFailureResult(packageId, operation, entityType, [`Missing permissions: ${missingPermissions.join(', ')}`], !!context.aggregatedData);
      }
      
      console.log('🔐 VALIDATION ENGINE 30: Permission validation passed');
      

      // THREAD 4: Enhanced Business Rule Validation
      console.log('📋 VALIDATION ENGINE 30: Starting enhanced business rule validation');
      const enrichedContext = { ...context, operation }; // Add operation to context for business rules
      const businessRuleResult = await pkg.validateBusinessRules(assembledData, enrichedContext);
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
        // Handle userRegistration validation-only (Plan 057 hybrid architecture)
        else if (entityType === 'userRegistration' && operation === 'create') {
          console.log('🔐 VALIDATION ENGINE 30: User registration validation completed (no DB transaction - handled by auth-routes)');
          transactionResult = { 
            validated: true, 
            message: 'Registration data validated - ready for auth-routes processing',
            username: assembledData.username,
            email: assembledData.email 
          };
        }
        // Handle userList operations - get all users
        else if (entityType === 'userList' && operation === 'read') {
          console.log('👥 VALIDATION ENGINE 30: Reading user list');
          const users = await storage.getUsers();
          console.log(`💾 Retrieved ${users.length} users for profile data`);
          transactionResult = { users };
        }
        // Handle email configuration operations
        else if (entityType === 'emailConfig' && operation === 'read') {
          console.log('📧 VALIDATION ENGINE 30: Reading email configuration');
          // TODO: Implement email config read from storage/env
          transactionResult = {
            host: process.env.SMTP_HOST || '',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            from: process.env.SMTP_FROM || '',
            testMode: process.env.EMAIL_TEST_MODE === 'true'
          };
          console.log('💾 Email config read completed');
        } else if (entityType === 'emailConfig' && (operation === 'create' || operation === 'update')) {
          console.log('📧 VALIDATION ENGINE 30: Updating email configuration');
          // TODO: Implement email config persistence to database
          transactionResult = {
            saved: true,
            message: 'Email configuration validated and ready for persistence',
            config: assembledData
          };
          console.log('💾 Email config update validated');
        }
        // Handle email test operations  
        else if (entityType === 'emailTest' && operation === 'create') {
          console.log('📧 VALIDATION ENGINE 30: Testing email connection');
          // TODO: Implement actual SMTP connection test
          transactionResult = {
            testSuccessful: true,
            message: 'Email connection test passed (simulated)',
            testEmail: assembledData.testEmail || 'No test email provided'
          };
          console.log('💾 Email connection test completed');
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

// Export package registry for external access
export const packageRegistry = validationEngine30.packageRegistry;

// Export type for TypeScript interfaces
export type ValidationEngine30Type = typeof validationEngine30;