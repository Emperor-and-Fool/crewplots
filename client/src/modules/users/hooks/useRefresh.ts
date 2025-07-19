/**
 * useRefresh Hook - Authentication state refresh with AuthService integration
 * Handles session validation and user data refresh using modular AuthService
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AuthService, AuthResult } from '../services/auth-service';

export type UseRefreshResult = {
  refresh: () => Promise<AuthResult>;
  isRefreshing: boolean;
};

export const useRefresh = (): UseRefreshResult => {
  const { setUser } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async (): Promise<AuthResult> => {
    setIsRefreshing(true);
    
    try {
      // Call AuthService with unified refresh method
      const result = await AuthService.refresh();
      
      // Update auth context based on refresh result
      if (result.success && result.user) {
        setUser(result.user);
        return result;
      } else {
        // Session invalid or expired - clear local state
        setUser(null);
        return result;
      }
    } catch (error) {
      console.error('Refresh operation failed:', error);
      // Clear local state on refresh failure
      setUser(null);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refresh failed'
      };
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refresh, isRefreshing };
};