import { LoginFormState, RegistrationFormState } from '../types/auth-ui.types';

export const useAuthForms = () => {
  // TODO: Extract form logic from auth-context
  
  const useLoginForm = () => {
    // TODO: Extract login form logic
    return {
      formState: null as LoginFormState | null,
      submitForm: async () => {},
      resetForm: () => {},
      isSubmitting: false
    };
  };

  const useRegistrationForm = () => {
    // TODO: Extract registration form logic
    return {
      formState: null as RegistrationFormState | null,
      submitForm: async () => {},
      resetForm: () => {},
      isSubmitting: false
    };
  };

  return { 
    useLoginForm,
    useRegistrationForm
  };
};