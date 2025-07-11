import { Router } from 'express';

import dashboardRoutes from './routes';

const router = Router();

router.use('/', dashboardRoutes);

export default router;