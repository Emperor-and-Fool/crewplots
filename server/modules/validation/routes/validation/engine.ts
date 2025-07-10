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
    console.log('🧪 TEST DEBUG: Route entered, req.user:', req.user);

    // CREATE PARALLEL req.user.test APPROACH FOR TESTING  
    // Method 1: Direct req.user (current approach - has missing permissions)
    console.log('🧪 TEST DEBUG: Method 1 - Direct req.user:', {
      id: (req.user as any).id,
      username: (req.user as any).username,
      role: (req.user as any).role,
      hasPermissions: !!(req.user as any).permissions,
      permissionCount: ((req.user as any).permissions || []).length,
      hasWorkflow: !!(req.user as any).workflowPermissions,
      workflowKeys: (req.user as any).workflowPermissions ? Object.keys((req.user as any).workflowPermissions) : []
    });

    // Method 2: Fetch from /api/profile-data (like scheduler module does)
    let profileData = null;
    try {
      const profileResponse = await fetch(`http://localhost:5000/api/profile-data`, {
        headers: {
          'Cookie': req.headers.cookie || '',
          'User-Agent': 'ValidationEngine-Test'
        }
      });
      
      if (profileResponse.ok) {
        profileData = await profileResponse.json();
        console.log('🧪 TEST DEBUG: Method 2 - Profile data success:', {
          hasData: !!profileData,
          hasPermissions: !!(profileData?.permissions),
          permissionCount: (profileData?.permissions || []).length,
          keys: profileData ? Object.keys(profileData) : []
        });
      } else {
        console.log('🧪 TEST DEBUG: Method 2 - Profile fetch failed:', profileResponse.status);
      }
    } catch (error) {
      console.log('🧪 TEST DEBUG: Method 2 - Profile fetch error:', (error as Error).message);
    }

    // Create req.user.test with complete data
    const reqUserTest = {
      id: (req.user as any).id,
      username: (req.user as any).username,
      role: (req.user as any).role,
      permissions: profileData?.permissions || (req.user as any).permissions || [],
      workflowPermissions: profileData?.workflowPermissions || (req.user as any).workflowPermissions || {}
    };

    console.log('🧪 TEST DEBUG: req.user.test created:', {
      id: reqUserTest.id,
      username: reqUserTest.username,
      role: reqUserTest.role,
      permissionCount: reqUserTest.permissions.length,
      workflowKeys: Object.keys(reqUserTest.workflowPermissions),
      comparisonResults: {
        reqUserPermissions: ((req.user as any).permissions || []).length,
        profilePermissions: (profileData?.permissions || []).length,
        finalPermissions: reqUserTest.permissions.length
      }
    });

    // Create operation context from authenticated user with mapped permissions
    const userPermissions = mapWorkflowToValidationPermissions(reqUserTest);
    
    console.log('🔍 PERMISSION MAPPING:', {
      userRole: (req.user as any).role,
      workflowPermissions: (req.user as any).workflowPermissions,
      databasePermissions: (req.user as any).permissions,
      mappedPermissions: userPermissions
    });
    
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      permissions: userPermissions,
      workflowPermissions: (req.user as any).workflowPermissions || {},
      locationAccess: (req.user as any).role === 'administrator' ? 'all' : [],
      sessionId: req.sessionID
    };

    console.log('🔐 NEW AUTH SYSTEM: Context created', { 
      role: (req.user as any).role, 
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
          rulesApplied: result.overall.metadata?.rulesApplied?.length || 0,
          // Include user context with actual permissions from validation
          userContext: {
            id: context.userId,
            username: (req.user as any).username || 'admin',
            role: context.userRole,
            permissions: context.permissions || [],
            workflowPermissions: context.workflowPermissions || {}
          }
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