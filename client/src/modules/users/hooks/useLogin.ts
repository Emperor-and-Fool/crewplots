/**
 * Login Hook - UI-focused login logic with toast feedback
 * Coordinates auth service with UI state management
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { AuthService, LoginResponse } from '../services/auth-service';
import { useAuth } from '@/contexts/auth-context';

export type UseLoginResult = {
  login: (username: string, password: string) => Promise<LoginResponse>;
  isLoading: boolean;
};

export const useLogin = (): UseLoginResult => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { setUser } = useAuth(); // TODO: Replace with pure context

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    setIsLoading(true);
    
    try {
      const result = await AuthService.login(username, password);
      
      if (result === false) {
        // Network/system error
        toast({
          title: "Login failed",
          description: "System error. Please try again.",
          variant: "destructive",
        });
        return result;
      } else if (result && 'user' in result) {
        // Success case
        setUser(result.user); // TODO: Use pure context setter
        
        // Handle navigation
        if (result.redirectUrl) {
          if (result.redirectUrl.startsWith('/')) {
            setLocation(result.redirectUrl);
          } else {
            // Handle external redirects or scripts
            window.location.href = result.redirectUrl;
          }
        }
        
        // Invalidate queries for fresh data
        queryClient.invalidateQueries();
        
        return result;
      } else {
        // Authentication failed
        toast({
          title: "Login failed", 
          description: result.error,
          variant: "destructive",
        });
        return result;
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading };
};