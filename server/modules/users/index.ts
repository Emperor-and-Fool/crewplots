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

// ===================================================================================================
// USER ROUTES SECTION - COPIED FROM server/routes/users/index.ts
// ===================================================================================================
// This section contains the complete user routing logic copied from the original routes/users/
// directory for consolidation into the new modular structure following KISS principles.
//
// Original file: server/routes/users/index.ts
// Copy date: July 9, 2025
// Purpose: Consolidate user routing into single module index.ts
// ===================================================================================================

// Create main users router
const usersRouter = Router();

// Apply authentication middleware to all user routes
usersRouter.use(authenticateUser);

// Mount user module routes
usersRouter.use('/profile', profileRoutes);
usersRouter.use('/management', managementRoutes);
usersRouter.use('/applicant-workflows', applicantWorkflowRoutes);
usersRouter.use('/locations', locationRoutes);

// ===================================================================================================
// END USER ROUTES SECTION
// ===================================================================================================

// Export router as primary export
export { usersRouter };

// Export validation packages (already existing)
export { userProfilePackage } from './validation/userProfilePackage';
export { authProfilePackage } from './validation/authProfilePackage';
export { userRegistrationPackage } from './validation/userRegistrationPackage';

// Export types
export * from './types';