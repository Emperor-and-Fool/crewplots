import { Router } from 'express';

import securityRoutes from './routes';

const router = Router();

router.use('/', securityRoutes);

export default router;