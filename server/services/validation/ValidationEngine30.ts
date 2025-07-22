//ATTENTION: ALL Registration Packages are registered in external Registries!
//Production-Registry: server/services/validation/packageRegistry30.ts
//Development-Registry: server/modules/development/validation/packageRegistryDev.ts
//Packages use: shared/validation/VE30PackageBuilder.ts where needed

import { v4 as uuidv4 } from 'uuid';
import { storage } from '../../storage';
import { dataAggregationEngine, DataAggregationTask, AggregatedUserData } from './DataAggregationEngine';
import { MessageService } from '../../modules/messaging';
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

// EMAIL PACKAGES - required for email system VE30 integration
import { emailConfigPackage } from '../../modules/email/validation/emailConfigPackage';
import { emailSentPackage } from '../../modules/email/validation/emailSentPackage';

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
  emailTest: emailTestPackage,
  
  // EMAIL PACKAGES: Required for email system VE30 integration
  emailConfig: emailConfigPackage,
  emailSent: emailSentPackage
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
   * Generic CRUD transaction executor for all entity types
   * Enables ANY entity to use VE30 validation with standardized CRUD operations
   * Implementation of Plan 063: VE30 Generic CRUD Interface
   */
  async executeGenericCrud(entityType: string, operation: string, assembledData: any): Promise<any> {
    console.log(`🔄 GENERIC CRUD: Executing ${operation} for ${entityType}`);
    
    const entityMethods = {
      // USER OPERATIONS
      user: {
        create: (data: any) => storage.createUser(data.userData),
        read: (data: any) => storage.getUser(data.id || data.userId),
        update: (data: any) => storage.updateUser(data.id, data.userData),
        delete: (data: any) => storage.deleteUser(data.id),
        list: () => storage.getUsers()
      },
      // LOCATION OPERATIONS  
      location: {
        create: (data: any) => storage.createLocation(data.locationData),
        read: (data: any) => storage.getLocation(data.id),
        update: (data: any) => storage.updateLocation(data.id, data.locationData),
        delete: (data: any) => storage.deleteLocation(data.id),
        list: () => storage.getLocations()
      },
      // COMPETENCY OPERATIONS
      competency: {
        create: (data: any) => storage.createCompetency(data.competencyData),
        read: (data: any) => storage.getCompetency(data.id),
        update: (data: any) => storage.updateCompetency(data.id, data.competencyData),
        delete: (data: any) => storage.deleteCompetency(data.id),
        list: () => storage.getCompetencies()
      },
      // SCHEDULE BLOCK OPERATIONS
      scheduleBlock: {
        create: async (data: any) => {
          console.log(`🔄 SCHEDULE BLOCK CREATE: Creating block with ${data.maxWeeks || 1} weeks`);
          
          // Create the schedule block first
          const scheduleBlock = await storage.createScheduleBlock(data);
          console.log(`🔄 SCHEDULE BLOCK CREATE: Created block with ID ${scheduleBlock.id}`);
          
          // Create week schedules for the specified number of weeks
          const maxWeeks = data.maxWeeks || 1;
          const weekSchedules = [];
          
          for (let weekNumber = 1; weekNumber <= maxWeeks; weekNumber++) {
            const weekScheduleData = {
              scheduleBlockId: scheduleBlock.id,
              weekNumber,
              createdBy: data.createdBy
            };
            
            console.log(`🔄 WEEK SCHEDULE CREATE: Creating week ${weekNumber} for block ${scheduleBlock.id}`);
            const weekSchedule = await storage.createWeekSchedule(weekScheduleData);
            weekSchedules.push(weekSchedule);
          }
          
          console.log(`🔄 SCHEDULE BLOCK CREATE: Created ${weekSchedules.length} week schedules`);
          
          return {
            ...scheduleBlock,
            weekSchedules  // Include created week schedules in response
          };
        },
        read: (data: any) => storage.getScheduleBlock(data.id),
        update: (data: any) => storage.updateScheduleBlock(data.id, data),
        delete: (data: any) => storage.deleteScheduleBlock(data.id),
        list: () => storage.getScheduleBlocks()
      },
      // WEEK SCHEDULE OPERATIONS
      weekSchedule: {
        create: (data: any) => storage.createWeekSchedule(data),
        read: (data: any) => storage.getWeekSchedule(data.id),
        update: (data: any) => storage.updateWeekSchedule(data.id, data),
        delete: (data: any) => storage.deleteWeekSchedule(data.id),
        list: () => storage.getWeekSchedules()
      },
      // SHIFT OPERATIONS
      shift: {
        create: (data: any) => storage.createShift(data),
        read: (data: any) => storage.getShift(data.id),
        update: (data: any) => storage.updateShift(data.id, data),
        delete: (data: any) => storage.deleteShift(data.id),
        list: () => storage.getShifts()
      },
      // KNOWLEDGE BASE OPERATIONS
      kbCategory: {
        create: (data: any) => storage.createKbCategory(data.categoryData),
        read: (data: any) => storage.getKbCategory(data.id),
        update: (data: any) => storage.updateKbCategory(data.id, data.categoryData),
        delete: (data: any) => storage.deleteKbCategory(data.id),
        list: () => storage.getKbCategories()
      },
      kbArticle: {
        create: (data: any) => storage.createKbArticle(data.articleData),
        read: (data: any) => storage.getKbArticle(data.id),
        update: (data: any) => storage.updateKbArticle(data.id, data.articleData),
        delete: (data: any) => storage.deleteKbArticle(data.id),
        list: () => storage.getKbArticles()
      }
    };
    
    const entityOps = entityMethods[entityType as keyof typeof entityMethods];
    if (!entityOps) {
      throw new Error(`Entity type '${entityType}' not supported for generic CRUD operations`);
    }
    
    const method = entityOps[operation as keyof typeof entityOps];
    if (!method) {
      throw new Error(`Operation '${operation}' not supported for entity '${entityType}'`);
    }
    
    console.log(`🔄 GENERIC CRUD: Calling storage.${entityType}.${operation}`);
    const result = await method(assembledData);
    console.log(`🔄 GENERIC CRUD: ${operation} completed for ${entityType}`, (result && typeof result === 'object' && 'id' in result) ? `ID: ${result.id}` : '');
    
    return result;
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
    
    // CRITICAL DEBUG: Check if this is a delete operation reaching ValidationEngine30
    if (operation === 'delete' && entityType === 'scheduleBlock') {
      console.log('🔥 VE30 ENTRY: scheduleBlock delete operation reached ValidationEngine30.validateAndExecute()');
      console.log('🔥 VE30 ENTRY: entityId =', entityId);
      console.log('🔥 VE30 ENTRY: data =', JSON.stringify(data, null, 2));
    }

    try {
      // Get validation package (PROVEN PATTERN from ValidationEngine.ts)
      const pkg = this.getPackage(entityType);
      
      // THREAD 1: Enhanced Data Assembly (proven pattern + aggregation enhancement)
      console.log('🎁 VALIDATION ENGINE 30: Starting enhanced data assembly');
      console.log('🎁 Raw frontend data:', JSON.stringify(data, null, 2));
      
      // USE PACKAGE ASSEMBLY FUNCTION (historical ValidationPackageService pattern)
      const assembledData = await pkg.assemblePackage(data, context.user, operation);
      console.log('🎁 Package assembled data:', JSON.stringify(assembledData, null, 2));
      
      // Track cascade delete flag for debugging
      if (assembledData.cascadeDelete) {
        console.log('🔥 CASCADE FLAG DETECTED: cascadeDelete=true from package assembly');
      }


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
      
      const hasPermissions = requiredPermissions.every((perm: string) => validationPermissions.includes(perm));
      
      if (!hasPermissions) {
        const missingPermissions = requiredPermissions.filter((perm: string) => !validationPermissions.includes(perm));
        console.log('🔐 VALIDATION ENGINE 30: Missing permissions:', missingPermissions);
        console.log('🔐 VALIDATION ENGINE 30: Available permissions:', validationPermissions);
        return this.createFailureResult(packageId, operation, entityType, [`Missing permissions: ${missingPermissions.join(', ')}`], !!context.aggregatedData);
      }
      
      console.log('🔐 VALIDATION ENGINE 30: Permission validation passed');
      

      // THREAD 4: Enhanced Business Rule Validation
      console.log('📋 VALIDATION ENGINE 30: Starting enhanced business rule validation');
      const enrichedContext = { ...context, operation, entityType }; // Add operation and entityType to context for business rules
      
      // ENHANCEMENT: Add user context to data for business rule validation (userManagement package expects data.user)
      const businessRuleData = {
        ...assembledData,
        user: {
          id: context.userId,
          username: context.username,
          role: context.role,
          permissions: context.permissions,
          workflowPermissions: context.workflowPermissions
        },
        operation: operation
      };
      
      console.log('📋 VALIDATION ENGINE 30: Business rule data with user context:', JSON.stringify(businessRuleData, null, 2));
      console.log('📋 VALIDATION ENGINE 30: enrichedContext passed to validateBusinessRules:', JSON.stringify(enrichedContext, null, 2));
      const businessRuleResult = await pkg.validateBusinessRules(businessRuleData, enrichedContext);
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
        // PLAN 067: FALLBACK LOGIC ELIMINATION - All scheduler operations now use unified package routing
        /* COMMENTED OUT: Redundant fallback logic blocks - unified package handles all scheduler operations
        else if (false && entityType === 'scheduleBlock' && operation === 'create') {
          // HARDCODED OPERATIONS DISABLED - FALLS THROUGH TO PACKAGE-DRIVEN FALLBACK
          console.log('🚨 HARDCODED BYPASS DISABLED: scheduleBlock.create must use package-driven flow');
          throw new Error('TROUBLESHOOTING MODE: scheduleBlock.create disabled to force package-driven architecture');
        } else if (false && entityType === 'scheduleBlock' && operation === 'update') {
          // HARDCODED OPERATIONS DISABLED - FALLS THROUGH TO PACKAGE-DRIVEN FALLBACK
          console.log('🚨 HARDCODED BYPASS DISABLED: scheduleBlock.update must use package-driven flow');
          throw new Error('TROUBLESHOOTING MODE: scheduleBlock.update disabled to force package-driven architecture');
        } else if (false && entityType === 'weekSchedule' && operation === 'create') {
          // HARDCODED OPERATIONS DISABLED - FALLS THROUGH TO PACKAGE-DRIVEN FALLBACK
          console.log('🚨 HARDCODED BYPASS DISABLED: weekSchedule.create must use package-driven flow');
          throw new Error('TROUBLESHOOTING MODE: weekSchedule.create disabled to force package-driven architecture');
        } else if (false && entityType === 'weekSchedule' && operation === 'update') {
          // HARDCODED OPERATIONS DISABLED - FALLS THROUGH TO PACKAGE-DRIVEN FALLBACK
          console.log('🚨 HARDCODED BYPASS DISABLED: weekSchedule.update must use package-driven flow');
          throw new Error('TROUBLESHOOTING MODE: weekSchedule.update disabled to force package-driven architecture');
        } else if (false && entityType === 'shift' && operation === 'create') {
          // HARDCODED OPERATIONS DISABLED - FALLS THROUGH TO PACKAGE-DRIVEN FALLBACK
          console.log('🚨 HARDCODED BYPASS DISABLED: shift.create must use package-driven flow');
          throw new Error('TROUBLESHOOTING MODE: shift.create disabled to force package-driven architecture');
        } else if (false && entityType === 'shift' && operation === 'update') {
          // HARDCODED OPERATIONS DISABLED - FALLS THROUGH TO PACKAGE-DRIVEN FALLBACK
          console.log('🚨 HARDCODED BYPASS DISABLED: shift.update must use package-driven flow');
          throw new Error('TROUBLESHOOTING MODE: shift.update disabled to force package-driven architecture');
        */
        /* PLAN 067: REMAINING FALLBACK BLOCKS COMMENTED OUT - unified package handles all operations
        else if (false && entityType === 'scheduleBlock' && operation === 'read') {
          // [Large block of disabled cascade deletion code - commented out]
        } else if (false && entityType === 'scheduleBlock' && operation === 'delete') {
          // [Large block of disabled cascade deletion code - commented out]  
        } else if (false && entityType === 'weekSchedule' && operation === 'read') {
          // [Disabled weekSchedule operations - commented out]
        } else if (false && entityType === 'weekSchedule' && operation === 'list') {
          // [Disabled weekSchedule operations - commented out]
        } else if (false && entityType === 'weekSchedule' && operation === 'delete') {
          // [Disabled weekSchedule operations - commented out]
        } else if (false && entityType === 'shift' && operation === 'read') {
          // [Disabled shift operations - commented out]
        } else if (false && entityType === 'shift' && operation === 'list') {
          // [Disabled shift operations - commented out]
        } else if (false && entityType === 'shift' && operation === 'delete') {
          // [Disabled shift operations - commented out]
        }
        */
        // Handle scheduler operations with package-driven execution
        else if (['scheduleBlock', 'weekSchedule', 'shift'].includes(entityType) && pkg.storageActions) {
          const operationMethod = `execute${operation.charAt(0).toUpperCase() + operation.slice(1)}`;
          console.log(`🎯 SCHEDULER PACKAGE-DRIVEN: ${entityType}.${operation} - calling ${operationMethod}`);
          console.log(`🎯 SCHEDULER PACKAGE-DRIVEN: pkg.storageActions exists:`, !!pkg.storageActions);
          console.log(`🎯 SCHEDULER PACKAGE-DRIVEN: method exists:`, !!pkg.storageActions[operationMethod]);
          
          // CRITICAL FIX: Include entityType in assembled data for unified package routing
          const enrichedAssembledData = { ...assembledData, entityType };
          console.log(`🎯 SCHEDULER PACKAGE-DRIVEN: enrichedAssembledData:`, JSON.stringify(enrichedAssembledData, null, 2));
          
          transactionResult = await pkg.storageActions[operationMethod](enrichedAssembledData, storage);
          console.log(`🎯 SCHEDULER PACKAGE-DRIVEN: ${operationMethod} completed, result:`, transactionResult);
        }
        // PACKAGE-DRIVEN FALLBACK: Execute package storageActions when hardcoded operations are disabled
        else if (pkg.storageActions) {
          const operationMethod = `execute${operation.charAt(0).toUpperCase() + operation.slice(1)}`;
          console.log(`📦 PACKAGE-DRIVEN: Checking for storageAction method: ${operationMethod}`);
          
          if (pkg.storageActions[operationMethod]) {
            console.log(`📦 PACKAGE-DRIVEN: Executing ${operationMethod} from package storageActions`);
            transactionResult = await pkg.storageActions[operationMethod](assembledData, storage);
            console.log(`📦 PACKAGE-DRIVEN: ${operationMethod} completed successfully`);
          } else {
            console.log(`📦 PACKAGE-DRIVEN: Method ${operationMethod} not found in storageActions`);
            throw new Error(`Package storageActions method '${operationMethod}' not implemented for ${entityType}`);
          }
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
        // Handle userManagement operations via generic CRUD (Plan 063)
        else if (entityType === 'userManagement') {
          console.log('👤 VALIDATION ENGINE 30: Using generic CRUD for user management');
          transactionResult = await this.executeGenericCrud('user', operation, assembledData);
        }
        // Handle userBulk operations via generic CRUD (Plan 063)
        else if (entityType === 'userBulk') {
          console.log('👥 VALIDATION ENGINE 30: Using generic CRUD for user bulk operations');
          // For bulk operations, we need special handling
          if (operation === 'delete' && assembledData.userIds?.length > 0) {
            const deleteResults = [];
            for (const userId of assembledData.userIds) {
              const result = await this.executeGenericCrud('user', 'delete', { id: userId });
              deleteResults.push(result);
            }
            transactionResult = { deletedUsers: deleteResults, count: deleteResults.length };
          } else if (operation === 'update' && assembledData.userIds?.length > 0) {
            const updateResults = [];
            for (const userId of assembledData.userIds) {
              const result = await this.executeGenericCrud('user', 'update', { 
                id: userId, 
                userData: assembledData.data 
              });
              updateResults.push(result);
            }
            transactionResult = { updatedUsers: updateResults, count: updateResults.length };
          } else {
            throw new Error(`Bulk operation ${operation} not implemented`);
          }
        }
        // Handle userSingle operations via generic CRUD (Plan 063)
        else if (entityType === 'userSingle') {
          console.log('👤 VALIDATION ENGINE 30: Using generic CRUD for single user operations');
          transactionResult = await this.executeGenericCrud('user', operation, assembledData);
        }
        // Handle userList operations - get all users
        else if (entityType === 'userList' && operation === 'read') {
          console.log('👥 VALIDATION ENGINE 30: Reading user list');
          const users = await storage.getUsers();
          console.log(`💾 Retrieved ${users.length} users for profile data`);
          transactionResult = { users };
        }
        // Handle scheduleBlock list operations - get all schedule blocks
        else if (entityType === 'scheduleBlock' && operation === 'list') {
          console.log('📅 VALIDATION ENGINE 30: Reading schedule blocks list');
          const scheduleBlocks = await storage.getScheduleBlocks();
          console.log(`💾 Retrieved ${scheduleBlocks.length} schedule blocks`);
          transactionResult = scheduleBlocks;
        }
        // Handle location list operations - get all locations  
        else if (entityType === 'location' && operation === 'list') {
          console.log('📍 VALIDATION ENGINE 30: Reading locations list');
          const locations = await storage.getLocations();
          console.log(`💾 Retrieved ${locations.length} locations`);
          transactionResult = locations;
        }
        // Handle email configuration operations
        else if (entityType === 'emailConfig' && operation === 'read') {
          console.log('📧 VALIDATION ENGINE 30: Reading email configuration');
          const { emailService } = await import('../../modules/email/services/EmailService.js');
          const config = emailService.getConfig();
          
          if (!config) {
            transactionResult = {
              host: 'smtp.office365.com',
              port: 587,
              secure: false,
              testMode: true
            };
          } else {
            transactionResult = {
              host: config.host,
              port: config.port,
              secure: config.secure,
              from: config.from,
              auth: {
                user: config.auth.user,
                // password omitted for security
              },
              testMode: true
            };
          }
          console.log('💾 Email config read completed');
        } else if (entityType === 'emailConfig' && (operation === 'create' || operation === 'update')) {
          console.log('📧 VALIDATION ENGINE 30: Updating email configuration');
          const { emailService } = await import('../../modules/email/services/EmailService.js');
          emailService.configure(assembledData);
          transactionResult = {
            saved: true,
            message: 'Email configuration updated successfully',
            config: assembledData
          };
          console.log('💾 Email config update completed');
        }
        // Handle email test operations  
        else if (entityType === 'emailTest' && (operation === 'create' || operation === 'send')) {
          console.log('📧 VALIDATION ENGINE 30: Testing email connection');
          const { emailService } = await import('../../modules/email/services/EmailService.js');
          const testResult = await emailService.testConnection();
          transactionResult = {
            success: testResult,
            testMode: true,
            message: testResult ? 'Test mode connection verified' : 'Connection failed'
          };
          console.log('💾 Email connection test completed');
        }
        // Handle sent emails operations
        else if (entityType === 'emailSent' && operation === 'read') {
          console.log('📧 VALIDATION ENGINE 30: Reading sent emails');
          const { emailService } = await import('../../modules/email/services/EmailService.js');
          const sentEmails = emailService.getSentEmails();
          transactionResult = sentEmails;
          console.log(`💾 Retrieved ${sentEmails.length} sent emails`);
        } else if (entityType === 'emailSent' && operation === 'delete') {
          console.log('📧 VALIDATION ENGINE 30: Clearing sent emails');
          const { emailService } = await import('../../modules/email/services/EmailService.js');
          emailService.clearSentEmails();
          transactionResult = {
            cleared: true,
            message: 'Test email history cleared successfully'
          };
          console.log('💾 Sent emails cleared');
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