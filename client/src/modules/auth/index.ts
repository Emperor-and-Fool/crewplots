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

// Component exports
export { LoginForm } from './components/forms/LoginForm';
export { RegistrationForm } from './components/forms/RegistrationForm';
export { AuthDevelopmentTools } from './components/utils/AuthDevelopmentTools';
export { AuthPageLayout } from './components/layouts/AuthPageLayout';
export { LoginPage } from './pages/LoginPage';
export { RegistrationPage } from './pages/RegistrationPage';

// Compatibility re-exports for gradual migration
export { useAuth } from '@/hooks/use-auth';