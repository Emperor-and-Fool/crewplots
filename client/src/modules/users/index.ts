/**
 * User Module - Main Export Hub
 * 
 * Central export interface for the complete user module. This file provides
 * a clean API for consuming the user module from other parts of the application
 * while maintaining internal organization and encapsulation.
 */

// Type exports - maintain schema-first architecture
export type { 
  User, 
  InsertUser
} from '@shared/schema';

export type {
  UserFormState,
  UserListFilters,
  UserListState,
  ProfileEditState,
  UserCreationWizardState,
  UserAuthUIState,
  UserPermissionsState,
  ApplicantFormWizardState,
  ApplicantFormStep,
  ApplicantListFilters,
  ApplicantListState,
  ApplicantDetailState,
  ApplicantTimelineEvent,
  ApplicantStatusUpdate,
  ApplicantBulkOperation,
  UserModuleUIState
} from './types';

// Hook exports - business logic layer
export {
  useUserManagement,
  useApplicantManagement,
  useUserProfile,
  useAuth
} from './hooks';

// Component exports - UI layer
export {
  UserCard,
  UserList,
  ApplicantCard
} from './components';

// Page exports - User-related pages
export {
  Profile,
  ProfileEdit,
  UserSettings,
  CrewManagement,
  CrewMemberProfile,
  ApplicantPortal
} from './pages';

// Utility exports
export {
  isApplicant,
  isStaff,
  isAdmin
} from './types';

// Module configuration
const UserModuleConfigData = {
  version: '1.0.0',
  features: {
    enableRegistration: true,
    enableProfileEditing: true,
    enableApplicantNotes: true,
    enableBulkOperations: true,
  },
  validation: {
    passwordMinLength: 8,
    requireEmailVerification: false,
    allowDuplicateEmails: false,
  },
  ui: {
    defaultPageSize: 20,
    enableAdvancedFilters: true,
    showUserTimeline: true,
  }
};

export { UserModuleConfigData as UserModuleConfig };

// Module metadata
export const UserModuleInfo = {
  name: 'User Management Module',
  description: 'Comprehensive user management system with authentication, profiles, and applicant management',
  version: '1.0.0',
  dependencies: [
    '@shared/schema',
    '@tanstack/react-query',
    'react-hook-form',
    'zod'
  ],
  integrations: [
    'messaging-module', // For applicant notes
    'location-module',  // For location-based filtering
    'navigation-system' // For role-based navigation
  ]
};