import { Router } from 'express';
import permissionTestRoutes from './permission-test';

const router = Router();

// Mount permission test routes
router.use('', permissionTestRoutes);

export default router;