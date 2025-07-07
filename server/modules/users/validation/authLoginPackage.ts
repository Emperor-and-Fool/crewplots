import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

// Auth login INPUT validation schema - accepts empty body for session validation
const authLoginSchema = z.object({
  // Empty object for session validation - no data required
}).optional().default({});

// Business rules for auth session validation
const authLoginBusinessRules = [
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Session validation requires existing authenticated session
    if (!context.session || !context.session.passport || !context.session.passport.user) {
      errors.push('No valid session found - authentication required');
    }

    return { warnings, errors };
  }
];

// Assembly function for auth login requests - extracts session data
const authLoginAssembly = (rawData: any, user: any, operation: string, context: any) => {
  return {
    // No input data required - session validation only
    sessionData: context.session?.passport?.user || null,
    requestingUser: user,
    operation: operation,
    sessionId: context.session?.id || null
  };
};

// VE30PackageBuilder-based auth login package for session validation
export const authLoginPackage: VE30Package = {
  entityType: 'authLogin',
  validateSchema: (data: any, operation: string) => VE30PackageBuilder.validateSchema(data, operation, authLoginSchema),
  getRequiredPermissions: (operation: string) => {
    // Session validation requires no special permissions - just valid session
    return [];
  },
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, authLoginBusinessRules),
  assemblePackage: (data: any, user: any, operation: string, context: any) => VE30PackageBuilder.assemblePackage(data, user, operation, authLoginAssembly, context)
};

export type AuthLoginPackage = typeof authLoginPackage;