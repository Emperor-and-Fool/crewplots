/**
 * User Bulk Operations Validation Package
 * Handles bulk operations on multiple users (bulk update, bulk delete, bulk role assignment)
 */

import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

// Request schema for bulk operations
export const userBulkRequestSchema = z.object({
  operation: z.enum(['bulk_update', 'bulk_delete', 'bulk_role_assignment']),
  userIds: z.array(z.number()).min(1, 'At least one user ID required'),
  data: z.object({
    role: z.string().optional(),
    status: z.string().optional(),
    locationId: z.number().optional(),
    // Add other bulk update fields as needed
  }).optional()
});

// Business rules for bulk operations
const userBulkBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Authentication required
    if (!data.user) {
      errors.push('Authentication required for bulk operations');
      return { warnings, errors };
    }

    // Role-based access validation - only high-level roles can perform bulk operations
    const allowedRoles = ['administrator', 'owner'];
    if (!allowedRoles.includes(data.user.role)) {
      errors.push('Insufficient permissions for bulk operations');
      return { warnings, errors };
    }

    // Validate user IDs array
    if (!Array.isArray(data.userIds) || data.userIds.length === 0) {
      errors.push('At least one user ID required for bulk operations');
    }

    // Prevent bulk operations on self
    if (data.userIds && data.userIds.includes(data.user.id)) {
      warnings.push('Bulk operation includes your own account - proceed with caution');
    }

    // Operation-specific validation
    if (data.operation === 'bulk_delete' && data.userIds && data.userIds.length > 10) {
      warnings.push('Deleting more than 10 users at once - please confirm this action');
    }

    if (data.operation === 'bulk_role_assignment' && !data.data?.role) {
      errors.push('Role must be specified for bulk role assignment');
    }

    return { warnings, errors };
  }
];

// Assembly function for bulk operations
const userBulkAssembly = (rawData: any, user: any, operation: string) => {
  return {
    operation: rawData.operation,
    userIds: rawData.userIds,
    data: rawData.data || {},
    user: user,
    requestOperation: operation
  };
};

// VE30PackageBuilder-based bulk operations package
export const userBulkPackage: VE30Package = {
  entityType: 'userBulk',
  validateSchema: (data: any, operation: string) => VE30PackageBuilder.validateSchema(data, operation, userBulkRequestSchema),
  getRequiredPermissions: (operation: string) => {
    return ['user.bulk_operations', 'user.update', 'user.delete'];
  },
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, userBulkBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, userBulkAssembly)
};

export type UserBulkPackage = typeof userBulkPackage;