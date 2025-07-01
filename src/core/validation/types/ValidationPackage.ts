import { z } from 'zod';

// Base operation types
export type ValidationOperation = 'CREATE' | 'UPDATE' | 'DELETE' | 'DUPLICATE';
export type EntityType = 'schedule' | 'user' | 'applicant' | 'location' | 'shift' | 'weekSchedule';

// Core validation package interface
export interface ValidationPackage {
  operation: ValidationOperation;
  entityType: EntityType;
  entityId?: number | null;
  data: Record<string, any>;
  context: OperationContext;
  metadata?: Record<string, any>;
}

// Operation context for validation
export interface OperationContext {
  userId: number;
  userRole: string;
  permissions: string[];
  locationAccess: number[];
  timestamp: Date;
  requestId?: string;
  sessionId?: string;
}

// Validation package schemas
export const operationContextSchema = z.object({
  userId: z.number().min(1),
  userRole: z.string().min(1),
  permissions: z.array(z.string()),
  locationAccess: z.array(z.number()),
  timestamp: z.date(),
  requestId: z.string().optional(),
  sessionId: z.string().optional()
});

export const validationPackageSchema = z.object({
  operation: z.enum(['CREATE', 'UPDATE', 'DELETE', 'DUPLICATE']),
  entityType: z.enum(['schedule', 'user', 'applicant', 'location', 'shift', 'weekSchedule']),
  entityId: z.number().nullable().optional(),
  data: z.record(z.any()),
  context: operationContextSchema,
  metadata: z.record(z.any()).optional()
});

// Package validation result types
export interface ValidationPackageResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  processedData?: Record<string, any>;
  metadata: {
    validationTime: number;
    rulesApplied: string[];
    packageId: string;
  };
}

export interface ValidationError {
  field?: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  context?: Record<string, any>;
}

export interface ValidationWarning {
  field?: string;
  code: string;
  message: string;
  suggestion?: string;
}

// Entity-specific package types
export interface ScheduleValidationPackage extends ValidationPackage {
  entityType: 'schedule';
  data: {
    scheduleBlock?: {
      id?: number;
      name: string;
      description?: string;
      locationId: number;
      isActive: boolean;
    };
    weekSchedules?: Array<{
      id?: number;
      scheduleBlockId?: number;
      weekNumber: number;
      templateId?: number;
    }>;
    shifts?: Array<{
      id?: number;
      weekScheduleId?: number;
      title: string;
      position?: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      maxSlots: number;
      subscriptionDeadline?: string;
    }>;
  };
}

export interface UserValidationPackage extends ValidationPackage {
  entityType: 'user' | 'applicant';
  data: {
    profile?: {
      id?: number;
      username?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      role?: string;
    };
    locations?: number[];
    competencies?: string[];
    workflowPermissions?: Record<string, string[]>;
  };
}

export interface LocationValidationPackage extends ValidationPackage {
  entityType: 'location';
  data: {
    id?: number;
    name: string;
    address?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    status?: string;
    settings?: Record<string, any>;
  };
}