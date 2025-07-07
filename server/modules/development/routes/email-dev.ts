/**
 * Email Development Routes
 * Testing and debugging utilities for email functionality
 * Plan 058: Traffic isolation strategy for email validation
 */

import { Router } from 'express';
import { emailValidationRouter } from '../validation/emailValidationEndpoints';

const router = Router();

// Mount email validation endpoints (Plan 058 - ValidationEngine30 dev pattern)
router.use('/validation', emailValidationRouter);

// Development email test endpoint
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Email development routes operational',
    endpoints: {
      validation: '/api/development/email/validation/*',
      test: '/api/development/email/validation/test',
      verify: '/api/development/email/validation/verify', 
      config: '/api/development/email/validation/config'
    },
    engine: 'ValidationEngine30',
    registry: 'developmentPackageRegistry'
  });
});

export { router as emailDevRoutes };