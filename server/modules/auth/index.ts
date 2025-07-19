import { Router } from 'express';
import authRoutes from './routes/auth-routes';
import authDevelopmentRoutes from './routes/auth-routes-development';

// Export types for future integration
export * from './types';

const router = Router();

// ================================
// PRODUCTION ROUTES (always active)
// ================================
// Production authentication routes (JSON only)
router.use('/', authRoutes);

// ================================
// DEVELOPMENT ROUTES (conditional)
// ================================
// Development routes for admin/devops (HTML logout available)
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_ROUTES === 'true') {
  router.use('/', authDevelopmentRoutes);
  console.log('🔧 AUTH MODULE: Development routes enabled');
}

export default router;