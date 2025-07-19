//ATTENTION! This code directly supports: shared/validation/VE30PackageBuilder.ts

/**
 * CENTRALIZED PERMISSION MAPPING SERVICE
 * Consolidates all permission mapping logic for ValidationEngine30
 * 
 * Purpose: Translates database permissions and workflow permissions 
 * into validation engine format for unified permission checking
 */

export interface UserPermissionContext {
  id: number;
  username: string;
  role: string;
  permissions?: string[];           // Database permissions from role_permissions table
  workflowPermissions?: any;        // JSON workflow permissions object
}

/**
 * MAIN PERMISSION MAPPING FUNCTION
 * Consolidates all mapping logic from validation routes
 */
export function mapWorkflowToValidationPermissions(user: UserPermissionContext): string[] {
  const validationPermissions: string[] = [];
  
  console.log('🔐 CENTRALIZED MAPPER: Processing user:', {
    username: user.username,
    role: user.role,
    hasDbPermissions: !!user.permissions,
    hasWorkflowPermissions: !!user.workflowPermissions
  });
  
  // BLOCK 1: DATABASE PERMISSIONS MAPPING
  // Source: role_permissions table via PostgreSQL
  if (user.permissions && Array.isArray(user.permissions)) {
    user.permissions.forEach((perm: string) => {
      validationPermissions.push(perm);
    });
    console.log('🔐 MAPPER: Added database permissions:', user.permissions.length);
  }
  
  // BLOCK 2: WORKFLOW PERMISSIONS MAPPING  
  // Source: users.workflowPermissions JSON column
  const workflowPerms = user.workflowPermissions || {};
  
  // Package: Schedule/Scheduler validation packages
  if (workflowPerms.scheduling) {
    if (workflowPerms.scheduling.includes('create')) validationPermissions.push('schedule.create');
    if (workflowPerms.scheduling.includes('view')) validationPermissions.push('schedule.read');
    if (workflowPerms.scheduling.includes('edit')) validationPermissions.push('schedule.update');
    if (workflowPerms.scheduling.includes('delete')) validationPermissions.push('schedule.delete');
    console.log('🔐 MAPPER: Added scheduling permissions from workflow');
  }
  
  // Package: Location validation packages
  if (workflowPerms.location) {
    if (workflowPerms.location.includes('view')) validationPermissions.push('location.access_assigned');
    console.log('🔐 MAPPER: Added location permissions from workflow');
  }
  
  // Package: Messaging validation packages
  if (workflowPerms.application) {
    if (workflowPerms.application.includes('view')) validationPermissions.push('message.read');
    if (workflowPerms.application.includes('edit')) validationPermissions.push('message.update');
    if (workflowPerms.application.includes('delete')) validationPermissions.push('message.delete');
    console.log('🔐 MAPPER: Added messaging permissions from workflow');
  }
  
  // BLOCK 3: ROLE-BASED PERMISSION ADDITIONS
  // Source: Hard-coded role logic for specific validation packages
  
  // Package: User validation packages (userList, authProfile, etc.)
  if (user.role === 'administrator' || user.role === 'owner') {
    validationPermissions.push('user.read', 'user.manage', 'user.create');
  } else if (user.role === 'app_manager') {
    validationPermissions.push('user.read');
  }
  
  // Package: Location validation packages (admin override)
  if (user.role === 'administrator') {
    validationPermissions.push('location.access_all', 'location.read');
  }
  
  // Package: Messaging validation packages (role-based)
  if (user.role === 'administrator' || user.role === 'owner') {
    validationPermissions.push('message.read', 'message.create', 'message.update', 'message.delete');
  } else if (user.role === 'app_manager' || user.role === 'crew_chief') {
    validationPermissions.push('message.read', 'message.create', 'message.update');
  } else if (user.role === 'crew_member' || user.role === 'applicant') {
    validationPermissions.push('message.read', 'message.create');
  }
  
  // Package: Email validation packages (role-based)
  if (user.role === 'administrator' || user.role === 'owner') {
    validationPermissions.push('email.send', 'email.admin', 'email.verify', 'email.read', 'development.testing');
  } else if (user.role === 'app_manager') {
    validationPermissions.push('email.send', 'email.verify', 'email.read');
  }
  
  // Package: Competency validation packages (role-based)
  if (user.role === 'administrator' || user.role === 'owner') {
    validationPermissions.push('competency.read', 'competency.create', 'competency.update', 'competency.delete');
  } else if (user.role === 'app_manager' || user.role === 'crew_chief') {
    validationPermissions.push('competency.read', 'competency.update');
  } else if (user.role === 'crew_member' || user.role === 'applicant') {
    validationPermissions.push('competency.read');
  }
  
  // BLOCK 4: DEDUPLICATION
  // Remove duplicate permissions (ES5 compatible)
  const uniquePermissions: string[] = [];
  validationPermissions.forEach((perm: string) => {
    if (!uniquePermissions.includes(perm)) {
      uniquePermissions.push(perm);
    }
  });
  
  console.log('🔐 CENTRALIZED MAPPER: Final result:', {
    inputPermissions: validationPermissions.length,
    uniquePermissions: uniquePermissions.length,
    finalList: uniquePermissions
  });
  
  return uniquePermissions;
}

/**
 * LEGACY ROLE PERMISSIONS FALLBACK
 * Source: Consolidated from validation/engine.ts
 * Package: Scheduler validation packages fallback system
 */
export function getRolePermissions(userRole: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    administrator: [
      'schedule.create',
      'schedule.read', 
      'schedule.update',
      'schedule.delete',
      'scheduler_development',
      'scheduler_development.read',
      'scheduler_development.write',
      'scheduler_development.execute',
      'location.access_all',
      'user.read',
      'user.manage',
      'user.create',
      'message.read',
      'message.create',
      'message.update',
      'message.delete'
    ],
    owner: [
      'schedule.create',
      'schedule.read',
      'schedule.update', 
      'schedule.delete',
      'scheduler_development.read',
      'scheduler_development.write',
      'scheduler_development.execute',
      'location.access_assigned',
      'user.read',
      'user.manage',
      'message.read',
      'message.create',
      'message.update',
      'message.delete'
    ],
    app_manager: [
      'schedule.read',
      'schedule.update',
      'scheduler_development.read',
      'scheduler_development.write',
      'location.access_assigned',
      'user.read',
      'message.read',
      'message.create',
      'message.update'
    ],
    crew_chief: [
      'schedule.read',
      'scheduler_development.read',
      'location.access_assigned',
      'message.read',
      'message.create'
    ],
    crew_member: [
      'schedule.read',
      'location.access_assigned',
      'message.read',
      'message.create'
    ]
  };

  return rolePermissions[userRole] || ['schedule.read', 'message.read'];
}