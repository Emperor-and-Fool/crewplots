import { Router } from 'express';
import { ValidationEngine } from '../../services/validation/ValidationEngine';
import { authenticateUser } from '../../middleware/auth';

const router = Router();
const validationEngine = new ValidationEngine();

/**
 * Role-to-permissions mapping - matches legacy validation system
 * Based on validation-package-service.ts getUserPermissions logic
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

    // Create operation context from authenticated user with proper permissions
    const userPermissions = getRolePermissions(req.user.role);
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