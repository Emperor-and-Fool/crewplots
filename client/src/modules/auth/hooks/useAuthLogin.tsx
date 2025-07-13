import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema, type Login, type Register } from '@shared/schema';
import { useAuthOperations } from './useAuthOperations';
import { useMutation } from '@tanstack/react-query';
import { AuthLoginService } from '../services/authLoginService';
// import { LoginFormState, RegistrationFormState } from '../types/auth-ui.types';

/**
 * Auth Forms Hook
 * 
 * Provides form-specific logic and state management for authentication forms.
 * Integrates with useAuthOperations for actual authentication operations.
 */
export const useAuthLogin = () => {
  const authOps = useAuthOperations();

  /**
   * Login Form Hook
   */
  const useLoginForm = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<Login>({
      resolver: zodResolver(loginSchema),
      defaultValues: {
        username: "",
        password: "",
      },
    });

    const onSubmit = async (data: Login) => {
      setIsSubmitting(true);
      try {
        const success = await authOps.login(data.username, data.password);
        if (!success) {
          form.setError('root', { 
            type: 'manual', 
            message: 'Invalid username or password' 
          });
        }
        return success;
      } catch (error) {
        form.setError('root', { 
          type: 'manual', 
          message: error instanceof Error ? error.message : 'Login failed' 
        });
        return false;
      } finally {
        setIsSubmitting(false);
      }
    };

    const resetForm = () => {
      form.reset();
      form.clearErrors();
    };

    return {
      form,
      onSubmit,
      resetForm,
      isSubmitting,
      formErrors: form.formState.errors,
    };
  };

  /**
   * Registration Form Hook
   */
  const useRegistrationForm = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<Register>({
      resolver: zodResolver(registerSchema),
      defaultValues: {
        username: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        address: "",
      },
    });

    const onSubmit = async (data: Register) => {
      setIsSubmitting(true);
      try {
        const success = await authOps.register(data);
        if (!success) {
          form.setError('root', { 
            type: 'manual', 
            message: 'Registration failed. Please try again.' 
          });
        }
        return success;
      } catch (error) {
        form.setError('root', { 
          type: 'manual', 
          message: error instanceof Error ? error.message : 'Registration failed' 
        });
        return false;
      } finally {
        setIsSubmitting(false);
      }
    };

    const resetForm = () => {
      form.reset();
      form.clearErrors();
    };

    return {
      form,
      onSubmit,
      resetForm,
      isSubmitting,
      formErrors: form.formState.errors,
    };
  };

  /**
   * Form state utilities
   */
  const getFormStates = () => {
    return {
      login: {
        isLoading: false, // Will be implemented when forms are connected
        errors: {},
        isValid: true,
      },
      registration: {
        isLoading: false,
        errors: {},
        isValid: true,
      },
    };
  };

  return {
    // Form hooks
    useLoginForm,
    useRegistrationForm,
    
    // State utilities
    getFormStates,
  };
};

/**
 * CLEAN SEPARATION: useLogin Hook
 * Handles all async/business logic for login
 */
export const useLogin = () => {
  // CLEAN SEPARATION: Hook handles all async/business logic
  const { mutate: newLogin, isLoading: newIsLoading } = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      try {
        const result = await AuthLoginService.login(data.username, data.password);
        // Handle all business logic here
        // Call page callbacks for UI updates if needed
        return result;
      } catch (error) {
        // Handle errors in hook
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log("🔍 LOGIN SUCCESS:", result);
    },
    onError: (error) => {
      console.error("🔍 LOGIN ERROR:", error);
    },
  });

  return {
    newLogin,
    newIsLoading,
  };

  /* COMMENTED OUT MIXED CONCERNS VERSION THAT WAS IN PAGE:
  const result = await newLogin(data.username, data.password);
  if (result) {
    handleLoginSuccess(result);
  }
  */
};

export type AuthForms = ReturnType<typeof useAuthLogin>;