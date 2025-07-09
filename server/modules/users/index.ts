/**
 * Users Module
 * Consolidated user management with services and routing
 * Following KISS template pattern: Direct router + services exports
 */

import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth';

// Import services (converted from routes)
import profileRoutes from './services/ProfileService';
import managementRoutes from './services/ManagementService';
import applicantWorkflowRoutes from './services/WorkflowService';
import locationRoutes from './services/LocationService';

// Create main users router
const usersRouter = Router();

// Apply authentication middleware to all user routes
usersRouter.use(authenticateUser);

// Mount user service routes
usersRouter.use('/profile', profileRoutes);
usersRouter.use('/management', managementRoutes);
usersRouter.use('/applicant-workflows', applicantWorkflowRoutes);
usersRouter.use('/locations', locationRoutes);

// Export router as primary export
export { usersRouter };

// Export validation packages (already existing)
export { userProfilePackage } from './validation/userProfilePackage';
export { authProfilePackage } from './validation/authProfilePackage';
export { userRegistrationPackage } from './validation/userRegistrationPackage';

// Export types
export * from './types';