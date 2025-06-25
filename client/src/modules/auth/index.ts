// Auth Module - Centralized exports

// Types
export * from './types/auth-ui.types';

// Hooks
export { useAuthForms } from './hooks/useAuthForms';
export { useAuthValidation } from './hooks/useAuthValidation';
export { useAuthState } from './hooks/useAuthState';

// Services
export { AuthFormService } from './services/authFormService';
export { AuthValidationService } from './services/authValidationService';

// Components
export { LoginForm, RegistrationForm } from './components/forms';
export { AuthDevelopmentTools } from './components/utils';
export { AuthPageLayout } from './components/layouts';
export { LoginPage, RegistrationPage } from './pages';

// Compatibility re-exports for gradual migration
export { useAuth } from '@/hooks/use-auth';