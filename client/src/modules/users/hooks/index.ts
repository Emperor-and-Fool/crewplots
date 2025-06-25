/**
 * User Module - Hook Exports
 * 
 * Central export hub for all user module hooks. Provides a clean interface
 * for importing user-related functionality while maintaining separation of concerns.
 */

export { useUserManagement } from './useUserManagement';
export { useApplicantManagement } from './useApplicantManagement';
export { useUserProfile } from './useUserProfile';

// Re-export existing auth hook for convenience (maintains compatibility)
export { useAuth } from '@/modules/auth';

// Type exports for hook consumers
export type {
  UserListFilters,
  UserListState,
  ApplicantListFilters,
  ApplicantStatusUpdate,
  ProfileEditState
} from '../types';