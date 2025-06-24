// User Module - User Profile Management Hook

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { User, UserProfile, UserSettings, UserUpdateInput } from '../types/user.types';

export interface UseUserProfileConfig {
  userId?: number;
}

export interface UseUserProfileReturn {
  // Profile data
  profile: UserProfile | null;
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  
  // Profile operations
  updateProfile: (data: UserUpdateInput) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  
  // Settings operations  
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  
  // Utility
  refetch: () => Promise<any>;
}

export function useUserProfile(config: UseUserProfileConfig = {}): UseUserProfileReturn {
  const queryClient = useQueryClient();
  const { userId } = config;

  // Profile query
  const { 
    data: profileData, 
    isLoading: profileLoading, 
    error: profileError, 
    refetch: refetchProfile 
  } = useQuery({
    queryKey: userId ? ['/api/users/profile', userId] : ['/api/auth/profile'],
    queryFn: async (): Promise<UserProfile> => {
      const url = userId ? `/api/users/${userId}/profile` : '/api/auth/profile';
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Settings query
  const { 
    data: settingsData, 
    isLoading: settingsLoading, 
    error: settingsError,
    refetch: refetchSettings 
  } = useQuery({
    queryKey: userId ? ['/api/users/settings', userId] : ['/api/auth/settings'],
    queryFn: async (): Promise<UserSettings> => {
      const url = userId ? `/api/users/${userId}/settings` : '/api/auth/settings';
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UserUpdateInput) => {
      const url = userId ? `/api/users/${userId}/profile` : '/api/auth/profile';
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.append('avatar', file);

      const url = userId ? `/api/users/${userId}/avatar` : '/api/auth/avatar';
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload avatar');
      }

      const result = await response.json();
      return result.avatarUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      const url = userId ? `/api/users/${userId}/settings` : '/api/auth/settings';
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update settings');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/settings'] });
    }
  });

  // API functions
  const updateProfile = useCallback(async (data: UserUpdateInput): Promise<void> => {
    await updateProfileMutation.mutateAsync(data);
  }, [updateProfileMutation]);

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    return uploadAvatarMutation.mutateAsync(file);
  }, [uploadAvatarMutation]);

  const updateSettings = useCallback(async (settings: Partial<UserSettings>): Promise<void> => {
    await updateSettingsMutation.mutateAsync(settings);
  }, [updateSettingsMutation]);

  const refetch = useCallback(async () => {
    await Promise.all([refetchProfile(), refetchSettings()]);
  }, [refetchProfile, refetchSettings]);

  return {
    profile: profileData || null,
    settings: settingsData || null,
    isLoading: profileLoading || settingsLoading,
    error: profileError?.message || settingsError?.message || null,
    updateProfile,
    uploadAvatar,
    updateSettings,
    refetch
  };
}

// Hook for user list (admin/manager use)
export function useUsers(filters?: { role?: string; status?: string; search?: string }) {
  const queryParams = new URLSearchParams();
  if (filters?.role) queryParams.set('role', filters.role);
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.search) queryParams.set('search', filters.search);

  return useQuery({
    queryKey: ['/api/users', queryParams.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/users?${queryParams}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}