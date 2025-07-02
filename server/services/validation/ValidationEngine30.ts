import { v4 as uuidv4 } from 'uuid';
import { storage } from '../../storage';
import { dataAggregationEngine, DataAggregationTask, AggregatedUserData } from './DataAggregationEngine';
import type { User } from '@shared/schema';

/**
 * ValidationEngine 3.0 - Enhanced validation with pre-aggregated data support
 * Based on 048_REVISED plan Sequential Architecture Flow:
 * Request → DataAggregationEngine → ValidationEngine30 → Response
 * 
 * Phase 2: VALIDATION (Enhanced)
 * ├─ Receive pre-aggregated data
 * ├─ Apply business rules validation
 * ├─ Check permissions from aggregated context
 * └─ Prepare transaction data
 */

export interface ValidationContext {
  userId: number;
  userRole: string;
  aggregatedData?: AggregatedUserData;
  permissions?: string[];
  workflowPermissions?: Record<string, any>;
  locationAccess?: number[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  enhancedData?: any;
  transactionData?: any;
  context: ValidationContext;
}

export interface ValidationRequest {
  operation: 'create' | 'read' | 'update' | 'delete';
  entityType: string;
  data: any;
  entityId?: number | null;
  useAggregation?: boolean; // Enable dual-use: direct or aggregated validation
}

export class ValidationEngine30 {
  
