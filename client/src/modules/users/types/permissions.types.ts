// User Module - Permissions and Role-Based Access Control Types

import type { UserRole } from './user.types';

export type PermissionAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'manage';

export type ResourceType = 
  | 'user' 
  | 'applicant' 
  | 'location' 
  | 'schedule' 
  | 'message' 
  | 'report' 
  | 'setting' 
  | 'dashboard';

export interface Permission {
  id: string;
  resource: ResourceType;
  action: PermissionAction;
  scope?: 'own' | 'location' | 'all';
  conditions?: Record<string, any>;
}

export interface RolePermissionSet {
  role: UserRole;
  permissions: Permission[];
  inheritsFrom?: UserRole[];
}

export interface PermissionCheck {
  resource: ResourceType;
  action: PermissionAction;
  resourceId?: number;
  locationId?: number;
  ownerId?: number;
}

export interface PermissionContext {
  userId: number;
  userRole: UserRole;
  locationId?: number;
  isResourceOwner?: boolean;
}

export interface AccessControlResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: UserRole;
  requiredPermission?: string;
}

// Workflow-specific permissions (integration with messaging module)
export type WorkflowType = 
  | 'application' 
  | 'crew' 
  | 'location' 
  | 'scheduling' 
  | 'knowledge' 
  | 'statistics';

export interface WorkflowPermissions {
  visibleToRoles: UserRole[];
  canCreate: UserRole[];
  canEdit: UserRole[];
  canDelete: UserRole[];
  canModerate: UserRole[];
}

export interface WorkflowConfig {
  workflow: WorkflowType;
  permissions: WorkflowPermissions;
  features: {
    enableRichText: boolean;
    enableFileAttachments: boolean;
    enablePrivateMessages: boolean;
    enablePriority: boolean;
    enableAutoSave: boolean;
  };
  ui: {
    placeholder: string;
    compactMode: boolean;
    readOnlyMode: boolean;
  };
}

// Permission hooks and utilities
export interface UsePermissionsReturn {
  can: (check: PermissionCheck) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasWorkflowAccess: (workflow: WorkflowType) => boolean;
  canAccessResource: (resource: ResourceType, action: PermissionAction, resourceId?: number) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isCrew: boolean;
  isApplicant: boolean;
  permissions: Permission[];
}

export interface PermissionGuardProps {
  require: PermissionCheck;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export interface RoleGuardProps {
  roles: UserRole | UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// Default permission sets
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  applicant: [],
  crew: [],
  manager: [],
  administrator: []
};

export const WORKFLOW_PERMISSIONS: Record<WorkflowType, WorkflowPermissions> = {
  application: {
    visibleToRoles: ['manager', 'administrator'],
    canCreate: ['applicant', 'manager', 'administrator'],
    canEdit: ['manager', 'administrator'],
    canDelete: ['administrator'],
    canModerate: ['manager', 'administrator']
  },
  crew: {
    visibleToRoles: ['crew', 'manager', 'administrator'],
    canCreate: ['crew', 'manager', 'administrator'],
    canEdit: ['crew', 'manager', 'administrator'],
    canDelete: ['manager', 'administrator'],
    canModerate: ['manager', 'administrator']
  },
  location: {
    visibleToRoles: ['crew', 'manager', 'administrator'],
    canCreate: ['manager', 'administrator'],
    canEdit: ['manager', 'administrator'],
    canDelete: ['administrator'],
    canModerate: ['manager', 'administrator']
  },
  scheduling: {
    visibleToRoles: ['crew', 'manager', 'administrator'],
    canCreate: ['manager', 'administrator'],
    canEdit: ['manager', 'administrator'],
    canDelete: ['administrator'],
    canModerate: ['manager', 'administrator']
  },
  knowledge: {
    visibleToRoles: ['crew', 'manager', 'administrator'],
    canCreate: ['crew', 'manager', 'administrator'],
    canEdit: ['manager', 'administrator'],
    canDelete: ['administrator'],
    canModerate: ['manager', 'administrator']
  },
  statistics: {
    visibleToRoles: ['manager', 'administrator'],
    canCreate: ['administrator'],
    canEdit: ['administrator'],
    canDelete: ['administrator'],
    canModerate: ['administrator']
  }
};