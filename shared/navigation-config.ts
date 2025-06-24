import { 
  LayoutDashboard, 
  MapPin, 
  Users, 
  Calendar, 
  UserPlus, 
  DollarSign, 
  Book, 
  BarChart, 
  Settings, 
  Mail, 
  Shield,
  Plus
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  path?: string;
  requiredRole?: string | string[];
  requiredWorkflow?: string;
  children?: NavigationChild[];
}

export interface NavigationChild {
  id: string;
  label: string;
  path: string;
  icon?: any;
  requiredRole?: string | string[];
  requiredWorkflow?: string;
}

/**
 * Unified navigation configuration
 * Single source of truth for both desktop sidebar and mobile navbar
 */
export const navigationConfig: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard'
  },
  {
    id: 'locations',
    label: 'Locations',
    icon: MapPin,
    path: '/locations',
    requiredWorkflow: 'location',
    children: [
      {
        id: 'manage-locations',
        label: 'Manage Locations',
        path: '/locations',
        icon: Settings,
        requiredWorkflow: 'location'
      },
      {
        id: 'add-location', 
        label: 'Add Location',
        path: '/locations/new',
        icon: Plus,
        requiredWorkflow: 'location'
      }
    ]
  },
  {
    id: 'applications',
    label: 'Applications',
    icon: UserPlus,
    path: '/applicants',
    requiredWorkflow: 'application'
  },
  {
    id: 'crew',
    label: 'Crew',
    icon: Users,
    path: '/staff',
    requiredWorkflow: 'crew'
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: Calendar,
    path: '/scheduling',
    requiredWorkflow: 'scheduling'
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: DollarSign,
    path: '/reports',
    requiredWorkflow: 'financial'
  },
  {
    id: 'knowledge-base',
    label: 'Knowledge Base',
    icon: Book,
    path: '/knowledge-base'
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart,
    path: '/reports'
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: Settings,
    requiredRole: 'administrator',
    children: [
      {
        id: 'email-settings',
        label: 'Email Settings',
        path: '/settings/email',
        icon: Mail,
        requiredRole: 'administrator'
      },
      {
        id: 'security-settings',
        label: 'Security Settings',
        path: '/settings/security',
        icon: Shield,
        requiredRole: 'administrator'
      }
    ]
  }
];

/**
 * Check if user has access to a navigation item
 */
export function hasNavigationAccess(
  item: NavigationItem | NavigationChild,
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
  user: any,
  hasWorkflowAccess: (workflow: string) => boolean
): NavigationItem[] {
  return navigationConfig
    .filter(item => hasNavigationAccess(item, user, hasWorkflowAccess))
    .map(item => ({
      ...item,
      children: item.children?.filter(child => hasNavigationAccess(child, user, hasWorkflowAccess))
    }));
}