export type EntityType = 'schedule' | 'user' | 'location';
export type OperationType = 'create' | 'update' | 'delete' | 'read';

export interface OperationContext {
  userId: number;
  userRole: string;
  permissions: string[];
  locationAccess: number[];
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface ValidationPackage {
  operation: OperationType;
  entityType: EntityType;
  entityId?: number | null;
  data: any;
  context: OperationContext;
  metadata?: {
    packageId?: string;
    assemblyTime?: number;
  };
}

export interface ValidationError {
  field?: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'critical';
  context?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  metadata?: {
    validationTime?: number;
    rulesApplied?: string[];
    packageId?: string;
  };
}

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
  warnings: ValidationError[];
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