/**
 * useLogout Hook - Clean logout with AuthService integration
 * Handles logout flow using modular AuthService
 */

import { useAuth } from '@/contexts/auth-context';
import { AuthService } from '../services/auth-service';

export const useLogout = () => {
  const { setUser } = useAuth();

  const logout = async (): Promise<void> => {
    try {
      // Call AuthService logout method (uses dev-logout route)
      await AuthService.logout();
      
      // Clear user state in context
      setUser(null);
      
      // Navigate to login page (matching legacy behavior)
      window.location.href = '/login';
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even if server logout fails, clear local state and redirect
      setUser(null);
      window.location.href = '/login';
    }
  };

  return { logout };
};