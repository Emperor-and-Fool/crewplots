/**
 * User Management Validation Package
 * Handles CRUD operations for individual users (create, update, delete)
 */

import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';
import { insertUserSchema } from '@shared/schema';

// Request schema for user management operations
export const userManagementRequestSchema = z.object({
  id: z.number().optional(), // For update/delete operations
  userData: insertUserSchema.partial().optional(), // For create/update operations
});

// Business rules for user management operations
const userManagementBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Authentication required
    if (!data.user) {
      errors.push('Authentication required for user management');
      return { warnings, errors };
    }

    // Role-based access validation
    const allowedRoles = ['administrator', 'owner', 'app_manager'];
    if (!allowedRoles.includes(data.user.role)) {
      errors.push('Insufficient permissions for user management');
      return { warnings, errors };
    }

    // Operation-specific validation
    if (data.operation === 'create') {
      if (!data.userData) {
        errors.push('User data required for create operation');
      }
      if (data.userData && !data.userData.email) {
        errors.push('Email is required for new users');
      }
      if (data.userData && !data.userData.username) {
        errors.push('Username is required for new users');
      }
    }

    if (data.operation === 'update' || data.operation === 'delete') {
      if (!data.id) {
        errors.push('User ID required for update/delete operations');
      }
      // Prevent self-deletion/demotion
      if (data.user.id === data.id && data.operation === 'delete') {
        errors.push('Cannot delete your own account');
      }
    }

    return { warnings, errors };
  }
];

// Assembly function for user management requests
const userManagementAssembly = (rawData: any, user: any, operation: string) => {
  return {
    id: rawData.id,
    userData: rawData.userData,
    user: user,
    operation: operation
  };
};

// VE30PackageBuilder-based user management package
export const userManagementPackage: VE30Package = {
  entityType: 'userManagement',
  validateSchema: (data: any, operation: string) => VE30PackageBuilder.validateSchema(data, operation, userManagementRequestSchema),
  getRequiredPermissions: (operation: string) => {
    switch (operation) {
      case 'create':
        return ['user.create'];
      case 'update':
        return ['user.update'];
      case 'delete':
        return ['user.delete'];
      default:
        return ['user.read'];
    }
  },
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, userManagementBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, userManagementAssembly)
};

export type UserManagementPackage = typeof userManagementPackage;