import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

// Auth profile INPUT validation schema - validates request parameters
const authProfileSchema = z.object({
  userId: z.string().min(1, "User ID is required")
});

// Minimal business rules for auth input validation
const authProfileBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate userId parameter format
    if (data.userId && typeof data.userId !== 'string') {
      errors.push('User ID must be a string');
    }

    if (data.userId && data.userId.trim().length === 0) {
      errors.push('User ID cannot be empty');
    }

    return { warnings, errors };
  }
];

// Assembly function for auth profile requests - converts input to storage query
const authProfileAssembly = (rawData: any, user: any, operation: string) => {
  return {
    // Convert userId input parameter to query parameter
    userId: rawData.userId,
    // Include requesting user context for validation
    requestingUser: user,
    operation: operation
  };
};

// VE30PackageBuilder-based lightweight auth package
export const authProfilePackage: VE30Package = {
  entityType: 'authProfile',
  validateSchema: (data: any, operation: string) => VE30PackageBuilder.validateSchema(data, operation, authProfileSchema),
  getRequiredPermissions: (operation: string) => {
    // Auth refresh requires no special permissions - just valid session
    return [];
  },
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, authProfileBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, authProfileAssembly)
};

export type AuthProfilePackage = typeof authProfilePackage;