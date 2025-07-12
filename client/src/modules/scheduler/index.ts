// Scheduler Module Exports
// Centralized exports following modular architecture pattern

// Components
export { default as WeekScheduleEditor } from './components/WeekScheduleEditor';
export { default as ShiftCreationPanel } from './components/ShiftCreationPanel';
export { default as WeeklyCalendarPreview } from './components/WeeklyCalendarPreview';

// Pages
export { default as ShiftCreationPage } from './pages/ShiftCreationPage';
export { default as SchedulerListPage } from './pages/SchedulerListPage';
export { default as SchedulerEditPage } from './pages/SchedulerEditPage';
export { default as ViewCalendar } from './pages/ViewCalendar';

// Hooks
export { 
  useWeekSchedules,
  useWeekSchedule, 
  useWeekScheduleShifts,
  useCreateWeekSchedule,
  useUpdateWeekSchedule,
  useCreateShift,
  useUpdateShift,
  useDeleteShift
} from './hooks/useSchedulerData';
export { useSchedulerPermissions } from './hooks/useSchedulerPermissions';
export { useSchedulerActions } from './hooks/useSchedulerActions';

// Types
export type * from './types/scheduler.types';