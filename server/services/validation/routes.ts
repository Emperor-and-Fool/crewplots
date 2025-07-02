import { Router } from 'express';
import { ValidationEngine } from './ValidationEngine';
import { authenticateUser } from '../../middleware/auth';

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

    // Create operation context from authenticated user
    const context = {
      userId: req.user.id,
      userRole: req.user.role,
      permissions: req.user.permissions || [],
      locationAccess: req.user.workflowPermissions?.location ? [req.body.locationId] : [],
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

    // Include user context in response for debugging  
    const responseWithContext = {
      ...result,
      context: {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        permissions: context.permissions
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