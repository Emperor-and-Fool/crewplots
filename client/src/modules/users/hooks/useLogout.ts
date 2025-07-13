/**
 * Logout Hook - Clean logout with navigation and cleanup
 * Handles optimistic logout with background server cleanup
 */

import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { AuthService } from '../services/auth-service';
import { useAuth } from '@/contexts/auth-context';

export type UseLogoutResult = {
  logout: () => Promise<void>;
};

export const useLogout = (): UseLogoutResult => {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { setUser } = useAuth(); // TODO: Replace with pure context

  const logout = async (): Promise<void> => {
    // Phase 1: Immediate optimistic logout
    setUser(null); // TODO: Use pure context setter
    queryClient.clear();
    
    // Set logout success flag for login page
    sessionStorage.setItem('logout-success', 'true');
    
    // Navigate immediately to login page
    setLocation('/login');
    
    // Phase 2: Background server cleanup (fire and forget)
    AuthService.logout();
  };

  return { logout };
};