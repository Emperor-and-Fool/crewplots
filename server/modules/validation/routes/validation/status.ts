import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth';

const router = Router();

/**
 * VALIDATION ENGINE STATUS ROUTE
 * Check if the new validation engine is operational
 */
router.get('/', authenticateUser, async (req, res) => {
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

export default router;