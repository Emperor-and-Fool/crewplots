import express from 'express';
import engineRoutes from './engine';
import statusRoutes from './status';
import testRoutes from './test';

const router = express.Router();

// Mount validation sub-routes
router.use('/engine', engineRoutes);
router.use('/status', statusRoutes);
router.use('/test', testRoutes);

// Direct execute endpoint for unified validation
router.use('/', engineRoutes);

export default router;