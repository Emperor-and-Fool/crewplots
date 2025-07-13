/**
 * Auth Session Hook - Session validation and management
 * Handles session checking, cookie validation, and auth state persistence
 */

import { useState, useEffect } from 'react';
import { AuthService } from '../services/auth-service';
import { User } from '@shared/schema';
import { useAuth } from '@/contexts/auth-context';

export type UseAuthSessionResult = {
  checkAuthSession: () => Promise<void>;
  clearGhostCookies: () => void;
};

export const useAuthSession = (): UseAuthSessionResult => {
  const { setUser } = useAuth(); // TODO: Replace with pure context

  const checkAuthSession = async (): Promise<void> => {
    // Skip auth check on login page
    if (window.location.pathname === '/login') {
      return;
    }

    // Check if any session cookies exist before making auth request
    const hasCookies = document.cookie.includes('connect.sid') || 
                      document.cookie.includes('session') ||
                      document.cookie.length > 0;

    if (!hasCookies) {
      // No session cookies present - user needs to login
      setUser(null); // TODO: Use pure context setter
      return;
    }

    const result = await AuthService.checkAuth();
    
    if (result.success && result.user) {
      setUser(result.user); // TODO: Use pure context setter
    } else {
      setUser(null); // TODO: Use pure context setter
      
      // Clear ghost cookies if session is invalid
      clearGhostCookies();
    }
  };

  const clearGhostCookies = (): void => {
    document.cookie = 'connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  };

  return { checkAuthSession, clearGhostCookies };
};