import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  requiredRole?: string | string[];
  requiredWorkflow?: string;
  children?: NavigationChild[];
}

export interface NavigationChild {
  id: string;
  label: string;
  path: string;
  icon?: LucideIcon;
  requiredRole?: string | string[];
  requiredWorkflow?: string;
}

export interface NavigationSection {
  id: string;
  label: string;
  icon: LucideIcon;
  requiredRole?: string | string[];
  requiredWorkflow?: string;
  children?: NavigationChild[];
}

/**
 * Check if user has access to a navigation item
 */
export function hasNavigationAccess(
  item: NavigationItem | NavigationChild | NavigationSection,
  user: any,
  hasWorkflowAccess: (workflow: string) => boolean
): boolean {
  // Check role requirements
  if (item.requiredRole) {
    const requiredRoles = Array.isArray(item.requiredRole) ? item.requiredRole : [item.requiredRole];
    if (!user || !requiredRoles.includes(user.role)) {
      return false;
    }
  }

  // Check workflow requirements
  if (item.requiredWorkflow) {
    if (!hasWorkflowAccess(item.requiredWorkflow)) {
      return false;
    }
  }

  return true;
}

/**
 * Filter navigation items based on user permissions
 */
export function getAccessibleNavigation(
  sections: NavigationSection[],
  user: any,
  hasWorkflowAccess: (workflow: string) => boolean
): NavigationSection[] {
  return sections
    .filter(section => hasNavigationAccess(section, user, hasWorkflowAccess))
    .map(section => ({
      ...section,
      children: section.children?.filter(child => hasNavigationAccess(child, user, hasWorkflowAccess))
    }));
}