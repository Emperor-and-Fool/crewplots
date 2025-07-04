import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

// User profile validation schema
const userProfileSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.string(),
  status: z.string().optional(),
  createdAt: z.date().optional(),
  locationId: z.number().optional()
});

// Business rules for user profile validation
const userProfileBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Role-based access validation
    if (!data.user) {
      errors.push('User context required for profile access');
      return { warnings, errors };
    }

    // Owner can view any profile (read-only)
    if (data.user.role === 'owner') {
      return { warnings, errors };
    }
    
    // Administrator can view any profile (read-only)
    if (data.user.role === 'administrator') {
      return { warnings, errors };
    }
    
    // Users can only view their own profile
    if (data.user.id !== data.targetUserId) {
      errors.push('Access denied: Users can only view their own profile');
    }

    return { warnings, errors };
  },

  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Data completeness validation
    if (!data.username) {
      errors.push('Username is required');
    }
    if (!data.email) {
      errors.push('Email is required');
    }

    return { warnings, errors };
  }
];

// Custom assembly function for user profiles
const userProfileAssembly = (rawData: any, user: any, operation: string) => {
  return {
    id: rawData.id,
    username: rawData.username,
    email: rawData.email,
    firstName: rawData.firstName,
    lastName: rawData.lastName,
    phoneNumber: rawData.phoneNumber,
    role: rawData.role,
    status: rawData.status,
    createdAt: rawData.createdAt,
    locationId: rawData.locationId,
    // Include user context for business rule validation
    user: user,
    targetUserId: rawData.targetUserId || rawData.id
  };
};

// VE30PackageBuilder-based package (CONVERTED from property-based)
export const userProfilePackage: VE30Package = {
  entityType: 'userProfile',
  validateSchema: (data: any, operation: string) => VE30PackageBuilder.validateSchema(data, operation, userProfileSchema),
  getRequiredPermissions: (operation: string) => VE30PackageBuilder.getRequiredPermissions(operation, 'userProfile'),
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, userProfileBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, userProfileAssembly)
};

export type UserProfilePackage = typeof userProfilePackage;