/**
 * Default workflow permissions for different roles
 * This provides a baseline set of permissions that can be customized per user
 */

export const DEFAULT_WORKFLOW_PERMISSIONS = {
  // Administrator gets no workflow permissions (uses blocked permissions instead)
  administrator: {},
  
  // Manager gets full access to most workflows
  manager: {
    application: ['view', 'hire', 'delete', 'edit', 'status_update'],
    crew: ['view', 'manage', 'schedule', 'assign'],
    financial: ['view', 'edit', 'reports', 'approve'],
    scheduling: ['view', 'create', 'edit', 'delete', 'assign'],
    location: ['view', 'edit', 'create', 'delete', 'manage_users']
  },
  
  // Crew manager gets moderate access
  crew_manager: {
    application: ['view', 'status_update'],
    crew: ['view', 'manage', 'schedule'],
    scheduling: ['view', 'create', 'edit', 'assign'],
    location: ['view']
  },
  
  // Crew member gets limited access with enhanced scheduling
  crew_member: {
    application: ['view'],
    crew: ['view'],
    scheduling: ['view', 'subscribe'],
    location: ['view']
  },
  
  // Applicant gets no workflow permissions
  applicant: {}
} as const;

/**
 * Assign default workflow permissions to a user based on their role
 */
export function getDefaultWorkflowPermissions(role: string): Record<string, string[]> {
  return DEFAULT_WORKFLOW_PERMISSIONS[role as keyof typeof DEFAULT_WORKFLOW_PERMISSIONS] || {};
}

/**
 * Check if a user should get workflow permissions by default
 */
export function shouldAssignDefaultPermissions(role: string): boolean {
  return ['manager', 'crew_manager', 'crew_member'].includes(role);
}