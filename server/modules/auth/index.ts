import { Router } from 'express';
import authRoutes from './routes/auth-routes';

const router = Router();

// Mount auth routes directly (no additional /auth prefix since main routes.ts handles /api/auth)
router.use('/', authRoutes);

export default router;