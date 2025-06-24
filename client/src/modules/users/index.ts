// User Module - Centralized user management
// Encompasses authentication, profiles, applicants, and staff management

// Types
export type * from './types/user.types';
export type * from './types/applicant.types';
export type * from './types/auth.types';
export type * from './types/permissions.types';

// Hooks  
export { useAuth } from './hooks/useAuth';
export { useApplicants, useApplicantDetail, useApplicantStats } from './hooks/useApplicants';
export { useUserProfile, useUsers } from './hooks/useUserProfile';
export { useUserPermissions, useWorkflowPermissions, PermissionGuard, RoleGuard } from './hooks/useUserPermissions';

// Components (to be implemented in later phases)
// export { UserProfile } from './components/UserProfile';
// export { ApplicantForm } from './components/ApplicantForm';
// export { ApplicantCard } from './components/ApplicantCard';
// export { UserSettings } from './components/UserSettings';

// Services (to be implemented in later phases)
// export { UserService } from './services/UserService';
// export { ApplicantService } from './services/ApplicantService';

// Module version
export const USER_MODULE_VERSION = '1.0.0';