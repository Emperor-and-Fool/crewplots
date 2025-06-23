import { useAuth } from "./use-auth";

/**
 * Hook for checking workflow-based permissions
 * Supports both normal workflow permissions and administrator blocked permissions
 */
export const useWorkflowPermissions = () => {
  const { user } = useAuth();

  const hasPermission = (workflow: string, permission: string): boolean => {
    // Return false if user is not loaded yet to prevent errors during loading
    if (!user || !user.id) return false;

    // Admin fallback: if user has manager role, treat as admin with full access
    if (user.role === 'administrator' || (user.role === 'manager' && !user.workflowPermissions)) {
      // Use blocked permissions if available, otherwise grant full access
      const blockedPermissions = user.blockedPermissions?.[workflow] || [];
      return !blockedPermissions.includes(permission);
    }

    // Manager with permissions: use workflow permissions normally
    if (user.role === 'manager' && user.workflowPermissions) {
      const workflowPermissions = user.workflowPermissions[workflow] || [];
      return workflowPermissions.includes(permission);
    }

    // Everyone else uses normal workflow permissions
    const workflowPermissions = user.workflowPermissions?.[workflow] || [];
    return workflowPermissions.includes(permission);
  };

  const hasAnyPermission = (workflow: string, permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(workflow, permission));
  };

  const hasAllPermissions = (workflow: string, permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(workflow, permission));
  };

  // Helper to check if user has access to a workflow at all
  const hasWorkflowAccess = (workflow: string): boolean => {
    // Return false if user is not loaded yet to prevent errors during loading
    if (!user || !user.id) return false;

    // Admin fallback: manager without permissions gets full access
    if (user.role === 'administrator' || (user.role === 'manager' && !user.workflowPermissions)) {
      const blockedPermissions = user.blockedPermissions?.[workflow] || [];
      return blockedPermissions.length === 0 || !blockedPermissions.includes('view');
    }

    // Manager with permissions or other roles
    const workflowPermissions = user.workflowPermissions?.[workflow] || [];
    return workflowPermissions.length > 0;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasWorkflowAccess,
    user
  };
};

// Common workflow permissions for reference
export const WORKFLOW_PERMISSIONS = {
  application: ['view', 'hire', 'delete', 'edit', 'status_update'],
  crew: ['view', 'manage', 'schedule', 'assign'],
  financial: ['view', 'edit', 'reports', 'approve'],
  scheduling: ['view', 'create', 'edit', 'delete', 'assign'],
  location: ['view', 'edit', 'create', 'delete', 'manage_users']
} as const;

// Type for workflow names
export type WorkflowName = keyof typeof WORKFLOW_PERMISSIONS;