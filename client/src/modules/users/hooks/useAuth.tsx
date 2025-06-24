// User Module - Authentication Hook
// Migrated from hooks/use-auth.ts

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  AuthState, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse,
  UseAuthReturn,
  UserPermissions,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordRequest
} from '../types/auth.types';
import type { User, UserRole } from '../types/user.types';

// Import existing auth functionality to preserve it during migration
import { useAuth as useExistingAuth } from '@/hooks/use-auth';

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient();
  
  // Preserve existing auth implementation during migration
  const existingAuth = useExistingAuth();
  
  // Auth state query
  const { data: authData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) {
          return { user: null, isAuthenticated: false };
        }
        throw new Error('Failed to fetch auth state');
      }
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const authState: AuthState = {
    user: authData?.user || null,
    isAuthenticated: authData?.isAuthenticated || false,
    isLoading,
    error: error?.message || null
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData): Promise<AuthResponse> => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  // Password reset mutations
  const resetPasswordMutation = useMutation({
    mutationFn: async (request: PasswordResetRequest): Promise<AuthResponse> => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed');
      }
      return data;
    }
  });

  const confirmPasswordResetMutation = useMutation({
    mutationFn: async (data: PasswordResetConfirm): Promise<AuthResponse> => {
      const response = await fetch('/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Password reset confirmation failed');
      }
      return result;
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (request: ChangePasswordRequest): Promise<AuthResponse> => {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        credentials: 'include'
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Password change failed');
      }
      return data;
    }
  });

  // Permission calculations
  const permissions: UserPermissions = {
    canViewDashboard: authState.user?.role !== 'applicant',
    canManageUsers: ['manager', 'administrator'].includes(authState.user?.role || ''),
    canManageApplicants: ['manager', 'administrator'].includes(authState.user?.role || ''),
    canManageLocations: ['manager', 'administrator'].includes(authState.user?.role || ''),
    canManageSchedules: ['manager', 'administrator'].includes(authState.user?.role || ''),
    canViewReports: ['manager', 'administrator'].includes(authState.user?.role || ''),
    canManageSettings: authState.user?.role === 'administrator',
    canAccessAdmin: authState.user?.role === 'administrator'
  };

  // Helper functions
  const checkPermission = useCallback((permission: keyof UserPermissions): boolean => {
    return permissions[permission];
  }, [permissions]);

  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!authState.user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(authState.user.role);
  }, [authState.user]);

  const refreshUser = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  // API functions
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return loginMutation.mutateAsync(credentials);
  }, [loginMutation]);

  const logout = useCallback(async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
    return registerMutation.mutateAsync(data);
  }, [registerMutation]);

  const resetPassword = useCallback(async (request: PasswordResetRequest): Promise<AuthResponse> => {
    return resetPasswordMutation.mutateAsync(request);
  }, [resetPasswordMutation]);

  const confirmPasswordReset = useCallback(async (data: PasswordResetConfirm): Promise<AuthResponse> => {
    return confirmPasswordResetMutation.mutateAsync(data);
  }, [confirmPasswordResetMutation]);

  const changePassword = useCallback(async (request: ChangePasswordRequest): Promise<AuthResponse> => {
    return changePasswordMutation.mutateAsync(request);
  }, [changePasswordMutation]);

  return {
    authState,
    login,
    logout,
    register,
    resetPassword,
    confirmPasswordReset,
    changePassword,
    checkPermission,
    hasRole,
    refreshUser,
    permissions,
    isAdmin: hasRole('administrator'),
    isManager: hasRole(['manager', 'administrator']),
    isCrew: hasRole(['crew', 'manager', 'administrator']),
    isApplicant: hasRole('applicant')
  };
}