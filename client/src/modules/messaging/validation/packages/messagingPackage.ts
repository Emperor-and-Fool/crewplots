// Messaging Validation Package for ValidationEngine v3
// Handles ownership + role + workflow + location permission web

import { z } from 'zod';

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

export const deleteNoteSchema = z.object({
  id: z.number()
});

export const readNotesSchema = z.object({
  userId: z.number().optional(),
  workflow: z.string().optional(),
  locationId: z.number().optional(),
  applicantId: z.number().optional() // For applicant portal read-only mode
});

// Permission validation function handling the permission web
export function validateMessagingPermissions(
  operation: string,
  data: any,
  context: any
): { isValid: boolean; errors: string[] } {
  const { user, aggregatedData } = context;
  const errors: string[] = [];

  // Extract user context from aggregated data
  const userLocations = aggregatedData?.userLocations || [];
  const userRole = user?.role || 'guest';
  const userId = user?.id;

  console.log('🔍 MESSAGING PERMISSIONS:', {
    operation,
    userId,
    userRole,
    userLocations: userLocations.length,
    workflow: data.workflow
  });

  switch (operation) {
    case 'create':
      // Everyone can create their own notes/messages
      if (!userId) {
        errors.push('Authentication required to create messages');
        break;
      }

      // Workflow-specific creation permissions
      if (data.workflow === 'application') {
        // Applicants can create motivation notes, recruiters can create recruiter notes
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
        // Recruiters can read applicant notes, applicants can read recruiter feedback
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
      } else {
        // No location assigned = public read access (user's fallback rule)
        console.log('📖 PUBLIC READ: No location restriction, allowing read access');
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

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Business rules for messaging operations
export function validateMessagingBusinessRules(
  operation: string,
  data: any,
  context: any
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Content length limits
  if (operation === 'create' || operation === 'update') {
    if (data.content && data.content.length > 10000) {
      errors.push('Message content exceeds maximum length (10,000 characters)');
    }
  }

  // Rich text validation for TipTap content
  if (data.messageType === 'rich-text' && data.content) {
    try {
      // Validate TipTap JSON structure if it looks like JSON
      if (data.content.trim().startsWith('{')) {
        JSON.parse(data.content);
      }
    } catch {
      errors.push('Invalid rich text format');
    }
  }

  // Priority validation for workflow context
  if (data.priority === 'urgent' && data.workflow !== 'application') {
    // Only allow urgent priority in application workflow for now
    errors.push('Urgent priority only allowed for application workflow');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Data interfaces
export interface MessagingData {
  id?: number;
  content: string;
  workflow?: string;
  messageType?: string;
  priority?: string;
  isPrivate?: boolean;
  targetUserId?: number;
  targetLocationId?: number;
  ownerId?: number;
  locationId?: number;
  ownerStillActive?: boolean;
}

// Messaging Package Interface matching ValidationEngine30 expectations
export interface MessagingPackage {
  entityType: 'messaging';
  
  // Schema validation - matches ValidationEngine30 signature
  validateSchema: (data: MessagingData, operation: 'create' | 'update' | 'delete' | 'read') => Promise<{
    isValid: boolean;
    errors: string[];
  }>;
  
  // Permission requirements
  getRequiredPermissions: (operation: string) => string[];
  
  // Business rule validation - matches ValidationEngine30 signature
  validateBusinessRules: (data: MessagingData, context: any) => Promise<{
    isValid: boolean;
    errors: string[];
    warnings?: string[];
  }>;
  
  // Package assembly (data preparation)
  assemblePackage: (data: MessagingData, operation: string) => MessagingData;
}

// Implementation of messaging package - matching ValidationEngine30 async expectations
export const messagingPackage: MessagingPackage = {
  entityType: 'messaging',
  
  validateSchema: async (data: MessagingData, operation: 'create' | 'update' | 'delete' | 'read') => {
    try {
      let schema;
      
      switch (operation) {
        case 'create':
          schema = createNoteSchema;
          break;
        case 'update':
          schema = updateNoteSchema;
          break;
        case 'delete':
          schema = deleteNoteSchema;
          break;
        case 'read':
          schema = readNotesSchema;
          break;
        default:
          return { 
            isValid: false, 
            errors: [`Unknown operation: ${operation}`] 
          };
      }
      
      const result = schema.safeParse(data);
      if (result.success) {
        return { isValid: true, errors: [] };
      } else {
        return { 
          isValid: false, 
          errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`) 
        };
      }
    } catch (error) {
      return { 
        isValid: false, 
        errors: [`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  },
  
  getRequiredPermissions: (operation: string) => {
    // Use same permission pattern as scheduler packages
    switch (operation) {
      case 'create':
        return ['schedule.create']; // Reuse existing database permission
      case 'read':
        return ['schedule.read'];   // Reuse existing database permission
      case 'update':
        return ['schedule.update']; // Reuse existing database permission
      case 'delete':
        return ['schedule.delete']; // Reuse existing database permission
      default:
        return [];
    }
  },
  
  validateBusinessRules: async (data: MessagingData, context: any) => {
    try {
      const result = validateMessagingBusinessRules('create', data, context);
      return {
        isValid: result.isValid,
        errors: result.errors,
        warnings: [] // Can be enhanced later
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Business rule validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  },
  
  assemblePackage: (data: MessagingData, operation: string) => {
    // Add server-side fields and transformations
    return {
      ...data,
      // Default workflow if not specified
      workflow: data.workflow || 'application',
      // Default message type if not specified
      messageType: data.messageType || 'rich-text',
      // Default priority if not specified
      priority: data.priority || 'normal'
    };
  }
};