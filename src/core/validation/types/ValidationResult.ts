// Core validation error types - COPIED FROM WORKING PATTERNS
export interface ValidationError {
  field?: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'critical';
  context?: Record<string, any>;
}

export interface ValidationWarning {
  field?: string;
  code: string;
  message: string;
  suggestion?: string;
}

// Core validation result interface
export interface ValidationResult {
  isValid: boolean;
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  data?: any;
  metadata: ValidationMetadata;
}

// Validation metadata for tracking and debugging
export interface ValidationMetadata {
  validationTime: number; // ms
  rulesApplied: string[];
  packageId: string;
  engineVersion: string;
  timestamp: Date;
  performanceMetrics?: {
    assemblyTime: number;
    integrityTime: number;
    permissionTime: number;
    transactionTime: number;
  };
}

// Thread-specific result types
export interface AssemblyResult {
  success: boolean;
  data?: any;
  errors: ValidationError[];
  metadata: {
    fieldsProcessed: number;
    dataSize: number;
    assemblyTime: number;
  };
}

export interface IntegrityResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: {
    rulesChecked: string[];
    constraintsValidated: number;
    integrityTime: number;
  };
}

export interface PermissionResult {
  success: boolean;
  authorized: boolean;
  errors: ValidationError[];
  metadata: {
    permissionsChecked: string[];
    accessLevel: string;
    permissionTime: number;
  };
}

export interface TransactionResult {
  success: boolean;
  data?: any;
  errors: ValidationError[];
  metadata: {
    operationsExecuted: number;
    recordsAffected: number;
    transactionTime: number;
    rollbackRequired?: boolean;
  };
}

// Combined validation operation result
export interface ValidationOperationResult {
  packageId: string;
  operation: string;
  entityType: string;
  overall: ValidationResult;
  threads: {
    assembly: AssemblyResult;
    integrity: IntegrityResult;
    permission: PermissionResult;
    transaction: TransactionResult;
  };
}

// Error severity levels
export enum ValidationSeverity {
  INFO = 'info',
  WARNING = 'warning', 
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Error categories
export enum ValidationErrorCode {
  // Assembly errors
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  DATA_TYPE_MISMATCH = 'DATA_TYPE_MISMATCH',
  
  // Integrity errors
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  DATA_CONSISTENCY_ERROR = 'DATA_CONSISTENCY_ERROR',
  
  // Permission errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  LOCATION_ACCESS_DENIED = 'LOCATION_ACCESS_DENIED',
  ROLE_RESTRICTION_VIOLATION = 'ROLE_RESTRICTION_VIOLATION',
  
  // Transaction errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  TRANSACTION_ROLLBACK = 'TRANSACTION_ROLLBACK',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  
  // System errors
  PACKAGE_NOT_FOUND = 'PACKAGE_NOT_FOUND',
  VALIDATION_ENGINE_ERROR = 'VALIDATION_ENGINE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

// Helper functions for creating validation results
export class ValidationResultBuilder {
  static success(data?: any, metadata?: Partial<ValidationMetadata>): ValidationResult {
    return {
      isValid: true,
      success: true,
      errors: [],
      warnings: [],
      data,
      metadata: {
        validationTime: 0,
        rulesApplied: [],
        packageId: '',
        engineVersion: '1.0.0',
        timestamp: new Date(),
        ...metadata
      }
    };
  }

  static failure(errors: ValidationError[], metadata?: Partial<ValidationMetadata>): ValidationResult {
    return {
      isValid: false,
      success: false,
      errors,
      warnings: [],
      metadata: {
        validationTime: 0,
        rulesApplied: [],
        packageId: '',
        engineVersion: '1.0.0',
        timestamp: new Date(),
        ...metadata
      }
    };
  }

  static createError(
    code: ValidationErrorCode | string,
    message: string,
    field?: string,
    severity: 'error' | 'warning' | 'info' | 'critical' = 'error',
    context?: Record<string, any>
  ): ValidationError {
    return {
      field,
      code,
      message,
      severity,
      context
    };
  }

  static createWarning(
    code: string,
    message: string,
    field?: string,
    suggestion?: string
  ): ValidationWarning {
    return {
      field,
      code,
      message,
      suggestion
    };
  }
}