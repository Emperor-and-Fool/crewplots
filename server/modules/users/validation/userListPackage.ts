/**
 * User List Validation Package
 * Migrated from services/validation/packages/ to modules/users/validation/
 * Handles validation for retrieving all users data
 */

import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

// Request schema for user list operations
export const userListRequestSchema = z.object({
  filters: z.object({
    role: z.string().optional(),
    status: z.string().optional(),
    locationId: z.number().optional(),
    searchTerm: z.string().optional()
  }).optional()
});

// Business rules for user list operations
const userListBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Authentication required
    if (!data.user) {
      errors.push('Authentication required for user list access');
      return { warnings, errors };
    }

    // Role-based access validation
    const allowedRoles = ['administrator', 'owner', 'app_manager', 'crew_chief'];
    if (!allowedRoles.includes(data.user.role)) {
      errors.push('Insufficient permissions for user list access');
    }

    return { warnings, errors };
  }
];

// Assembly function for user list requests
const userListAssembly = (rawData: any, user: any, operation: string) => {
  return {
    filters: rawData.filters || {},
    user: user,
    operation: operation
  };
};

// VE30PackageBuilder-based user list package
export const userListPackage: VE30Package = {
  entityType: 'userList',
  validateSchema: (data: any, operation: string) => VE30PackageBuilder.validateSchema(data, operation, userListRequestSchema),
  getRequiredPermissions: (operation: string) => {
    return ['user.read'];
  },
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, userListBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, userListAssembly)
};

export type UserListPackage = typeof userListPackage;