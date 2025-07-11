import { Router } from 'express';
import authRoutes from './routes/auth-routes';

// FUTURE CATEGORIZED IMPORTS (commented out for preparation)
// import authRoutesGlobal from './routes/auth-routes-global';
// import authRoutesAdmin from './routes/auth-routes-admin';
// import authRoutesDevelopment from './routes/auth-routes-development';

// Export types for future integration
export * from './types';

const router = Router();

// CURRENT: Single auth routes (active)
// Mount auth routes directly (no additional /auth prefix since main routes.ts handles /api/auth)
router.use('/', authRoutes);

// FUTURE: Categorized auth routes (prepared for integration)
// router.use('/', authRoutesGlobal);
// router.use('/', authRoutesAdmin);
// router.use('/', authRoutesDevelopment);

export default router;