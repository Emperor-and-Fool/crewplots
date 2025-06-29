/**
 * Validation Package Framework - Russian Doll Architecture
 * 
 * This framework validates complete nested objects as single units,
 * eliminating cross-validation complexity between schedule blocks,
 * week schedules, and individual shifts.
 */

import { z } from 'zod';
import type { ScheduleBlock, WeekSchedule, Shift } from './schema';

// Base validation types for individual dolls
export const ScheduleBlockData = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Schedule name required"),
  description: z.string().optional(),
  locationId: z.number().min(1, "Location required"),
  isActive: z.boolean().default(true),
});

export const WeekScheduleData = z.object({
  id: z.number().optional(),
  scheduleBlockId: z.number().optional(), // Will be set by package
  weekNumber: z.number().min(1, "Week number required"),
  templateId: z.number().optional(),
});

export const ShiftData = z.object({
  id: z.number().optional(),
  weekScheduleId: z.number().optional(), // Will be set by package
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format"),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format"),
  position: z.string().min(1, "Position required"),
  title: z.string().min(1, "Shift title required"),
  maxSlots: z.number().min(1, "At least 1 slot required").default(1),
  status: z.enum(['draft', 'open', 'filled', 'cancelled']).default('draft'),
  subscriptionDeadline: z.string().optional(),
});

// The Complete Validation Package
export const ScheduleValidationPackage = z.object({
  // The Big Doll - Schedule Block Metadata
  scheduleBlock: ScheduleBlockData,
  
  // The Middle Dolls - Week Templates
  weekSchedules: z.array(WeekScheduleData).min(1, "At least one week required"),
  
  // The Inner Dolls - Work Assignments
  shifts: z.array(ShiftData).optional().default([]),
  
  // Package Metadata
  packageType: z.enum(['create', 'update', 'duplicate']).default('create'),
  userId: z.number().min(1, "User ID required"),
  
}).refine((data) => {
  // Cross-validation: All week numbers must be unique within the package
  const weekNumbers = data.weekSchedules.map(w => w.weekNumber);
  const uniqueWeeks = new Set(weekNumbers);
  return uniqueWeeks.size === weekNumbers.length;
}, {
  message: "Week numbers must be unique within schedule block",
  path: ["weekSchedules"]
}).refine((data) => {
  // Cross-validation: Shifts must have valid day-time combinations
  const shifts = data.shifts || [];
  for (const shift of shifts) {
    const start = shift.startTime;
    const end = shift.endTime;
    if (start >= end) {
      return false;
    }
  }
  return true;
}, {
  message: "Shift end time must be after start time",
  path: ["shifts"]
});

// Calendar Integration Types for UI
export interface CalendarScheduleData {
  scheduleBlockId: number;
  scheduleBlockName: string;
  locationId: number;
  locationName: string;
  weeks: CalendarWeekData[];
}

export interface CalendarWeekData {
  weekScheduleId: number;
  weekNumber: number;
  dates: CalendarDateData[];
}

export interface CalendarDateData {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  shifts: CalendarShiftData[];
}

export interface CalendarShiftData {
  shiftId: number;
  startTime: string;
  endTime: string;
  position: string;
  maxSlots: number;
  assignedUsers: number; // Count of assigned users
  status: 'draft' | 'open' | 'filled' | 'cancelled';
  canEdit: boolean;
  canAssign: boolean;
}

// Package Assembly Utilities
export class ValidationPackageAssembler {
  static assembleForCreate(
    scheduleBlock: Partial<ScheduleBlock>,
    weekSchedules: Partial<WeekSchedule>[],
    shifts: Partial<Shift>[],
    userId: number
  ) {
    return ScheduleValidationPackage.parse({
      scheduleBlock,
      weekSchedules,
      shifts,
      packageType: 'create',
      userId
    });
  }

  static assembleForUpdate(
    existingScheduleBlockId: number,
    updates: {
      scheduleBlock?: Partial<ScheduleBlock>;
      weekSchedules?: Partial<WeekSchedule>[];
      shifts?: Partial<Shift>[];
    },
    userId: number
  ) {
    return {
      ...updates,
      packageType: 'update',
      userId,
      scheduleBlockId: existingScheduleBlockId
    };
  }

  static assembleForCalendar(
    scheduleBlockId: number,
    startDate: string, // YYYY-MM-DD
    endDate: string    // YYYY-MM-DD
  ): Promise<CalendarScheduleData> {
    // This will fetch and assemble calendar data for UI display
    // Implementation will connect to storage layer
    throw new Error("Calendar assembly not yet implemented");
  }
}

// Type exports for components
export type SchedulePackage = z.infer<typeof ScheduleValidationPackage>;
export type ScheduleBlockPackage = z.infer<typeof ScheduleBlockData>;
export type WeekSchedulePackage = z.infer<typeof WeekScheduleData>;
export type ShiftPackage = z.infer<typeof ShiftData>;