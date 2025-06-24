/**
 * User Module - Type Exports
 * 
 * Central export hub for all user module types. This file provides a clean
 * interface for importing user-related types while maintaining the schema-first
 * architecture by re-exporting canonical types from @shared/schema.
 */

// Re-export canonical schema types (single source of truth)
export type { 
  User, 
  InsertUser, 
  SelectUser,
  // Add any other user-related schema types as needed
} from '@shared/schema';

// Export module-specific UI type extensions
export * from './user-ui.types';
export * from './applicant-ui.types';

// Type guards and utilities for user operations
export const isApplicant = (user: User): boolean => user.role === 'applicant';
export const isStaff = (user: User): boolean => ['crew_member', 'manager', 'administrator'].includes(user.role);
export const isAdmin = (user: User): boolean => ['manager', 'administrator'].includes(user.role);

// Common type predicates for UI state
export type UserModuleUIState = 
  | 'loading'
  | 'ready'
  | 'editing'
  | 'submitting'
  | 'error';

// Module-wide configuration types
export interface UserModuleConfig {
  features: {
    enableRegistration: boolean;
    enableProfileEditing: boolean;
    enableApplicantNotes: boolean;
    enableBulkOperations: boolean;
  };
  validation: {
    passwordMinLength: number;
    requireEmailVerification: boolean;
    allowDuplicateEmails: boolean;
  };
  ui: {
    defaultPageSize: number;
    enableAdvancedFilters: boolean;
    showUserTimeline: boolean;
  };
}