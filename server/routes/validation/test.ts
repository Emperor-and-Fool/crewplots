import { Router } from 'express';
import { ValidationEngine } from '../../services/validation/ValidationEngine';
import { authenticateUser } from '../../middleware/auth';

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

    // Create operation context from authenticated user
    const context = {
      userId: 1, // Admin user from database
      userRole: 'administrator',
      permissions: [], // Simplified for testing
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