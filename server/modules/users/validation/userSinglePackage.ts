/**
 * User Single Fetch Validation Package
 * Handles fetching individual user by ID
 */

import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

// Request schema for single user fetch
export const userSingleRequestSchema = z.object({
  userId: z.number().positive('User ID must be positive'),
});

// Business rules for single user fetch
const userSingleBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Authentication required
    if (!data.user) {
      errors.push('Authentication required for user access');
      return { warnings, errors };
    }

    // Users can view their own profile, managers can view team members
    const isOwnProfile = data.user.id === data.userId;
    const hasManagerRole = ['administrator', 'owner', 'app_manager', 'crew_chief'].includes(data.user.role);
    
    if (!isOwnProfile && !hasManagerRole) {
      errors.push('Insufficient permissions to view this user profile');
    }

    return { warnings, errors };
  }
];

// Assembly function for single user requests
const userSingleAssembly = (rawData: any, user: any, operation: string) => {
  return {
    userId: rawData.userId,
    user: user,
    operation: operation
  };
};

// VE30PackageBuilder-based single user package
export const userSinglePackage: VE30Package = {
  entityType: 'userSingle',
  validateSchema: (data: any, operation: string) => VE30PackageBuilder.validateSchema(data, operation, userSingleRequestSchema),
  getRequiredPermissions: (operation: string) => {
    return ['user.read'];
  },
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, userSingleBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, userSingleAssembly)
};

export type UserSinglePackage = typeof userSinglePackage;