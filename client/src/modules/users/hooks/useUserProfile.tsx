/**
 * User Module - User Profile Hook
 * 
 * Hook for user profile operations including viewing, editing, and profile-specific
 * functionality. Integrates with existing authentication context.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/modules/auth';
import type { User, InsertUser } from '@shared/schema';
import type { ProfileEditState } from '../types';

export function useUserProfile(userId?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  // Use current user ID if none provided
  const targetUserId = userId || currentUser?.id;

  // Profile query - uses existing /api/profile endpoint for current user
  const {
    data: profile,
    isLoading,
    error
  } = useQuery<User>({
    queryKey: targetUserId === currentUser?.id ? ['/api/profile'] : ['/api/users', targetUserId],
    queryFn: async () => {
      const endpoint = targetUserId === currentUser?.id ? '/api/profile' : `/api/users/${targetUserId}`;
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!targetUserId
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<InsertUser>) => {
      const endpoint = targetUserId === currentUser?.id ? '/api/profile' : `/api/users/${targetUserId}`;
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData)
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: (updatedProfile) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      toast({ 
        title: 'Profile updated', 
        description: 'Your profile information has been saved successfully.' 
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update profile', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  // Change password mutation (for current user only)
  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { 
      currentPassword: string; 
      newPassword: string; 
    }) => {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: 'Password changed', 
        description: 'Your password has been updated successfully.' 
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to change password', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  // Upload profile picture mutation
  const uploadProfilePictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      const response = await fetch('/api/profile/picture', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload profile picture');
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({ 
        title: 'Profile picture updated', 
        description: 'Your profile picture has been uploaded successfully.' 
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to upload picture', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  // Delete account mutation (with confirmation)
  const deleteAccountMutation = useMutation({
    mutationFn: async ({ password, confirmation }: { 
      password: string; 
      confirmation: string; 
    }) => {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password, confirmation })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete account');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: 'Account deleted', 
        description: 'Your account has been permanently deleted.' 
      });
      // Redirect to login or home page
      window.location.href = '/';
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete account', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  // Utility functions
  const isOwnProfile = targetUserId === currentUser?.id;
  const canEdit = isOwnProfile || (currentUser?.role === 'administrator' || currentUser?.role === 'manager');

  return {
    // Data
    profile,
    isLoading,
    error,
    isOwnProfile,
    canEdit,
    
    // Actions
    updateProfile: updateProfileMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    uploadProfilePicture: uploadProfilePictureMutation.mutate,
    deleteAccount: deleteAccountMutation.mutate,
    
    // Status
    isUpdating: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isUploadingPicture: uploadProfilePictureMutation.isPending,
    isDeletingAccount: deleteAccountMutation.isPending,
    
    // Utilities
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', targetUserId] });
    }
  };
}