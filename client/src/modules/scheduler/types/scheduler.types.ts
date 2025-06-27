// Scheduler module UI-specific types
// Extends @shared/schema types for frontend use

import type { WeekSchedule, Shift } from '@shared/schema';

export interface WeekScheduleWithShifts extends WeekSchedule {
  shifts?: Shift[];
  shiftCount?: number;
}

export interface WeekScheduleFormData {
  name: string;
  description?: string;
  locationId: number;
  isActive: boolean;
}

export interface ShiftFormData {
  title: string;
  daysOfWeek: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>;
  startTime: string;
  endTime: string;
  position?: string;
  description?: string;
  competencyRequirements?: Array<{
    competencyId: number;
    requiredCount: number;
    priority: 'required' | 'preferred' | 'optional';
  }>;
}

export interface SchedulerPermissions {
  canCreateShifts: boolean;
  canViewDevelopment: boolean;
  canEditSchedules: boolean;
  canDeleteSchedules: boolean;
}

export interface AutoSaveState {
  isAutoSaving: boolean;
  lastSaved?: Date;
  hasUnsavedChanges: boolean;
  autoSaveError?: string;
}

export interface WeekScheduleEditorState {
  currentWeekSchedule: WeekScheduleWithShifts | null;
  isEditing: boolean;
  autoSave: AutoSaveState;
}