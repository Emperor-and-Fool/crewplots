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
// Legacy LoginForm and LoginPage moved to .bak - using modular users module instead
// RegistrationForm and RegistrationPage migrated to users module
export { AuthDevelopmentTools } from './components/utils/AuthDevelopmentTools';
export { AuthPageLayout } from './components/layouts/AuthPageLayout';

// Compatibility re-exports for gradual migration
export { useAuth } from '@/hooks/use-auth';