/** Login Hook - Generic LoginForm focused login hook
 * 
 * Coordinates Login Authentication
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query'; 
import { useLocation } from 'wouter';
import { AuthService, LoginResponse } from '../services/auth-service';
import { useAuth } from '@/contexts/auth-context';

  const [user, setUser] = useState<User | null>(null);      // → useLogin hook
  const [isLoading, setIsLoading] = useState(true);         // → useLogin hook  
  const [isLoggingOut, setIsLoggingOut] = useState(false);  // → useLogin hook
  const queryClient = useQueryClient();                     // → useLogin hook

export type UseLoginResult = {
  login: (username: string, password: string) => Promise<LoginResponse>;
  isLoading: boolean;
};

export const useLogin = (): UseLoginResult => {
  const [isLoading, setIsLoading] = useState(false);
  const { login: contextLogin } = useAuth(); // ← From auth-context line 30

  // ✅ PURE: Only wraps context operations, no side effects
  const login = async (username: string, password: string): Promise<LoginResponse> => {
    setIsLoading(true);
    try {
      const result = await AuthService.login(username, password);
      return result;
    } catch (error) {
      console.error('Login operation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };
  return { login, isLoading };
};