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
      // Call AuthService logout method
      await AuthService.logout();
      
      // Clear user state in context
      setUser(null);
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even if server logout fails, clear local state
      setUser(null);
    }
  };

  return { logout };
};