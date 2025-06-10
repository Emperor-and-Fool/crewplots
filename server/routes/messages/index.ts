import { Router } from 'express';
import { authenticateUser } from '../../middleware/auth';
import notesRoutes from './notes';
import conversationsRoutes from './conversations';

const router = Router();

// Apply authentication middleware to all messaging routes
router.use(authenticateUser);

// Mount sub-routes
router.use('/notes', notesRoutes);
router.use('/conversations', conversationsRoutes);

export default router;