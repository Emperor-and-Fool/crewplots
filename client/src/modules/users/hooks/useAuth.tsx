// useAuth hook - Authentication state management
// Extracted from existing auth context and enhanced

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { AuthUser, LoginCredentials, RegisterData, AuthState } from '../types/auth.types';

export function useAuth() {
  const { toast } = useToast();
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setAuthState({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to check authentication status'
      });
    }
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials): Promise<AuthUser> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      const userData = await response.json();
      
      setAuthState({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        lastLoginDate: new Date().toISOString()
      });
      
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${userData.username}`,
        duration: 3000
      });
      
      return userData;
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 4000
      });
      
      throw error;
    }
  };

  // Register function
  const register = async (data: RegisterData): Promise<AuthUser> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      
      const userData = await response.json();
      
      setAuthState({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      toast({
        title: 'Account created!',
        description: `Welcome ${userData.username}`,
        duration: 3000
      });
      
      return userData;
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      toast({
        title: 'Registration failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 4000
      });
      
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
        duration: 3000
      });
    } catch (error) {
      // Even if logout fails on server, clear local state
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    await checkAuth();
  };

  // Check permission
  const checkPermission = (permission: string, workflow?: string): boolean => {
    if (!authState.user) return false;
    
    // Administrator has all permissions
    if (authState.user.role === 'administrator') return true;
    
    // Check workflow-specific permissions
    if (workflow && authState.user.permissions) {
      return authState.user.permissions.includes(`${workflow}:${permission}`);
    }
    
    // Check general permissions
    return authState.user.permissions?.includes(permission) || false;
  };

  // Initialize auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...authState,
    login,
    register,
    logout,
    refreshUser,
    checkPermission,
    
    // Utility functions
    isAdmin: authState.user?.role === 'administrator',
    isManager: authState.user?.role === 'manager',
    isApplicant: authState.user?.role === 'applicant',
    hasRole: (role: string) => authState.user?.role === role
  };
}