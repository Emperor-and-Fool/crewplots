import { Router } from 'express';
import notesRoutes from './notes';
import conversationsRoutes from './conversations';

const router = Router();

// Mount sub-routes
router.use('/notes', notesRoutes);
router.use('/conversations', conversationsRoutes);

export default router;