import { Router } from 'express';
import { ValidationEngine } from './ValidationEngine';
import { authenticateUser } from '../../middleware/auth';
import { storage } from '../../storage';

const router = Router();
const validationEngine = new ValidationEngine();

/**
 * NEW VALIDATION ENGINE TEST ROUTE
 * Test the new unified validation engine alongside existing working system
 */
router.post('/execute', authenticateUser, async (req, res) => {
  try {
    const { operation, entityType, entityId, data } = req.body;
    
    console.log('🧪 NEW VALIDATION ENGINE: Test execution started', { operation, entityType });
    console.log('🧪 TEST DEBUG: Route entered, req.user:', (req.user as any));

    // CREATE PARALLEL req.user.test APPROACH FOR TESTING
    // Method 1: Traditional storage.getUser approach (what we tried before)
    const fullUser = await storage.getUser((req.user as any).id);
    if (!fullUser) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Method 2: Internal API call to /api/profile-data (how scheduler works)
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
      }
    } catch (error) {
      console.log('🧪 TEST DEBUG: Profile data fetch error:', (error as Error).message);
    }

    console.log('🧪 TEST DEBUG: Data comparison:', {
      storageUser: {
        id: fullUser.id,
        username: fullUser.username,
        role: fullUser.role,
        hasPermissions: !!(fullUser as any).permissions,
        permissionCount: ((fullUser as any).permissions || []).length
      },
      profileData: {
        hasData: !!profileData,
        hasPermissions: !!(profileData?.permissions),
        permissionCount: (profileData?.permissions || []).length,
        keys: profileData ? Object.keys(profileData) : []
      }
    });

    // Create req.user.test object combining both approaches
    const reqUserTest = {
      id: fullUser.id,
      username: fullUser.username,
      role: fullUser.role,
      permissions: profileData?.permissions || (fullUser as any).permissions || [],
      workflowPermissions: profileData?.workflowPermissions || (fullUser as any).workflowPermissions || {}
    };

    console.log('🧪 TEST DEBUG: req.user.test created:', {
      id: reqUserTest.id,
      username: reqUserTest.username,
      role: reqUserTest.role,
      permissionCount: reqUserTest.permissions.length,
      workflowKeys: Object.keys(reqUserTest.workflowPermissions)
    });

    // Create operation context from req.user.test data
    const context = {
      userId: reqUserTest.id,
      userRole: reqUserTest.role,
      permissions: reqUserTest.permissions,
      workflowPermissions: reqUserTest.workflowPermissions,
      locationAccess: reqUserTest.workflowPermissions?.location ? [req.body.locationId] : [],
      sessionId: req.sessionID
    };

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

    // Include req.user.test context in response for debugging  
    const responseWithContext = {
      ...result,
      context: {
        userId: reqUserTest.id,
        username: reqUserTest.username,
        role: reqUserTest.role,
        permissions: reqUserTest.permissions,
        workflowPermissions: reqUserTest.workflowPermissions,
        testApproach: {
          storagePermissions: ((fullUser as any).permissions || []).length,
          profilePermissions: (profileData?.permissions || []).length,
          finalPermissions: reqUserTest.permissions.length
        }
      }
    };

    if (result.overall.isValid) {
      res.status(200).json(responseWithContext);
    } else {
      res.status(400).json(responseWithContext);
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

/**
 * VALIDATION ENGINE STATUS ROUTE
 * Check if the new validation engine is operational
 */
router.get('/status', authenticateUser, async (req, res) => {
  try {
    console.log('🧪 NEW VALIDATION ENGINE: Status check requested');

    // Simple health check
    const healthCheck = {
      engine: 'operational',
      timestamp: new Date().toISOString(),
      user: req.user.username,
      permissions: req.user.permissions?.length || 0
    };

    res.status(200).json({
      success: true,
      message: 'New validation engine is operational',
      status: healthCheck
    });

  } catch (error) {
    console.error('🧪 NEW VALIDATION ENGINE: Status check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Validation engine status check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as validationRoutes };