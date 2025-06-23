import { useAuth } from "./use-auth";

/**
 * Hook for checking workflow-based permissions
 * Supports both normal workflow permissions and administrator blocked permissions
 */
export const useWorkflowPermissions = () => {
  const { user } = useAuth();

  const hasPermission = (workflow: string, permission: string): boolean => {
    // Debug logging for permission checks
    console.log(`🔍 PERMISSION CHECK: ${workflow}.${permission} for user:`, user?.username || 'null');
    
    // Return false if user is not loaded yet to prevent errors during loading
    if (!user || !user.id) {
      console.log(`🔍 PERMISSION CHECK: User not loaded, returning false for ${workflow}.${permission}`);
      return false;
    }

    // Admin fallback: if user has manager role, treat as admin with full access
    if (user.role === 'administrator' || (user.role === 'manager' && !user.workflowPermissions)) {
      console.log(`🔍 PERMISSION CHECK: Admin fallback for ${user.username} (${user.role})`);
      // Use blocked permissions if available, otherwise grant full access
      const blockedPermissions = user.blockedPermissions?.[workflow] || [];
      const result = !blockedPermissions.includes(permission);
      console.log(`🔍 PERMISSION CHECK: Admin result for ${workflow}.${permission}: ${result}`);
      return result;
    }

    // Manager with permissions: use workflow permissions normally
    if (user.role === 'manager' && user.workflowPermissions) {
      console.log(`🔍 PERMISSION CHECK: Manager with permissions for ${user.username}`);
      const workflowPermissions = user.workflowPermissions[workflow] || [];
      const result = workflowPermissions.includes(permission);
      console.log(`🔍 PERMISSION CHECK: Manager result for ${workflow}.${permission}: ${result}`, workflowPermissions);
      return result;
    }

    // Everyone else uses normal workflow permissions
    console.log(`🔍 PERMISSION CHECK: Standard permissions for ${user.username} (${user.role})`);
    const workflowPermissions = user.workflowPermissions?.[workflow] || [];
    const result = workflowPermissions.includes(permission);
    console.log(`🔍 PERMISSION CHECK: Standard result for ${workflow}.${permission}: ${result}`, workflowPermissions);
    return result;
  };

  const hasAnyPermission = (workflow: string, permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(workflow, permission));
  };

  const hasAllPermissions = (workflow: string, permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(workflow, permission));
  };

  // Helper to check if user has access to a workflow at all
  const hasWorkflowAccess = (workflow: string): boolean => {
    console.log(`🔍 WORKFLOW ACCESS: Checking ${workflow} for user:`, user?.username || 'null');
    
    // Return false if user is not loaded yet to prevent errors during loading
    if (!user || !user.id) {
      console.log(`🔍 WORKFLOW ACCESS: User not loaded, returning false for ${workflow}`);
      return false;
    }

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