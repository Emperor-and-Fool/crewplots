import { Router } from 'express';
import { ValidationEngine } from '../../services/validation/ValidationEngine';
import { authenticateUser } from '../../middleware/auth';

const router = Router();
const validationEngine = new ValidationEngine();

/**
 * Map workflow permissions to validation permissions
 */
function mapWorkflowToValidationPermissions(user: any): string[] {
  const validationPermissions: string[] = [];
  
  console.log('🔍 MAPPER DEBUG:', {
    hasPermissions: !!user.permissions,
    isArray: Array.isArray(user.permissions),
    permissions: user.permissions,
    workflowPermissions: user.workflowPermissions
  });
  
  // Use database permissions if available (from role_permissions table)
  if (user.permissions && Array.isArray(user.permissions)) {
    user.permissions.forEach((perm: string) => validationPermissions.push(perm));
    console.log('🔍 MAPPER: Added database permissions:', user.permissions);
  }
  
  // Map workflow permissions to validation permissions
  const workflowPerms = user.workflowPermissions || {};
  
  if (workflowPerms.scheduling) {
    if (workflowPerms.scheduling.includes('create')) validationPermissions.push('schedule.create');
    if (workflowPerms.scheduling.includes('view')) validationPermissions.push('schedule.read');
    if (workflowPerms.scheduling.includes('edit')) validationPermissions.push('schedule.update');
    if (workflowPerms.scheduling.includes('delete')) validationPermissions.push('schedule.delete');
  }
  
  if (workflowPerms.location) {
    if (workflowPerms.location.includes('view')) validationPermissions.push('location.access_assigned');
    if (user.role === 'administrator') validationPermissions.push('location.access_all');
  }
  
  // Remove duplicates manually (ES5 compatible)
  const uniquePermissions: string[] = [];
  validationPermissions.forEach((perm: string) => {
    if (!uniquePermissions.includes(perm)) {
      uniquePermissions.push(perm);
    }
  });
  
  console.log('🔍 MAPPER FINAL:', {
    totalPermissions: validationPermissions.length,
    uniquePermissions: uniquePermissions.length,
    finalPermissions: uniquePermissions
  });
  
  return uniquePermissions;
}

/**
 * Legacy role permissions fallback
 */
function getRolePermissions(userRole: string): string[] {
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
      'location.access_all'
    ],
    owner: [
      'schedule.create',
      'schedule.read',
      'schedule.update', 
      'schedule.delete',
      'scheduler_development.read',
      'scheduler_development.write',
      'scheduler_development.execute',
      'location.access_assigned'
    ],
    app_manager: [
      'schedule.read',
      'schedule.update',
      'scheduler_development.read',
      'scheduler_development.write',
      'location.access_assigned'
    ],
    crew_chief: [
      'schedule.read',
      'scheduler_development.read',
      'location.access_assigned'
    ],
    crew_member: [
      'schedule.read',
      'location.access_assigned'
    ]
  };

  return rolePermissions[userRole] || ['schedule.read'];
}

/**
 * NEW VALIDATION ENGINE EXECUTE ROUTE
 * Test the new unified validation engine alongside existing working system
 */
router.post('/execute', authenticateUser, async (req, res) => {
  try {
    const { operation, entityType, entityId, data } = req.body;
    
    console.log('🧪 NEW VALIDATION ENGINE: Test execution started', { operation, entityType });

    // Create operation context from authenticated user with mapped permissions
    const userPermissions = mapWorkflowToValidationPermissions(req.user);
    
    console.log('🔍 PERMISSION MAPPING:', {
      userRole: req.user.role,
      workflowPermissions: req.user.workflowPermissions,
      databasePermissions: req.user.permissions,
      mappedPermissions: userPermissions
    });
    
    const context = {
      userId: req.user.id,
      userRole: req.user.role,
      permissions: userPermissions,
      locationAccess: req.user.role === 'administrator' ? [req.body.locationId] : [],
      sessionId: req.sessionID
    };

    console.log('🔐 NEW AUTH SYSTEM: Context created', { 
      role: req.user.role, 
      permissions: userPermissions.length,
      permissionList: userPermissions 
    });

    // Execute validation using new engine
    const result = await validationEngine.validateAndExecute(
      operation,
      entityType,
      data,
      context,
      entityId
    );

    console.log('🧪 NEW VALIDATION ENGINE: Execution completed', { 
      success: result.overall.isValid,
      errors: result.overall.errors.length,
      packageId: result.packageId
    });

    if (result.overall.isValid) {
      res.status(200).json({
        success: true,
        message: 'Validation and execution completed successfully',
        data: result.threads.transaction?.data,
        validation: {
          packageId: result.packageId,
          validationTime: result.overall.metadata?.validationTime,
          rulesApplied: result.overall.metadata?.rulesApplied?.length || 0
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.overall.errors,
        warnings: result.overall.warnings,
        validation: {
          packageId: result.packageId,
          threads: result.threads.error ? {
            // Failure case - only error thread exists
            error: result.threads.error.success
          } : {
            // Success case - individual threads exist
            schema: result.threads.schema?.success,
            permission: result.threads.permission?.success,
            businessRules: result.threads.businessRules?.success,
            transaction: result.threads.transaction?.success
          }
        }
      });
    }

  } catch (error) {
    console.error('🧪 NEW VALIDATION ENGINE: Execution failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal validation engine error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;