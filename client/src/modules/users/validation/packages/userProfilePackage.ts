import { z } from 'zod';

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

// Business rules for user profile access
export const userProfileBusinessRules = {
  validateProfileAccess: (data: any) => {
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

  validateDataCompleteness: (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!data.username) {
      errors.push('Username is required');
    }
    if (!data.email) {
      errors.push('Email is required');
    }

    return { warnings, errors };
  }
};

// ValidationEngine30 compatible package interface
interface ValidationPackage30 {
  packageType: string;
  schema: z.ZodSchema<any>;
  permissions: string[];
  businessRules: Array<(data: any) => { warnings: string[]; errors: string[]; }>;
  assembleData: (rawData: any) => any;
}

export const userProfilePackage: ValidationPackage30 = {
  packageType: 'userProfile',
  schema: userProfileSchema,
  // No database permissions required - using business rules only
  permissions: [],
  businessRules: [
    userProfileBusinessRules.validateProfileAccess,
    userProfileBusinessRules.validateDataCompleteness
  ],
  assembleData: (rawData: any) => {
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
      user: rawData.user,
      targetUserId: rawData.targetUserId || rawData.id
    };
  }
};

export type UserProfilePackage = typeof userProfilePackage;