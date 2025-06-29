import express from 'express';
import scheduleBlocksRoutes from './schedule-blocks';
import weekSchedulesRoutes from './week-schedules';
import shiftsRoutes from './shifts';
import requirementsRoutes from './requirements';
import assignmentsRoutes from './assignments';

const router = express.Router();

// Mount all scheduler sub-routes
router.use('/schedule-blocks', scheduleBlocksRoutes);
router.use('/week-schedules', weekSchedulesRoutes);
router.use('/shifts', shiftsRoutes);
router.use('/shift-requirements', requirementsRoutes);
router.use('/shift-assignments', assignmentsRoutes);

export default router;