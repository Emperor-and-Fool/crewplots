import { v4 as uuidv4 } from 'uuid';
import { dataAggregationEngine, DataAggregationTask, AggregatedUserData } from './DataAggregationEngine';
import type { User } from '@shared/schema';

/**
 * ValidationEngine30 - Orchestrator for dual-use validation patterns
 * Based on Plan 050: Parallel Implementation with zero production risk
 * 
 * Purpose: Orchestrates validation workflows using existing DataAggregationEngine
 * Dependencies: Uses existing DataAggregationEngine (no modifications to production ValidationEngine)
 * Risk: ZERO - New file, no existing dependencies
 */

export interface ValidationContext {
  userId: number;
  userRole: string;
  aggregatedData?: AggregatedUserData;
  permissions?: string[];
  workflowPermissions?: Record<string, any>;
}

export interface ValidationRequest {
  operation: 'validate' | 'orchestrate';
  entityType: string;
  entityId?: number;
  data?: any;
  validationRules?: string[];
}

export interface ValidationResult {
  success: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
  metadata: {
    operation: string;
    duration: number;
    timestamp: string;
    useAggregation: boolean;
  };
}

export class ValidationEngine30 {
  
  /**
   * Main orchestrator method - handles dual-use patterns:
   * 1. Direct validation (operation: 'validate') - Fast, no aggregation
   * 2. Aggregate-then-validate (operation: 'orchestrate') - Comprehensive with user context
   */
  async execute(request: ValidationRequest, context: ValidationContext): Promise<ValidationResult> {
    const startTime = Date.now();
    const operationId = uuidv4();
    
    console.log(`🎯 VALIDATION ENGINE 30: Starting ${request.operation} for ${request.entityType}`, { operationId });

    try {
      if (request.operation === 'validate') {
        return await this.executeDirectValidation(request, context, startTime);
      } else if (request.operation === 'orchestrate') {
        return await this.executeAggregateValidation(request, context, startTime);
      } else {
        throw new Error(`Unsupported operation: ${request.operation}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ VALIDATION ENGINE 30: Error during ${request.operation}:`, error);
      
      return {
        success: false,
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: [],
        metadata: {
          operation: request.operation,
          duration,
          timestamp: new Date().toISOString(),
          useAggregation: request.operation === 'orchestrate'
        }
      };
    }
  }

  /**
   * Direct validation pattern - no aggregation, fast response
   */
  private async executeDirectValidation(
    request: ValidationRequest, 
    context: ValidationContext, 
    startTime: number
  ): Promise<ValidationResult> {
    console.log(`⚡ DIRECT VALIDATION: Processing ${request.entityType} for user ${context.userId}`);

    // Basic validation without data aggregation
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Basic permission check using role
    if (!this.hasBasicPermission(context.userRole, request.entityType)) {
      validationErrors.push(`Insufficient permissions for ${request.entityType}`);
    }

    // Basic data validation
    if (request.data) {
      const dataValidation = this.validateBasicData(request.data, request.entityType);
      validationErrors.push(...dataValidation.errors);
      validationWarnings.push(...dataValidation.warnings);
    }

    const duration = Date.now() - startTime;
    const isValid = validationErrors.length === 0;

    console.log(`✅ DIRECT VALIDATION: ${isValid ? 'Success' : 'Failed'} for ${request.entityType} (${duration}ms)`);

    return {
      success: true,
      isValid,
      errors: validationErrors,
      warnings: validationWarnings,
      data: request.data,
      metadata: {
        operation: 'validate',
        duration,
        timestamp: new Date().toISOString(),
        useAggregation: false
      }
    };
  }

  /**
   * Aggregate-then-validate pattern - comprehensive validation with user context
   */
  private async executeAggregateValidation(
    request: ValidationRequest, 
    context: ValidationContext, 
    startTime: number
  ): Promise<ValidationResult> {
    console.log(`📊 AGGREGATE VALIDATION: Processing ${request.entityType} for user ${context.userId}`);

    // Step 1: Aggregate user context using DataAggregationEngine
    const aggregatedContext = await this.aggregateUserContext(context, request.entityType);
    
    // Step 2: Enhanced validation with aggregated data
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Enhanced permission check using aggregated permissions
    const permissionValidation = this.validateAggregatedPermissions(
      aggregatedContext, 
      request.entityType, 
      request.operation
    );
    validationErrors.push(...permissionValidation.errors);
    validationWarnings.push(...permissionValidation.warnings);

    // Enhanced data validation with context
    if (request.data) {
      const dataValidation = this.validateAggregatedData(
        request.data, 
        request.entityType, 
        aggregatedContext
      );
      validationErrors.push(...dataValidation.errors);
      validationWarnings.push(...dataValidation.warnings);
    }

    const duration = Date.now() - startTime;
    const isValid = validationErrors.length === 0;

    console.log(`✅ AGGREGATE VALIDATION: ${isValid ? 'Success' : 'Failed'} for ${request.entityType} (${duration}ms)`);

    return {
      success: true,
      isValid,
      errors: validationErrors,
      warnings: validationWarnings,
      data: request.data,
      metadata: {
        operation: 'orchestrate',
        duration,
        timestamp: new Date().toISOString(),
        useAggregation: true
      }
    };
  }

  /**
   * Aggregate user context using existing DataAggregationEngine
   */
  private async aggregateUserContext(
    context: ValidationContext, 
    entityType: string
  ): Promise<ValidationContext> {
    try {
      // Create aggregation task for user context
      const aggregationTask: DataAggregationTask = {
        entityType: 'user',
        entityId: context.userId,
        requiredData: {
          postgresql: ['user', 'permissions'],
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
          ttl: 300, // 5 minutes for validation context
          connectionId: `validation-${context.userId}-${entityType}`
        }
      };

      // Use existing DataAggregationEngine
      const aggregatedData = await dataAggregationEngine.aggregate<AggregatedUserData>(aggregationTask);
      
      if (!aggregatedData) {
        console.warn(`⚠️ AGGREGATION: No data found for user ${context.userId}, using basic context`);
        return context;
      }

      // Return enhanced context
      return {
        ...context,
        aggregatedData,
        permissions: aggregatedData.aggregatedPermissions?.rolePermissions || [],
        workflowPermissions: aggregatedData.aggregatedPermissions?.workflowPermissions || {}
      };

    } catch (error) {
      console.error('📊 AGGREGATION ERROR:', error);
      // Fallback to basic context if aggregation fails
      return context;
    }
  }

  /**
   * Basic permission check for direct validation
   */
  private hasBasicPermission(userRole: string, entityType: string): boolean {
    const rolePermissions: Record<string, string[]> = {
      'administrator': ['user', 'schedule', 'shift', 'location'],
      'owner': ['user', 'schedule', 'shift', 'location'],
      'app_manager': ['user', 'schedule', 'shift'],
      'crew_chief': ['schedule', 'shift'],
      'crew_member': ['shift'],
      'applicant': []
    };

    return rolePermissions[userRole]?.includes(entityType) || false;
  }

  /**
   * Basic data validation for direct validation
   */
  private validateBasicData(data: any, entityType: string): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic required field validation
    switch (entityType) {
      case 'user':
        if (!data.username) errors.push('Username is required');
        if (!data.email) errors.push('Email is required');
        break;
      case 'schedule':
        if (!data.name) errors.push('Schedule name is required');
        break;
      case 'shift':
        if (!data.startTime) errors.push('Start time is required');
        if (!data.endTime) errors.push('End time is required');
        break;
    }

    return { errors, warnings };
  }