  /**
   * Main validation entry point - supports dual-use patterns
   * Direct validation: useAggregation = false (fast, no data compilation)
   * Aggregated validation: useAggregation = true (comprehensive, with user context)
   */
  async validateAndExecute(
    request: ValidationRequest,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const packageId = uuidv4();
    const startTime = Date.now();
    
    console.log(`🎯 VALIDATION ENGINE 3.0: Starting ${request.operation} for ${request.entityType}`, { 
      packageId, 
      useAggregation: request.useAggregation 
    });

    try {
      // Phase 1: Data Preparation (Direct or Aggregated)
      let enhancedContext = context;
      
      if (request.useAggregation) {
        enhancedContext = await this.prepareAggregatedContext(context, request.entityType);
        console.log(`📊 DATA AGGREGATION: Enhanced context prepared for user ${context.userId}`);
      } else {
        console.log(`⚡ DIRECT VALIDATION: Using provided context for user ${context.userId}`);
      }

      // Phase 2: Business Rules Validation
      const businessValidation = await this.validateBusinessRules(request, enhancedContext);
      if (!businessValidation.isValid) {
        return {
          isValid: false,
          errors: businessValidation.errors,
          warnings: [],
          context: enhancedContext
        };
      }

      // Phase 3: Permission Validation
      const permissionValidation = await this.validatePermissions(request, enhancedContext);
      if (!permissionValidation.isValid) {
        return {
          isValid: false,
          errors: permissionValidation.errors,
          warnings: businessValidation.warnings,
          context: enhancedContext
        };
      }

      // Phase 4: Schema Validation (if data provided)
      let schemaValidation = { isValid: true, errors: [], enhancedData: request.data };
      if (request.data) {
        schemaValidation = await this.validateSchema(request, enhancedContext);
        if (!schemaValidation.isValid) {
          return {
            isValid: false,
            errors: schemaValidation.errors,
            warnings: [...businessValidation.warnings, ...permissionValidation.warnings],
            context: enhancedContext
          };
        }
      }

      // Phase 5: Prepare Transaction Data
      const transactionData = await this.prepareTransactionData(request, enhancedContext, schemaValidation.enhancedData);

      const duration = Date.now() - startTime;
      console.log(`✅ VALIDATION ENGINE 3.0: Validation successful for ${request.entityType} (${duration}ms)`);

      return {
        isValid: true,
        errors: [],
        warnings: [...businessValidation.warnings, ...permissionValidation.warnings],
        enhancedData: schemaValidation.enhancedData,
        transactionData,
        context: enhancedContext
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ VALIDATION ENGINE 3.0: Error during validation (${duration}ms):`, error);
      
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: [],
        context: enhancedContext || context
      };
    }
  }

  /**
   * Prepare aggregated context using DataAggregationEngine
   * Phase 1: DATA AGGREGATION implementation
   */
  private async prepareAggregatedContext(
    context: ValidationContext, 
    entityType: string
  ): Promise<ValidationContext> {
    try {
      // Create aggregation task for user context
      const aggregationTask: DataAggregationTask = {
        entityType: 'user',
        entityId: context.userId,
        requiredData: {
          postgresql: ['user', 'permissions', 'locations'],
          mongodb: ['notes'],
          redis: ['cache-keys']
        },
        compilationRules: {
          enhance: true,
          permissions: true,
          metadata: true
        },
        cacheStrategy: {
          category: 'validation-context',
          ttl: 600, // 10 minutes for validation context
          connectionId: `validation-${context.userId}-${entityType}`
        }
      };

      // Use existing DataAggregationEngine
      const aggregatedData = await dataAggregationEngine.aggregate<AggregatedUserData>(aggregationTask);
      
      if (!aggregatedData) {
        console.warn(`⚠️ AGGREGATION WARNING: No data found for user ${context.userId}, using basic context`);
        return context;
      }

      // Enhanced context with aggregated data
      return {
        ...context,
        aggregatedData,
        permissions: aggregatedData.aggregatedPermissions?.rolePermissions || [],
        workflowPermissions: aggregatedData.aggregatedPermissions?.workflowPermissions || {},
        locationAccess: aggregatedData.aggregatedLocations?.map(loc => loc.id) || []
      };

    } catch (error) {
      console.error('📊 DATA AGGREGATION ERROR:', error);
      // Fallback to basic context if aggregation fails
      return context;
    }
  }

  /**
   * Validate business rules based on entity type and operation
   */
  private async validateBusinessRules(
    request: ValidationRequest, 
    context: ValidationContext
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Entity-specific business rules
    switch (request.entityType) {
      case 'user':
        await this.validateUserBusinessRules(request, context, errors, warnings);
        break;
      case 'schedule':
      case 'scheduleBlock':
        await this.validateScheduleBusinessRules(request, context, errors, warnings);
        break;
      case 'shift':
        await this.validateShiftBusinessRules(request, context, errors, warnings);
        break;
      default:
        // Generic business rules
        await this.validateGenericBusinessRules(request, context, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate permissions using aggregated context or basic role check
   */
  private async validatePermissions(
    request: ValidationRequest, 
    context: ValidationContext
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Use aggregated permissions if available, otherwise fallback to role-based
    const userPermissions = context.permissions || this.getRoleBasedPermissions(context.userRole);
    
    // Operation-specific permission requirements
    const requiredPermission = this.getRequiredPermission(request.operation, request.entityType);
    
    if (!userPermissions.includes(requiredPermission)) {
      errors.push(`Insufficient permissions: Required '${requiredPermission}' for ${request.operation} on ${request.entityType}`);
    }

    // Location-based access control (if applicable)
    if (request.data?.locationId && context.locationAccess) {
      if (!context.locationAccess.includes(request.data.locationId)) {
        errors.push(`No access to location ${request.data.locationId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate schema using appropriate validation logic
   */
  private async validateSchema(
    request: ValidationRequest, 
    context: ValidationContext
  ): Promise<{ isValid: boolean; errors: string[]; enhancedData: any }> {
    // For now, basic schema validation
    // Future: Integrate with existing validation packages from ValidationEngine.ts
    const errors: string[] = [];
    let enhancedData = request.data;

    // Basic required fields validation
    if (request.operation === 'create' || request.operation === 'update') {
      if (!request.data) {
        errors.push('Data is required for create/update operations');
      }
    }

    // Entity-specific schema validation would go here
    // Future enhancement: Use Zod schemas or existing validation packages

    return {
      isValid: errors.length === 0,
      errors,
      enhancedData
    };
  }

  /**
   * Prepare transaction data for database operations
   */
  private async prepareTransactionData(
    request: ValidationRequest, 
    context: ValidationContext, 
    validatedData: any
  ): Promise<any> {
    // Prepare data for storage layer operations
    const transactionData = {
      operation: request.operation,
      entityType: request.entityType,
      entityId: request.entityId,
      data: validatedData,
      userId: context.userId,
      timestamp: new Date().toISOString()
    };

    // Add audit fields if needed
    if (request.operation === 'create') {
      transactionData.data.createdBy = context.userId;
      transactionData.data.createdAt = new Date();
    } else if (request.operation === 'update') {
      transactionData.data.updatedBy = context.userId;
      transactionData.data.updatedAt = new Date();
    }

    return transactionData;
  }

  // Business Rules Implementations
  private async validateUserBusinessRules(
    request: ValidationRequest, 
    context: ValidationContext, 
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    // User-specific business rules
    if (request.operation === 'create' && request.data?.role === 'administrator') {
      if (context.userRole !== 'owner' && context.userRole !== 'administrator') {
        errors.push('Only owners and administrators can create administrator accounts');
      }
    }
  }

  private async validateScheduleBusinessRules(
    request: ValidationRequest, 
    context: ValidationContext, 
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    // Schedule-specific business rules
    if (request.operation === 'create' && !context.permissions?.includes('schedule.create')) {
      errors.push('Schedule creation requires schedule.create permission');
    }
  }

  private async validateShiftBusinessRules(
    request: ValidationRequest, 
    context: ValidationContext, 
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    // Shift-specific business rules
    if (request.data?.startTime && request.data?.endTime) {
      const start = new Date(request.data.startTime);
      const end = new Date(request.data.endTime);
      
      if (start >= end) {
        errors.push('Shift start time must be before end time');
      }
      
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
      if (duration > 16) {
        warnings.push('Shift duration exceeds 16 hours');
      }
    }
  }

  private async validateGenericBusinessRules(
    request: ValidationRequest, 
    context: ValidationContext, 
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    // Generic business rules for unknown entity types
    if (request.operation === 'delete' && !context.permissions?.includes('delete')) {
      errors.push('Delete operations require delete permission');
    }
  }

  // Helper methods
  private getRoleBasedPermissions(userRole: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'administrator': ['view', 'create', 'edit', 'delete', 'schedule', 'manage', 'admin', 'schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete'],
      'owner': ['view', 'create', 'edit', 'delete', 'schedule', 'manage', 'schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete'],
      'app_manager': ['view', 'create', 'edit', 'schedule', 'manage', 'schedule.read', 'schedule.update'],
      'crew_chief': ['view', 'create', 'edit', 'schedule', 'schedule.read'],
      'crew_member': ['view', 'manage', 'schedule.read'],
      'applicant': ['view']
    };
    
    return rolePermissions[userRole] || ['view'];
  }

  private getRequiredPermission(operation: string, entityType: string): string {
    const permissionMap: Record<string, Record<string, string>> = {
      'create': {
        'user': 'create',
        'schedule': 'schedule.create',
        'scheduleBlock': 'schedule.create',
        'shift': 'schedule.create'
      },
      'read': {
        'user': 'view',
        'schedule': 'schedule.read',
        'scheduleBlock': 'schedule.read',
        'shift': 'schedule.read'
      },
      'update': {
        'user': 'edit',
        'schedule': 'schedule.update',
        'scheduleBlock': 'schedule.update',
        'shift': 'schedule.update'
      },
      'delete': {
        'user': 'delete',
        'schedule': 'schedule.delete',
        'scheduleBlock': 'schedule.delete',
        'shift': 'schedule.delete'
      }
    };

    return permissionMap[operation]?.[entityType] || 'view';
  }
}

// Export singleton instance
export const validationEngine30 = new ValidationEngine30();