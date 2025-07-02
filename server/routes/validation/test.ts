import { Router } from 'express';
import { ValidationEngine } from '../../services/validation/ValidationEngine';
import { authenticateUser } from '../../middleware/auth';

/**
 * Map workflow permissions to validation permissions
 */
function mapWorkflowToValidationPermissions(user: any): string[] {
  console.log('🧪 MAPPER DEBUG: Starting permission mapping for user:', user.username);
  console.log('🧪 MAPPER DEBUG: User role:', user.role);
  console.log('🧪 MAPPER DEBUG: User permissions type:', typeof user.permissions);
  console.log('🧪 MAPPER DEBUG: User permissions:', user.permissions);
  console.log('🧪 MAPPER DEBUG: User workflowPermissions type:', typeof user.workflowPermissions);
  console.log('🧪 MAPPER DEBUG: User workflowPermissions:', user.workflowPermissions);
  
  const validationPermissions: string[] = [];
  
  // Use database permissions if available (from role_permissions table)
  if (user.permissions && Array.isArray(user.permissions)) {
    console.log('🧪 MAPPER DEBUG: Adding database permissions:', user.permissions.length);
    user.permissions.forEach((perm: string) => {
      console.log('🧪 MAPPER DEBUG: Adding database perm:', perm);
      validationPermissions.push(perm);
    });
  } else {
    console.log('🧪 MAPPER DEBUG: No database permissions found or not array');
  }
  
  // Map workflow permissions to validation permissions
  const workflowPerms = user.workflowPermissions || {};
  console.log('🧪 MAPPER DEBUG: Workflow permissions extracted:', workflowPerms);
  
  if (workflowPerms.scheduling) {
    console.log('🧪 MAPPER DEBUG: Processing scheduling permissions:', workflowPerms.scheduling);
    if (workflowPerms.scheduling.includes('create')) {
      console.log('🧪 MAPPER DEBUG: Adding schedule.create');
      validationPermissions.push('schedule.create');
    }
    if (workflowPerms.scheduling.includes('view')) {
      console.log('🧪 MAPPER DEBUG: Adding schedule.read');
      validationPermissions.push('schedule.read');
    }
    if (workflowPerms.scheduling.includes('edit')) {
      console.log('🧪 MAPPER DEBUG: Adding schedule.update');
      validationPermissions.push('schedule.update');
    }
    if (workflowPerms.scheduling.includes('delete')) {
      console.log('🧪 MAPPER DEBUG: Adding schedule.delete');
      validationPermissions.push('schedule.delete');
    }
  } else {
    console.log('🧪 MAPPER DEBUG: No scheduling workflow permissions found');
  }
  
  if (workflowPerms.location) {
    console.log('🧪 MAPPER DEBUG: Processing location permissions:', workflowPerms.location);
    if (workflowPerms.location.includes('view')) {
      console.log('🧪 MAPPER DEBUG: Adding location.access_assigned');
      validationPermissions.push('location.access_assigned');
    }
    if (user.role === 'administrator') {
      console.log('🧪 MAPPER DEBUG: Adding location.access_all for administrator');
      validationPermissions.push('location.access_all');
    }
  } else {
    console.log('🧪 MAPPER DEBUG: No location workflow permissions found');
  }
  
  console.log('🧪 MAPPER DEBUG: Before deduplication:', validationPermissions);
  
  // Remove duplicates manually (ES5 compatible)
  const uniquePermissions: string[] = [];
  validationPermissions.forEach((perm: string) => {
    if (!uniquePermissions.includes(perm)) {
      uniquePermissions.push(perm);
    }
  });
  
  console.log('🧪 MAPPER DEBUG: Final mapped permissions:', uniquePermissions);
  console.log('🧪 MAPPER DEBUG: Total permission count:', uniquePermissions.length);
  
  return uniquePermissions;
}

const router = Router();
const validationEngine = new ValidationEngine();

/**
 * TEST ENDPOINT FOR VALIDATION ENGINE
 * Simple test without external authentication issues
 */
router.get('/test', authenticateUser, async (req, res) => {
  try {
    console.log('🧪 VALIDATION ENGINE: Test execution started');

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

    // Create simple test data - using database admin user id=1
    const testData = {
      name: "Test Schedule Block",
      description: "Testing unified validation engine",
      locationId: 1,
      isActive: true,
      createdBy: 1 // Admin user from database
    };
    
    console.log('🧪 VALIDATION ENGINE: Created testData object:', JSON.stringify(testData, null, 2));

    // Create operation context from authenticated user - USE req.user.test WITH COMPLETE DATA
    const mappedPermissions = mapWorkflowToValidationPermissions(reqUserTest);
    
    console.log('🧪 PERMISSION MAPPING DEBUG (test endpoint):');
    console.log('  Raw req.user object:', JSON.stringify(req.user, null, 2));
    console.log('  Input user.permissions:', req.user.permissions || []);
    console.log('  Input user.workflowPermissions:', req.user.workflowPermissions || {});
    console.log('  Mapped validation permissions:', mappedPermissions);
    console.log('  Total permission count:', mappedPermissions.length);

    const context = {
      userId: req.user.id,
      userRole: req.user.role,
      permissions: mappedPermissions, // Should be populated if mapper works
      locationAccess: [1],
      sessionId: req.sessionID
    };

    console.log('🧪 VALIDATION ENGINE: Test context created', {
      userId: context.userId,
      role: context.userRole,
      permissions: context.permissions.length
    });

    console.log('🧪 VALIDATION ENGINE: Test data being sent:', testData);
    console.log('🧪 VALIDATION ENGINE: req.user object:', req.user);

    // Execute validation using new engine
    const result = await validationEngine.validateAndExecute(
      'create',
      'scheduleBlock',
      testData,
      context
    );

    console.log('🧪 VALIDATION ENGINE: Test completed', { 
      success: result.overall.isValid,
      errors: result.overall.errors.length,
      packageId: result.packageId
    });

    res.status(200).json({
      success: true,
      message: 'Validation engine test completed',
      result: {
        isValid: result.overall.isValid,
        errors: result.overall.errors,
        warnings: result.overall.warnings,
        validationTime: result.overall.metadata?.validationTime,
        packageId: result.packageId,
        testData: testData,
        context: {
          userId: context.userId,
          role: context.userRole,
          permissionCount: context.permissions.length
        }
      }
    });

  } catch (error) {
    console.error('🧪 VALIDATION ENGINE: Test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Validation engine test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;