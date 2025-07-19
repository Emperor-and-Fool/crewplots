/**
 * useLogout Hook - Clean logout with AuthService integration
 * Handles logout flow using modular AuthService
 */

import { useAuth } from '@/contexts/auth-context';
import { useLocation } from 'wouter';
import { AuthService } from '../services/auth-service';

export const useLogout = () => {
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();

  const logout = async (): Promise<void> => {
    try {
      // Call AuthService logout method (clean JSON API)
      await AuthService.logout();
      
      // Clear user state in context
      setUser(null);
      
      // Navigate to login page using React Router (SPA navigation)
      setLocation('/login');
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even if server logout fails, clear local state and redirect
      setUser(null);
      setLocation('/login');
    }
  };

  return { logout };
};