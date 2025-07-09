//ATTENTION! VE30PackageBuilder.ts uses centralized server/services/validation/validation-perm-mapping.ts

/**
 * VE30PackageBuilder - ValidationEngine 3.0 Package Builder Standard
 * 
 * Single source of truth for all validation package logic.
 * Eliminates code duplication across validation packages by providing
 * standardized implementations of the 4 required ValidationEngine30 functions.
 * 
 * Created: July 03, 2025
 * Standard: ValidationEngine v3.0 and above package standard
 */

import { z, ZodSchema, ZodError } from 'zod';


export interface VE30Package {
  entityType: string;
  validateSchema: (data: any, operation: string) => { isValid: boolean; errors: string[] };
  getRequiredPermissions: (operation: string) => string[];
  validateBusinessRules: (data: any, context: any) => Promise<{ isValid: boolean; errors: string[]; warnings?: string[] }>;
  assemblePackage: (data: any, user: any, operation: string) => Promise<any>;
}

export interface VE30PackageConfig {
  entityType: string;
  schema: z.ZodSchema<any>;
  permissionMap: Record<string, string[]>;
  businessRules: Array<(data: any, context?: any) => { warnings: string[]; errors: string[] }>;
  customAssembly?: (data: any, user: any, operation: string) => any;
}

export class VE30PackageBuilder {
  /**
   * Standard schema validation logic
   * Handles Zod schema validation with operation-specific rules
   */
  static validateSchema(data: any, operation: string, customSchema: ZodSchema<any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Validate data against schema
      const result = customSchema.safeParse(data);
      if (!result.success) {
        // For creation operations, filter out missing field errors for auto-assigned fields
        const filteredErrors = operation === 'create' ? 
          result.error.errors.filter(e => !['id', 'createdAt', 'updatedAt'].includes(e.path[0] as string)) :
          result.error.errors;
        
        errors.push(...filteredErrors.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`));
      }
    } catch (error) {
      errors.push(`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Standard permission mapping logic
   * Maps operations to required permissions with entity-specific customization
   */
  static getRequiredPermissions(operation: string, entityType: string, customPermissionMap?: Record<string, string[]>): string[] {
    // Use custom permission map if provided
    if (customPermissionMap && customPermissionMap[operation]) {
      return customPermissionMap[operation];
    }

    // Standard permission patterns based on entity type and operation
    let basePermissions: string[] = [];
    let operationPermission: string = '';

    // Entity-specific permission mapping
    switch (entityType) {
      case 'scheduleBlock':
      case 'weekSchedule':
      case 'shift':
        basePermissions = ['schedule.read'];
        operationPermission = `schedule.${operation}`;
        break;
      case 'motivationNote':
      case 'userProfile':
        basePermissions = ['user.read'];
        operationPermission = `user.${operation}`;
        break;
      case 'messaging':
        basePermissions = ['message.read'];
        operationPermission = `message.${operation}`;
        break;
      default:
        basePermissions = ['schedule.read'];
        operationPermission = `schedule.${operation}`;
        console.warn(`Unknown entity type '${entityType}', using default schedule permissions`);
    }
    
    switch (operation) {
      case 'create':
      case 'update':
      case 'delete':
        return [...basePermissions, operationPermission];
      case 'read':
        return basePermissions;
      default:
        console.warn(`Unknown operation '${operation}' for entity '${entityType}', returning base permissions`);
        return basePermissions;
    }
  }

  /**
   * Standard business rule execution engine
   * Processes arrays of validation functions and aggregates results
   */
  static async validateBusinessRules(
    data: any, 
    context: any, 
    customRules: Array<(data: any, context?: any) => { warnings: string[]; errors: string[] }>
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const aggregatedErrors: string[] = [];
    const aggregatedWarnings: string[] = [];

    try {
      // Execute all business rules
      for (const rule of customRules) {
        try {
          const result = rule(data, context);
          aggregatedErrors.push(...result.errors);
          aggregatedWarnings.push(...result.warnings);
        } catch (error) {
          aggregatedErrors.push(`Business rule execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      aggregatedErrors.push(`Business rule validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: aggregatedErrors.length === 0,
      errors: aggregatedErrors,
      warnings: aggregatedWarnings
    };
  }

  /**
   * Standard data assembly with server-side field injection
   * Handles user context, operation metadata, and data transformation
   */
  static async assemblePackage(
    data: any, 
    user: any, 
    operation: string, 
    customAssembly?: (data: any, user: any, operation: string) => any
  ): Promise<any> {
    try {
      // Apply custom assembly logic if provided
      let assembledData = customAssembly ? customAssembly(data, user, operation) : data;

      // Standard server-side field injection
      const standardFields: any = {
        operation,
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      // Add user context for operations that require it
      if (user) {
        standardFields.userId = user.id;
        standardFields.userRole = user.role;
      }

      // For creation operations, add creation metadata
      if (operation === 'create') {
        standardFields.createdBy = user?.id;
        standardFields.createdAt = new Date();
      }

      // For update operations, add update metadata
      if (operation === 'update') {
        standardFields.updatedBy = user?.id;
        standardFields.updatedAt = new Date();
      }

      return {
        ...assembledData,
        metadata: standardFields
      };
    } catch (error) {
      throw new Error(`Package assembly error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a complete VE30Package from configuration
   * Simplifies package creation to configuration-based approach
   */
  static createPackage(config: VE30PackageConfig): VE30Package {
    return {
      entityType: config.entityType,
      
      validateSchema: (data: any, operation: string) => 
        VE30PackageBuilder.validateSchema(data, operation, config.schema),
      
      getRequiredPermissions: (operation: string) => 
        VE30PackageBuilder.getRequiredPermissions(operation, config.entityType, config.permissionMap),
      
      validateBusinessRules: (data: any, context: any) => 
        VE30PackageBuilder.validateBusinessRules(data, context, config.businessRules),
      
      assemblePackage: (data: any, user: any, operation: string) => 
        VE30PackageBuilder.assemblePackage(data, user, operation, config.customAssembly)
    };
  }
}

/**
 * Utility function for creating packages with minimal configuration
 * Provides sensible defaults for common patterns
 */
export function createVE30Package(
  entityType: string,
  schema: z.ZodSchema<any>,
  businessRules: Array<(data: any, context?: any) => { warnings: string[]; errors: string[] }> = [],
  customPermissionMap?: Record<string, string[]>,
  customAssembly?: (data: any, user: any, operation: string) => any
): VE30Package {
  const config: VE30PackageConfig = {
    entityType,
    schema,
    permissionMap: customPermissionMap || {},
    businessRules,
    customAssembly
  };

  return VE30PackageBuilder.createPackage(config);
}