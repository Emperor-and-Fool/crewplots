import { z } from 'zod';

// Operation context interface for validation requests
export interface OperationContext {
  userId: number;
  userRole: string;
  permissions: string[];
  locationAccess: number[];
  timestamp: Date;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Extended context for complex operations
export interface ExtendedOperationContext extends OperationContext {
  parentOperation?: {
    type: string;
    entityId: number;
    entityType: string;
  };
  transactionId?: string;
  batchOperation?: {
    batchId: string;
    itemIndex: number;
    totalItems: number;
  };
  auditTrail?: AuditTrailEntry[];
}

// Audit trail for tracking validation decisions
export interface AuditTrailEntry {
  timestamp: Date;
  action: string;
  result: 'success' | 'failure' | 'warning';
  details: string;
  threadId: string;
  ruleId?: string;
}

// Security context for permission validation
export interface SecurityContext {
  userId: number;
  userRole: string;
  effectivePermissions: string[];
  locationAccess: number[];
  workflowPermissions: Record<string, string[]>;
  blockedPermissions?: string[];
  sessionInfo: {
    sessionId: string;
    issuedAt: Date;
    expiresAt: Date;
    ipAddress: string;
  };
}

// Request metadata for validation tracking
export interface RequestMetadata {
  requestId: string;
  correlationId?: string;
  originService: string;
  requestPath: string;
  httpMethod: string;
  contentType?: string;
  userAgent?: string;
  referer?: string;
  timestamp: Date;
  processingStartTime: number;
}

// Validation context schemas
export const operationContextSchema = z.object({
  userId: z.number().min(1),
  userRole: z.string().min(1),
  permissions: z.array(z.string()),
  locationAccess: z.array(z.number()),
  timestamp: z.date(),
  requestId: z.string().optional(),
  sessionId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

export const securityContextSchema = z.object({
  userId: z.number().min(1),
  userRole: z.string().min(1),
  effectivePermissions: z.array(z.string()),
  locationAccess: z.array(z.number()),
  workflowPermissions: z.record(z.array(z.string())),
  blockedPermissions: z.array(z.string()).optional(),
  sessionInfo: z.object({
    sessionId: z.string(),
    issuedAt: z.date(),
    expiresAt: z.date(),
    ipAddress: z.string()
  })
});

export const requestMetadataSchema = z.object({
  requestId: z.string(),
  correlationId: z.string().optional(),
  originService: z.string(),
  requestPath: z.string(),
  httpMethod: z.string(),
  contentType: z.string().optional(),
  userAgent: z.string().optional(),
  referer: z.string().optional(),
  timestamp: z.date(),
  processingStartTime: z.number()
});

// Context builder utility
export class OperationContextBuilder {
  private context: Partial<OperationContext> = {};

  static fromUser(userId: number, userRole: string): OperationContextBuilder {
    const builder = new OperationContextBuilder();
    builder.context.userId = userId;
    builder.context.userRole = userRole;
    builder.context.timestamp = new Date();
    return builder;
  }

  withPermissions(permissions: string[]): OperationContextBuilder {
    this.context.permissions = permissions;
    return this;
  }

  withLocationAccess(locationIds: number[]): OperationContextBuilder {
    this.context.locationAccess = locationIds;
    return this;
  }

  withRequest(requestId: string, sessionId?: string): OperationContextBuilder {
    this.context.requestId = requestId;
    this.context.sessionId = sessionId;
    return this;
  }

  withClientInfo(ipAddress: string, userAgent: string): OperationContextBuilder {
    this.context.ipAddress = ipAddress;
    this.context.userAgent = userAgent;
    return this;
  }

  build(): OperationContext {
    if (!this.context.userId || !this.context.userRole) {
      throw new Error('OperationContext requires userId and userRole');
    }

    return {
      userId: this.context.userId,
      userRole: this.context.userRole,
      permissions: this.context.permissions || [],
      locationAccess: this.context.locationAccess || [],
      timestamp: this.context.timestamp || new Date(),
      requestId: this.context.requestId,
      sessionId: this.context.sessionId,
      ipAddress: this.context.ipAddress,
      userAgent: this.context.userAgent
    };
  }
}

// Context validation utilities
export class ContextValidator {
  static validateOperation(context: OperationContext): boolean {
    try {
      operationContextSchema.parse(context);
      return true;
    } catch {
      return false;
    }
  }

  static validateSecurity(context: SecurityContext): boolean {
    try {
      securityContextSchema.parse(context);
      return true;
    } catch {
      return false;
    }
  }

  static validateRequest(metadata: RequestMetadata): boolean {
    try {
      requestMetadataSchema.parse(metadata);
      return true;
    } catch {
      return false;
    }
  }
}