  /**
   * Enhanced permission validation using aggregated context
   */
  private validateAggregatedPermissions(
    context: ValidationContext, 
    entityType: string, 
    operation: string
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Use aggregated permissions if available
    const userPermissions = context.permissions || [];
    const workflowPermissions = context.workflowPermissions || {};

    // Check entity-specific permissions
    const requiredPermission = this.getRequiredPermission(entityType, operation);
    if (requiredPermission && !userPermissions.includes(requiredPermission)) {
      errors.push(`Missing required permission: ${requiredPermission}`);
    }

    // Check workflow permissions
    if (entityType === 'schedule' && !workflowPermissions.scheduling) {
      warnings.push('Limited scheduling permissions detected');
    }

    return { errors, warnings };
  }

  /**
   * Enhanced data validation using aggregated context
   */
  private validateAggregatedData(
    data: any, 
    entityType: string, 
    context: ValidationContext
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Enhanced validation using aggregated context
    if (entityType === 'shift' && data.startTime && data.endTime) {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      
      if (start >= end) {
        errors.push('Shift start time must be before end time');
      }
      
      // Use aggregated data for enhanced business rules
      if (context.aggregatedData) {
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (duration > 12) {
          warnings.push('Long shift duration detected - consider break requirements');
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Get required permission for entity and operation
   */
  private getRequiredPermission(entityType: string, operation: string): string | null {
    const permissionMap: Record<string, string> = {
      'user': 'manage',
      'schedule': 'schedule',
      'shift': 'schedule',
      'location': 'manage'
    };

    return permissionMap[entityType] || null;
  }
}

// Export singleton instance
export const validationEngine30 = new ValidationEngine30();