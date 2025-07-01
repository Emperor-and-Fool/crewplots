/**
 * Scheduler Validation Module
 * 
 * This module contains validation packages extracted from 
 * server/services/validation-package-service.ts for use with
 * the unified validation engine.
 * 
 * Each package contains:
 * - Schema validation
 * - Permission requirements
 * - Business rule validation  
 * - Package assembly logic
 */

// Package exports
export { scheduleBlockPackage } from './packages/scheduleBlockPackage';
export { weekSchedulePackage } from './packages/weekSchedulePackage';
export { shiftPackage } from './packages/shiftPackage';

// Business rules
export { SchedulerBusinessRules } from './rules/businessRules';

// Type exports
export type { ScheduleBlockData, ScheduleBlockPackage } from './packages/scheduleBlockPackage';
export type { WeekScheduleData, WeekSchedulePackage } from './packages/weekSchedulePackage';
export type { ShiftData, ShiftPackage } from './packages/shiftPackage';
export type { ValidationContext, BusinessRuleResult } from './rules/businessRules';

// Package registry for unified validation engine
export const schedulerValidationPackages = {
  scheduleBlock: scheduleBlockPackage,
  weekSchedule: weekSchedulePackage,
  shift: shiftPackage
} as const;

export type SchedulerEntityType = keyof typeof schedulerValidationPackages;