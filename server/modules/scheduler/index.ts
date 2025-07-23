//ATTENTION: All routers of 'modules' are TO BE SET in their own index.ts files in the root of each module folder
import express from 'express';
import scheduleBlocksRoutes from './routes/schedule-blocks';
import weekSchedulesRoutes from './routes/week-schedules';
import shiftsRoutes from './routes/shifts';
import requirementsRoutes from './routes/requirements';
import assignmentsRoutes from './routes/assignments';
// 

const router = express.Router();

// Mount all scheduler sub-routes
router.use('/schedule-blocks', scheduleBlocksRoutes);
router.use('/week-schedules', weekSchedulesRoutes);
router.use('/shifts', shiftsRoutes);
router.use('/shift-requirements', requirementsRoutes);
router.use('/shift-assignments', assignmentsRoutes);


export default router;