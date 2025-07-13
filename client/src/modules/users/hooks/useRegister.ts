/**
 * Register Hook - Registration logic with validation and feedback
 * Handles user registration with UI state management
 */

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AuthService } from '../services/auth-service';
import { Register } from '@shared/schema';

export type UseRegisterResult = {
  register: (userData: Register) => Promise<boolean>;
  isLoading: boolean;
};

export const useRegister = (): UseRegisterResult => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const register = async (userData: Register): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const result = await AuthService.register(userData);
      
      if (result.success) {
        toast({
          title: "Registration successful",
          description: "Your account has been created. You can now login.",
        });
        return true;
      } else {
        toast({
          title: "Registration failed",
          description: result.error || "Unable to create account",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { register, isLoading };
};