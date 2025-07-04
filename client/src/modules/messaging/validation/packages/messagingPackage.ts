import { z } from 'zod';
import { VE30PackageBuilder, type VE30Package } from '@shared/validation/VE30PackageBuilder';

/**
 * Messaging Validation Package - VE30PackageBuilder Standard
 * Converted from function-based implementation to VE30PackageBuilder configuration
 * Handles ownership + role + workflow + location permission web
 */

// Note schemas matching existing MessagingSystem patterns
export const createNoteSchema = z.object({
  content: z.string().min(1, 'Content required'),
  workflow: z.enum(['application', 'crew', 'location', 'scheduling', 'knowledge', 'statistics']).default('application'),
  messageType: z.enum(['text', 'rich-text', 'system', 'notification']).default('rich-text'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  isPrivate: z.boolean().default(false),
  targetUserId: z.number().optional(), // For direct messages
  targetLocationId: z.number().optional() // For location-specific messages
});

export const updateNoteSchema = z.object({
  id: z.number(),
  content: z.string().min(1, 'Content required'),
  messageType: z.enum(['text', 'rich-text', 'system', 'notification']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  isPrivate: z.boolean().optional()
});

// Business rules for messaging operations
const messagingBusinessRules = [
  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Content validation
    if (!data.content || data.content.trim().length === 0) {
      errors.push('Message content is required');
    } else if (data.content.length > 5000) {
      warnings.push('Message content is quite long - consider breaking into multiple messages');
    }

    // Workflow validation
    const validWorkflows = ['application', 'crew', 'location', 'scheduling', 'knowledge', 'statistics'];
    if (data.workflow && !validWorkflows.includes(data.workflow)) {
      errors.push(`Invalid workflow: ${data.workflow}`);
    }

    return { warnings, errors };
  },

  (data: any, context: any) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!context?.user) {
      errors.push('User context required for messaging operations');
      return { warnings, errors };
    }

    const { operation, user: contextUser, userLocations = [] } = context;
    const { id: userId, role: userRole } = contextUser;

    // Permission web validation based on operation
    switch (operation) {
      case 'create':
        // Workflow-based creation permissions
        if (data.workflow === 'application') {
          if (!['applicant', 'recruiter', 'app_manager', 'owner', 'administrator'].includes(userRole)) {
            errors.push('Insufficient role for application workflow messaging');
          }
        }

        // Location-specific messaging permissions
        if (data.targetLocationId) {
          const hasLocationAccess = userLocations.some((loc: any) => 
            loc.locationId === data.targetLocationId
          ) || userRole === 'administrator' || userRole === 'owner';
          
          if (!hasLocationAccess) {
            errors.push('No access to target location for messaging');
          }
        }
        break;

      case 'read':
        // Permission web: ownership + role + workflow + location
        if (!userId) {
          errors.push('Authentication required to read messages');
          break;
        }

        // Owner can always read their own messages
        if (data.ownerId === userId) {
          break; // Always allowed
        }

        // Workflow-based read permissions
        if (data.workflow === 'application') {
          if (!['recruiter', 'app_manager', 'owner', 'administrator'].includes(userRole) && 
              data.ownerId !== userId) {
            errors.push('Insufficient permissions to read application messages');
          }
        }

        // Location-based read permissions
        if (data.locationId) {
          const hasLocationAccess = userLocations.some((loc: any) => 
            loc.locationId === data.locationId
          ) || userRole === 'administrator' || userRole === 'owner';
          
          if (!hasLocationAccess) {
            errors.push('No access to location-specific messages');
          }
        }
        break;

      case 'update':
        // Only owner can edit, plus admin override
        if (data.ownerId !== userId && !['administrator', 'owner'].includes(userRole)) {
          errors.push('Only message owner can edit messages');
        }
        break;

      case 'delete':
        // Owner can delete, admin can delete, but respect system constraints
        if (data.ownerId !== userId && !['administrator'].includes(userRole)) {
          errors.push('Only message owner or administrator can delete messages');
        }

        // Additional constraint: don't allow non-admin deletion if owner still in system
        if (userRole === 'owner' && data.ownerStillActive && data.ownerId !== userId) {
          errors.push('Cannot delete messages while original owner is still active');
        }
        break;

      default:
        errors.push(`Unknown messaging operation: ${operation}`);
    }

    return { warnings, errors };
  }
];

// Custom assembly function for messaging
const messagingAssembly = (rawData: any, user: any, operation: string) => {
  const baseData = {
    content: rawData.content?.trim(),
    workflow: rawData.workflow || 'application',
    messageType: rawData.messageType || 'rich-text',
    priority: rawData.priority || 'normal',
    isPrivate: Boolean(rawData.isPrivate),
    targetUserId: rawData.targetUserId ? parseInt(rawData.targetUserId) : null,
    targetLocationId: rawData.targetLocationId ? parseInt(rawData.targetLocationId) : null,
    ownerId: user?.id || rawData.ownerId
  };

  // Include ID for update/delete operations
  if ((operation === 'update' || operation === 'delete') && rawData.id) {
    return { ...baseData, id: rawData.id };
  }

  return baseData;
};

// VE30PackageBuilder-based package (STANDARDIZED from working function-based)
export const messagingPackage: VE30Package = {
  entityType: 'messaging',
  validateSchema: (data: any, operation: string) => {
    // Use appropriate schema based on operation
    const schema = operation === 'update' ? updateNoteSchema : createNoteSchema;
    return VE30PackageBuilder.validateSchema(data, operation, schema);
  },
  getRequiredPermissions: (operation: string) => VE30PackageBuilder.getRequiredPermissions(operation, 'messaging'),
  validateBusinessRules: (data: any, context: any) => VE30PackageBuilder.validateBusinessRules(data, context, messagingBusinessRules),
  assemblePackage: (data: any, user: any, operation: string) => VE30PackageBuilder.assemblePackage(data, user, operation, messagingAssembly)
};

export type MessagingPackage = typeof messagingPackage;