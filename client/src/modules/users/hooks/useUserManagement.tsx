/**
 * User Module - User Management Hook
 * 
 * Centralized hook for user CRUD operations, list management, and bulk actions.
 * Integrates with existing authentication and maintains schema-first architecture.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { User, InsertUser } from '@shared/schema';
import type { UserListFilters, UserListState } from '../types';

export function useUserManagement(initialFilters: UserListFilters = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // User list query with filtering
  const {
    data: users = [],
    isLoading,
    error
  } = useQuery<User[]>({
    queryKey: ['/api/users', initialFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (initialFilters.role) params.append('role', initialFilters.role);
      if (initialFilters.location) params.append('location', initialFilters.location.toString());
      if (initialFilters.searchTerm) params.append('search', initialFilters.searchTerm);
      
      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'User created successfully', description: `${newUser.name} has been added to the system.` });
    },
    onError: (error) => {
      toast({ title: 'Failed to create user', description: error.message, variant: 'destructive' });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertUser> }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({ title: 'User updated successfully', description: `${updatedUser.name}'s information has been updated.` });
    },
    onError: (error) => {
      toast({ title: 'Failed to update user', description: error.message, variant: 'destructive' });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'User deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete user', description: error.message, variant: 'destructive' });
    }
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, userIds, data }: { 
      operation: string; 
      userIds: number[]; 
      data?: any 
    }) => {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, userIds, data })
      });
      if (!response.ok) throw new Error('Bulk operation failed');
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ 
        title: 'Bulk operation completed', 
        description: `Successfully processed ${result.count} users.` 
      });
    },
    onError: (error) => {
      toast({ title: 'Bulk operation failed', description: error.message, variant: 'destructive' });
    }
  });

  return {
    // Data
    users,
    isLoading,
    error,
    
    // Actions
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    bulkOperation: bulkOperationMutation.mutate,
    
    // Status
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    isBulkProcessing: bulkOperationMutation.isPending,
    
    // Utilities
    refetch: () => queryClient.invalidateQueries({ queryKey: ['/api/users'] })
  };
}