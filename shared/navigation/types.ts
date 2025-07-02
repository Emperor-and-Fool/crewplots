import { LucideIcon } from 'lucide-react';

export interface PermissionConfig {
  role?: string | string[];
  workflow?: string;
  custom?: (user: any) => boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  path?: string;
  icon?: LucideIcon;
  permission?: PermissionConfig;
  children?: NavigationItem[];
}

export interface NavigationSection {
  id: string;
  label: string;
  icon: LucideIcon;
  permission?: PermissionConfig;
  children?: NavigationItem[];
}

export interface User {
  id: number;
  username: string;
  role: string;
  workflowPermissions?: Record<string, string[]>;
}

/**
 * Check if user meets permission requirements
 */
export function hasPermission(
  permission: PermissionConfig | undefined,
  user: any,
  hasWorkflowAccess: (workflow: string) => boolean
): boolean {
  if (!permission) return true;
  
  // Check role requirements
  if (permission.role) {
    const requiredRoles = Array.isArray(permission.role) ? permission.role : [permission.role];
    if (!user || !requiredRoles.includes(user.role)) {
      return false;
    }
  }

  // Check workflow requirements
  if (permission.workflow) {
    if (!hasWorkflowAccess(permission.workflow)) {
      return false;
    }
  }

  // Check custom permission function
  if (permission.custom) {
    if (!permission.custom(user)) {
      return false;
    }
  }

  return true;
}