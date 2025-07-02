import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth';
import profileRoutes from './profile';
import managementRoutes from './management';
import applicantWorkflowRoutes from './applicant-workflows';

const userRoutes = Router();

// Apply authentication middleware to all user routes
userRoutes.use(authenticateUser);

// Mount user module routes
userRoutes.use('/profile', profileRoutes);
userRoutes.use('/management', managementRoutes);
userRoutes.use('/applicant-workflows', applicantWorkflowRoutes);

export default userRoutes;