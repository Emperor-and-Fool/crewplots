import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

// Lightweight auth profile validation schema - minimal fields for auth-context
const authProfileSchema = z.object({
  id: z.number(),
  username: z.string(),
  role: z.string(),
  workflowPermissions: z.record(z.any()).optional(),
  blockedPermissions: z.array(z.string()).optional()
});

// Minimal business rules for auth validation
const authProfileBusinessRules = [
  (data: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Basic auth validation
    if (!data.id) {
      errors.push('User ID is required for authentication');
      return { warnings, errors };
    }

    if (!data.username) {
      errors.push('Username is required for authentication');
      return { warnings, errors };
    }

    if (!data.role) {
      errors.push('User role is required for authentication');
      return { warnings, errors };
    }

    return { warnings, errors };
  }
];

// Lightweight assembly function for auth profiles - passport data only
const authProfileAssembly = (rawData: any, user: any, operation: string) => {
  return {
    id: rawData.id,
    username: rawData.username,
    role: rawData.role,
    workflowPermissions: rawData.workflowPermissions || {},
    blockedPermissions: rawData.blockedPermissions || [],
    // Include user context for validation
    user: user,
    targetUserId: rawData.id
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