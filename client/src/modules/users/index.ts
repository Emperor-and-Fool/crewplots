// User Module - Centralized user management
// Encompasses authentication, profiles, applicants, and staff management

// Types
export type * from './types/user.types';
export type * from './types/applicant.types';
export type * from './types/auth.types';

// Hooks  
export { useUser } from './hooks/useUser';
export { useAuth } from './hooks/useAuth';
export { useApplicants } from './hooks/useApplicants';
export { useUserProfile } from './hooks/useUserProfile';

// Components
export { UserProfile } from './components/UserProfile';
export { ApplicantForm } from './components/ApplicantForm';
export { ApplicantCard } from './components/ApplicantCard';
export { UserSettings } from './components/UserSettings';

// Services
export { UserService } from './services/UserService';
export { ApplicantService } from './services/ApplicantService';

// Module version
export const USER_MODULE_VERSION = '1.0.0';