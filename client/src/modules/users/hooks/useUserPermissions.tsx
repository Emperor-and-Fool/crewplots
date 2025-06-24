// User Module - User Permissions Hook

import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { 
  PermissionCheck, 
  UsePermissionsReturn, 
  WorkflowType,
  ResourceType,
  PermissionAction
} from '../types/permissions.types';
import type { UserRole } from '../types/user.types';
import { WORKFLOW_PERMISSIONS } from '../types/permissions.types';

export function useUserPermissions(): UsePermissionsReturn {
  const { authState, hasRole } = useAuth();
  const { user } = authState;

  // Base permission calculations
  const permissions = useMemo(() => {
    if (!user) return [];

    const basePermissions = [];

    // Define role-based permissions
    switch (user.role) {
      case 'administrator':
        basePermissions.push(
          { id: 'admin_all', resource: 'user' as ResourceType, action: 'manage' as PermissionAction },
          { id: 'admin_applicants', resource: 'applicant' as ResourceType, action: 'manage' as PermissionAction },
          { id: 'admin_locations', resource: 'location' as ResourceType, action: 'manage' as PermissionAction },
          { id: 'admin_schedules', resource: 'schedule' as ResourceType, action: 'manage' as PermissionAction },
          { id: 'admin_messages', resource: 'message' as ResourceType, action: 'manage' as PermissionAction },
          { id: 'admin_reports', resource: 'report' as ResourceType, action: 'manage' as PermissionAction },
          { id: 'admin_settings', resource: 'setting' as ResourceType, action: 'manage' as PermissionAction },
          { id: 'admin_dashboard', resource: 'dashboard' as ResourceType, action: 'read' as PermissionAction }
        );
        break;

      case 'manager':
        basePermissions.push(
          { id: 'mgr_applicants', resource: 'applicant' as ResourceType, action: 'manage' as PermissionAction },
          { id: 'mgr_locations', resource: 'location' as ResourceType, action: 'manage' as PermissionAction },
          { id: 'mgr_schedules', resource: 'schedule' as ResourceType, action: 'manage' as PermissionAction },
          { id: 'mgr_messages', resource: 'message' as ResourceType, action: 'create' as PermissionAction },
          { id: 'mgr_reports', resource: 'report' as ResourceType, action: 'read' as PermissionAction },
          { id: 'mgr_dashboard', resource: 'dashboard' as ResourceType, action: 'read' as PermissionAction },
          { id: 'mgr_users_read', resource: 'user' as ResourceType, action: 'read' as PermissionAction }
        );
        break;

      case 'crew':
        basePermissions.push(
          { id: 'crew_messages', resource: 'message' as ResourceType, action: 'create' as PermissionAction, scope: 'own' },
          { id: 'crew_schedule_read', resource: 'schedule' as ResourceType, action: 'read' as PermissionAction, scope: 'own' },
          { id: 'crew_profile', resource: 'user' as ResourceType, action: 'update' as PermissionAction, scope: 'own' }
        );
        break;

      case 'applicant':
        basePermissions.push(
          { id: 'app_profile', resource: 'user' as ResourceType, action: 'update' as PermissionAction, scope: 'own' },
          { id: 'app_application', resource: 'applicant' as ResourceType, action: 'create' as PermissionAction, scope: 'own' }
        );
        break;
    }

    return basePermissions;
  }, [user]);

  // Permission checking function
  const can = useCallback((check: PermissionCheck): boolean => {
    if (!user) return false;

    // Administrator bypass
    if (user.role === 'administrator') return true;

    // Find matching permission
    const hasPermission = permissions.some(permission => {
      if (permission.resource !== check.resource) return false;
      if (permission.action !== check.action && permission.action !== 'manage') return false;

      // Check scope restrictions
      if (permission.scope === 'own') {
        if (check.resourceId && check.ownerId) {
          return user.id === check.ownerId;
        }
        return true; // Assume own if no specific resource ID
      }

      if (permission.scope === 'location') {
        if (check.locationId && user.locationId) {
          return user.locationId === check.locationId;
        }
        return true; // Assume same location if no specific location
      }

      return true; // 'all' scope or no scope restriction
    });

    return hasPermission;
  }, [user, permissions]);

  // Resource access checking
  const canAccessResource = useCallback((
    resource: ResourceType, 
    action: PermissionAction, 
    resourceId?: number
  ): boolean => {
    return can({ resource, action, resourceId });
  }, [can]);

  // Workflow access checking
  const hasWorkflowAccess = useCallback((workflow: WorkflowType): boolean => {
    if (!user) return false;

    const workflowConfig = WORKFLOW_PERMISSIONS[workflow];
    return workflowConfig.visibleToRoles.includes(user.role);
  }, [user]);

  // Role checking (from auth hook)
  const isAdmin = hasRole('administrator');
  const isManager = hasRole(['manager', 'administrator']);
  const isCrew = hasRole(['crew', 'manager', 'administrator']);
  const isApplicant = hasRole('applicant');

  return {
    can,
    hasRole,
    hasWorkflowAccess,
    canAccessResource,
    isAdmin,
    isManager,
    isCrew,
    isApplicant,
    permissions
  };
}

// Hook for workflow-specific permissions (integration with messaging module)
export function useWorkflowPermissions(workflow: WorkflowType) {
  const { user } = useAuth().authState;
  const { hasWorkflowAccess } = useUserPermissions();

  return useMemo(() => {
    if (!user) {
      return {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canModerate: false
      };
    }

    const workflowConfig = WORKFLOW_PERMISSIONS[workflow];
    const userRole = user.role;

    return {
      canView: hasWorkflowAccess(workflow),
      canCreate: workflowConfig.canCreate.includes(userRole),
      canEdit: workflowConfig.canEdit.includes(userRole),
      canDelete: workflowConfig.canDelete.includes(userRole),
      canModerate: workflowConfig.canModerate.includes(userRole)
    };
  }, [user, workflow, hasWorkflowAccess]);
}

// React components for permission-based rendering
export function PermissionGuard({ 
  require, 
  fallback = null, 
  children 
}: { 
  require: PermissionCheck;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { can } = useUserPermissions();
  
  if (!can(require)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

export function RoleGuard({ 
  roles, 
  fallback = null, 
  children 
}: { 
  roles: UserRole | UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { hasRole } = useUserPermissions();
  
  if (!hasRole(roles)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}