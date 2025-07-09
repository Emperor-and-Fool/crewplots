/**
 * User List Validation Package
 * Handles validation for retrieving all users data
 */

import { z } from 'zod';
import { User } from '@shared/schema';

// Request schema for user list operations
export const userListRequestSchema = z.object({
  operation: z.literal('userList'),
  filters: z.object({
    role: z.string().optional(),
    status: z.string().optional(),
    locationId: z.number().optional()
  }).optional()
});

// Response schema for user list operations
export const userListResponseSchema = z.array(z.object({
  id: z.number(),
  public_id: z.string(),
  username: z.string(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  name: z.string(),
  role: z.enum(['administrator', 'owner', 'app_manager', 'crew_chief', 'crew_member', 'applicant']),
  locationId: z.number().nullable(),
  phoneNumber: z.string().nullable(),
  status: z.string(),
  resumeUrl: z.string().nullable(),
  notes: z.string().nullable(),
  workflowPermissions: z.record(z.array(z.string())).nullable(),
  blockedPermissions: z.array(z.string()).nullable(),
  createdAt: z.string()
}));

export type UserListRequest = z.infer<typeof userListRequestSchema>;
export type UserListResponse = z.infer<typeof userListResponseSchema>;

export const userListPackage = {
  // Schema validation - matches ValidationEngine30 interface
  validateSchema: async (data: any, operation: 'create' | 'update' | 'delete' | 'read') => {
    try {
      if (operation === 'read') {
        const validatedData = userListRequestSchema.parse(data);
        return { isValid: true, errors: [], data: validatedData };
      }
      return { isValid: false, errors: ['Invalid operation for userList package'] };
    } catch (error: any) {
      return { isValid: false, errors: [error.message] };
    }
  },

  // Permission requirements - matches ValidationEngine30 interface
  getRequiredPermissions: (operation: 'create' | 'update' | 'delete' | 'read') => {
    return ['user.read'];
  },

  // Business rule validation - matches ValidationEngine30 interface
  validateBusinessRules: async (data: UserListRequest, context: any) => {
    const issues: string[] = [];

    // Validate operation
    if (data.operation !== 'userList') {
      issues.push('Invalid operation for user list package');
    }

    // Validate user has permission to read user data
    if (!context.userId) {
      issues.push('Authentication required for user list access');
    }

    return {
      isValid: issues.length === 0,
      errors: issues,
      warnings: []
    };
  },

  // Package assembly
  assemblePackage: (requestData: any) => {
    return {
      operation: 'userList',
      filters: requestData.filters || {}
    };
  }
};