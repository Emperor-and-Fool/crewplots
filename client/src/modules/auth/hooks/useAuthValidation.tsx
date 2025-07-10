import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export interface RegistrationData {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
}

export interface ValidationResult {
  success: boolean;
  result?: {
    overall: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
  };
  pattern?: string;
  metadata?: {
    operation: string;
    entityType: string;
    timestamp: string;
    publicEndpoint: boolean;
  };
}

/**
 * VE30 Registration Validation Hook
 * 
 * Uses ValidationEngine30 public endpoint for user registration validation
 * without requiring authentication. Validates user data before submitting
 * to auth-routes for password hashing and database creation.
 * 
 * Based on Plan 057 hybrid architecture: validation through VE30,
 * creation through auth-routes.
 */
export const useAuthValidation = () => {
  const { toast } = useToast();

  const validateRegistrationMutation = useMutation({
    mutationFn: async (data: RegistrationData): Promise<ValidationResult> => {
      const response = await fetch('/api/validation/v3/public', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'create',
          entityType: 'userRegistration',
          data: data
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onError: (error) => {
      console.error('🚨 VALIDATION ERROR:', error);
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Unknown validation error",
        variant: "destructive",
      });
    }
  });

  const validateRegistration = async (data: RegistrationData): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> => {
    try {
      const result = await validateRegistrationMutation.mutateAsync(data);
      
      if (result.success && result.result?.overall) {
        return {
          isValid: result.result.overall.isValid,
          errors: result.result.overall.errors || [],
          warnings: result.result.overall.warnings || []
        };
      } else {
        // Handle validation failure response
        return {
          isValid: false,
          errors: result.result?.overall?.errors || ['Validation failed'],
          warnings: result.result?.overall?.warnings || []
        };
      }
    } catch (error) {
      console.error('🚨 VALIDATION MUTATION ERROR:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation request failed'],
        warnings: []
      };
    }
  };

  return {
    validateRegistration,
    isValidating: validateRegistrationMutation.isPending,
    validationError: validateRegistrationMutation.error
  };
};

/**
 * Hook for real-time field validation during form input
 * Provides debounced validation for immediate user feedback
 */
export const useRealtimeValidation = () => {
  const { validateRegistration } = useAuthValidation();

  const validateField = async (fieldName: keyof RegistrationData, value: string, formData: Partial<RegistrationData>) => {
    // Only validate if we have enough data
    if (!value || value.length < 2) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const testData: RegistrationData = {
      username: formData.username || 'test',
      password: formData.password || 'TestPass123',
      confirmPassword: formData.confirmPassword || 'TestPass123',
      email: formData.email || 'test@example.com',
      firstName: formData.firstName || 'Test',
      lastName: formData.lastName || 'User',
      phoneNumber: formData.phoneNumber || '+31 612345678',
      address: formData.address || 'Test Address',
      ...formData,
      [fieldName]: value
    };

    const result = await validateRegistration(testData);
    
    // Filter errors to only show those related to the specific field
    const fieldErrors = result.errors.filter(error => 
      error.toLowerCase().includes(fieldName.toLowerCase()) ||
      (fieldName === 'username' && error.includes('Username')) ||
      (fieldName === 'email' && error.includes('email')) ||
      (fieldName === 'phoneNumber' && error.includes('Phone'))
    );

    return {
      isValid: fieldErrors.length === 0,
      errors: fieldErrors,
      warnings: result.warnings
    };
  };

  return { validateField };
};