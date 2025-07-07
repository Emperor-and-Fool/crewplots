/**
 * Development Routes
 * Central router for all development endpoints
 */

import { Router } from 'express';
import { emailDevRoutes } from './email-dev';
import { validationTestRoutes } from './validation-test';
import { experimentalRoutes } from './experimental';

const router = Router();

// Mount development route modules (empty routers - placeholders removed)
router.use('/email', emailDevRoutes);
router.use('/validation', validationTestRoutes);
router.use('/experimental', experimentalRoutes);

// Main development endpoint (future VE30 development patterns)
router.post('/execute', async (req, res) => {
  // TODO: Implement development validation engine endpoint
  res.json({
    success: false,
    message: 'Development validation engine not implemented yet'
  });
});

export { router as developmentRoutes };