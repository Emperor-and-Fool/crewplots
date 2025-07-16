/**
 * Login Hook - UI-focused login logic with toast feedback
 * Coordinates auth service with UI state management
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query'; 
import { useLocation } from 'wouter';
import { AuthService, LoginResponse } from '../services/auth-service';
import { useAuth } from '@/contexts/auth-context';

export type UseLoginResult = {
  login: (username: string, password: string) => Promise<LoginResponse>;
  isLoading: boolean;
};

  // ✅ PURE: Only wraps context operations, no side effects
  const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
      const result = await contextLogin(username, password);
      return result;
    } catch (error) {
      console.error('Login operation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  };
  return { login, isLoading };
};