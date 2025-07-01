import { Router } from 'express';
import { ValidationEngine } from '../../services/validation/ValidationEngine';
import { authenticateUser } from '../../middleware/auth';

/**
 * Map workflow permissions to validation permissions
 */
function mapWorkflowToValidationPermissions(user: any): string[] {
  const validationPermissions: string[] = [];
  
  // Use database permissions if available (from role_permissions table)
  if (user.permissions && Array.isArray(user.permissions)) {
    user.permissions.forEach((perm: string) => validationPermissions.push(perm));
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

    // Create simple test data - using database admin user id=1
    const testData = {
      name: "Test Schedule Block",
      description: "Testing unified validation engine",
      locationId: 1,
      isActive: true,
      createdBy: 1 // Admin user from database
    };
    
    console.log('🧪 VALIDATION ENGINE: Created testData object:', JSON.stringify(testData, null, 2));

    // Map user permissions using same logic as execution endpoint
    const mappedPermissions = mapWorkflowToValidationPermissions(req.user);
    
    console.log('🧪 PERMISSION MAPPING DEBUG:');
    console.log('  Input user.permissions:', req.user.permissions || []);
    console.log('  Input user.workflowPermissions:', req.user.workflowPermissions || {});
    console.log('  Mapped validation permissions:', mappedPermissions);
    console.log('  Total permission count:', mappedPermissions.length);

    // Create operation context from authenticated user
    const context = {
      userId: req.user.id,
      userRole: req.user.role,
      permissions: mappedPermissions, // Use mapped permissions instead of empty array
      locationAccess: [1], // Admin has access to location 1
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