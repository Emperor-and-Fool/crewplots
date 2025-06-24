/**
 * Centralized Permission System with Docker-Aware Security
 * Provides administrator bypass for development while securing production
 */

import { isForceEnableAllowed } from './env';
import type { User } from '../schema';

/**
 * Check if forceEnableAll is currently active
 * Only available in non-Docker development environments
 */
export const isForceEnableAllActive = (): boolean => {
  return isForceEnableAllowed();
};

/**
 * Check if user has administrator bypass privileges
 * Requires administrator role AND forceEnableAll to be active
 */
export const hasAdminBypass = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'administrator' && isForceEnableAllActive();
};

/**
 * Universal permission checker with administrator bypass
 * Falls back to workflow permissions for normal users
 */
export const checkPermission = (
  user: User | null, 
  workflow: string, 
  action: string
): boolean => {
  // Administrator bypass check
  if (hasAdminBypass(user)) {
    console.warn('⚠️ ADMIN BYPASS ACTIVE - Development mode only');
    return true;
  }
  
  // Normal workflow permission check
  if (!user?.workflowPermissions) return false;
  
  const workflowPerms = user.workflowPermissions[workflow];
  if (!workflowPerms) return false;
  
  return workflowPerms.includes(action);
};

/**
 * Get all available permissions for user
 * Returns full permission set for administrators with bypass
 */
export const getAllPermissions = (user: User | null): Record<string, string[]> => {
  if (hasAdminBypass(user)) {
    return {
      crew: ['view', 'manage', 'schedule', 'assign'],
      location: ['view', 'edit', 'create', 'delete', 'manage_users'],
      financial: ['view', 'edit', 'reports', 'approve'],
      scheduling: ['view', 'create', 'edit', 'delete', 'assign'],
      application: ['view', 'hire', 'delete', 'edit', 'status_update']
    };
  }
  
  return user?.workflowPermissions || {};
};