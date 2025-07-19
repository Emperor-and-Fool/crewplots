/**
 * useLogout Hook - Clean logout with AuthService integration
 * Handles logout flow using modular AuthService
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from 'wouter';
import { AuthService, LogoutOptions, LogoutResult } from '../services/auth-service';

export type UseLogoutResult = {
  logout: (options?: LogoutOptions) => Promise<LogoutResult>;
  isLoggingOut: boolean;
};

export const useLogout = (): UseLogoutResult => {
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async (options: LogoutOptions = {}): Promise<LogoutResult> => {
    setIsLoggingOut(true);
    
    try {
      // Call AuthService with role-based logout options
      const result = await AuthService.logout(options);
      
      // Always clear user state locally (regardless of server response)
      setUser(null);
      
      // Handle different logout results
      if (result.success) {
        // For HTML logout, redirect is handled by AuthService
        if (!options.forceHtml) {
          // For JSON logout, use SPA navigation
          setLocation(result.redirectUrl || '/login');
        }
        return result;
      } else {
        // Server logout failed, but still clear local state
        console.warn('Server logout failed, proceeding with local cleanup:', result.error);
        setLocation('/login');
        return result;
      }
    } catch (error) {
      console.error('Logout operation failed:', error);
      // Failsafe: clear local state and redirect even on complete failure
      setUser(null);
      setLocation('/login');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      };
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
};