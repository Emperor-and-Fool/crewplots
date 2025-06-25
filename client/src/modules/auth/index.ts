// Auth Module - Centralized exports
// TODO: Will export all auth components and hooks when implemented

// Types
export * from './types/auth-ui.types';

// Hooks (skeleton implementations)
export { useAuthForms } from './hooks/useAuthForms';
export { useAuthValidation } from './hooks/useAuthValidation';
export { useAuthState } from './hooks/useAuthState';

// Services (skeleton implementations)
export { AuthFormService } from './services/authFormService';
export { AuthValidationService } from './services/authValidationService';

// Components (to be implemented in Phase 2)
// export { LoginForm, RegistrationForm } from './components/forms';
// export { AuthDevelopmentTools } from './components/utils';
// export { LoginPage, RegistrationPage } from './pages';

// Compatibility re-exports for gradual migration
// Maintaining old import paths during transition
export { useAuth } from '@/hooks/use-auth';