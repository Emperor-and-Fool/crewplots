import { Router } from 'express';
import { ValidationEngine } from '../../services/validation/ValidationEngine';
import { authenticateUser } from '../../middleware/auth';

const router = Router();
const validationEngine = new ValidationEngine();

/**
 * NEW VALIDATION ENGINE EXECUTE ROUTE
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

    if (result.overall.isValid) {
      res.status(200).json({
        success: true,
        message: 'Validation and execution completed successfully',
        data: result.threads.transaction.data,
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
          threads: {
            assembly: result.threads.assembly.success,
            integrity: result.threads.integrity.success,
            permission: result.threads.permission.success,
            transaction: result.threads.transaction.success
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