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

  // User list query with filtering - VE30 MIGRATION
  const {
    data: users = [],
    isLoading,
    error
  } = useQuery<User[]>({
    queryKey: ['/api/validation/v3/execute', 'userList', initialFilters],
    queryFn: async () => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'read',
          entityType: 'userList',
          data: {
            filters: {
              role: initialFilters.role,
              locationId: initialFilters.location,
              searchTerm: initialFilters.searchTerm
            }
          }
        })
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      return result.data || [];
    }
  });

  // Create user mutation - VE30 MIGRATION
  const createUserMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'create',
          entityType: 'userManagement',
          data: {
            userData: userData
          }
        })
      });
      if (!response.ok) throw new Error('Failed to create user');
      const result = await response.json();
      return result.data;
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'userList'] });
      toast({ title: 'User created successfully', description: `${newUser.name} has been added to the system.` });
    },
    onError: (error) => {
      toast({ title: 'Failed to create user', description: error.message, variant: 'destructive' });
    }
  });

  // Update user mutation - VE30 MIGRATION
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertUser> }) => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'update',
          entityType: 'userManagement',
          data: {
            id: id,
            userData: data
          }
        })
      });
      if (!response.ok) throw new Error('Failed to update user');
      const result = await response.json();
      return result.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'userList'] });
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'userSingle'] });
      toast({ title: 'User updated successfully', description: `${updatedUser.name}'s information has been updated.` });
    },
    onError: (error) => {
      toast({ title: 'Failed to update user', description: error.message, variant: 'destructive' });
    }
  });

  // Delete user mutation - VE30 MIGRATION
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'delete',
          entityType: 'userManagement',
          data: {
            id: userId
          }
        })
      });
      if (!response.ok) throw new Error('Failed to delete user');
      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'userList'] });
      toast({ title: 'User deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete user', description: error.message, variant: 'destructive' });
    }
  });

  // Bulk operations mutation - VE30 MIGRATION
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, userIds, data }: { 
      operation: string; 
      userIds: number[]; 
      data?: any 
    }) => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'update',
          entityType: 'userBulk',
          data: {
            operation: operation,
            userIds: userIds,
            data: data
          }
        })
      });
      if (!response.ok) throw new Error('Bulk operation failed');
      const result = await response.json();
      return result.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'userList'] });
      toast({ 
        title: 'Bulk operation completed', 
        description: `Successfully processed ${result.count || result.length || 'multiple'} users.` 
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
    
    // Utilities - VE30 MIGRATION
    refetch: () => queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'userList'] })
  };
}