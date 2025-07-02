/**
 * User Module - Applicant Management Hook
 * 
 * Specialized hook for applicant-specific operations including application workflow,
 * status management, and integration with the messaging system for notes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@shared/schema';
import type { ApplicantListFilters, ApplicantStatusUpdate } from '../types';

export function useApplicantManagement(filters: ApplicantListFilters = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Applicant list query with filtering - DataAggregationEngine 3.0
  const {
    data: applicants = [],
    isLoading,
    error
  } = useQuery<User[]>({
    queryKey: ['/api/validation/v3/aggregate', 'applicant-list', filters],
    queryFn: async () => {
      const aggregationTask = {
        entityType: 'user' as const,
        entityId: 'role-filter',
        requiredData: {
          postgresql: ['user', 'locations', 'permissions'],
          mongodb: ['notes'],
          redis: ['cache-keys']
        },
        compilationRules: {
          enhance: true,
          permissions: true,
          metadata: true
        },
        cacheStrategy: {
          category: 'user-aggregation',
          ttl: 300,
          connectionId: 'applicant-list'
        },
        filters: {
          role: 'applicant',
          status: filters.status,
          location: filters.location,
          searchTerm: filters.searchTerm,
          hasNotes: filters.hasNotes
        }
      };
      
      const response = await fetch('/api/validation/v3/aggregate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(aggregationTask)
      });
      
      if (!response.ok) throw new Error('Failed to fetch applicants via DataAggregation');
      const result = await response.json();
      return result.success ? result.data : [];
    }
  });

  // Individual applicant detail query
  const useApplicantDetail = (applicantId: number) => {
    return useQuery<User>({
      queryKey: ['/api/applicants', applicantId],
      queryFn: async () => {
        const response = await fetch(`/api/applicants/${applicantId}`);
        if (!response.ok) throw new Error('Failed to fetch applicant details');
        return response.json();
      },
      enabled: !!applicantId
    });
  };

  // Update applicant status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (statusUpdate: ApplicantStatusUpdate) => {
      const response = await fetch(`/api/applicants/${statusUpdate.applicantId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusUpdate)
      });
      if (!response.ok) throw new Error('Failed to update applicant status');
      return response.json();
    },
    onSuccess: (updatedApplicant) => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applicants', updatedApplicant.id] });
      toast({ 
        title: 'Status updated', 
        description: `${updatedApplicant.name}'s application status has been updated.` 
      });
    },
    onError: (error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    }
  });

  // Approve applicant mutation
  const approveApplicantMutation = useMutation({
    mutationFn: async ({ applicantId, reason }: { applicantId: number; reason?: string }) => {
      const response = await fetch(`/api/applicants/${applicantId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) throw new Error('Failed to approve applicant');
      return response.json();
    },
    onSuccess: (approvedApplicant) => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applicants', approvedApplicant.id] });
      toast({ 
        title: 'Applicant approved', 
        description: `${approvedApplicant.name} has been approved and can now access the crew portal.` 
      });
    },
    onError: (error) => {
      toast({ title: 'Failed to approve applicant', description: error.message, variant: 'destructive' });
    }
  });

  // Reject applicant mutation
  const rejectApplicantMutation = useMutation({
    mutationFn: async ({ applicantId, reason }: { applicantId: number; reason: string }) => {
      const response = await fetch(`/api/applicants/${applicantId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) throw new Error('Failed to reject applicant');
      return response.json();
    },
    onSuccess: (rejectedApplicant) => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applicants', rejectedApplicant.id] });
      toast({ 
        title: 'Applicant rejected', 
        description: `${rejectedApplicant.name}'s application has been rejected.` 
      });
    },
    onError: (error) => {
      toast({ title: 'Failed to reject applicant', description: error.message, variant: 'destructive' });
    }
  });

  // Archive applicant mutation
  const archiveApplicantMutation = useMutation({
    mutationFn: async (applicantId: number) => {
      const response = await fetch(`/api/applicants/${applicantId}/archive`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to archive applicant');
      return response.json();
    },
    onSuccess: (archivedApplicant) => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      toast({ 
        title: 'Applicant archived', 
        description: `${archivedApplicant.name} has been moved to the archive.` 
      });
    },
    onError: (error) => {
      toast({ title: 'Failed to archive applicant', description: error.message, variant: 'destructive' });
    }
  });

  // Get applicant statistics
  const {
    data: statistics,
    isLoading: isLoadingStats
  } = useQuery({
    queryKey: ['/api/applicants/statistics'],
    queryFn: async () => {
      const response = await fetch('/api/applicants/statistics');
      if (!response.ok) throw new Error('Failed to fetch statistics');
      return response.json();
    }
  });

  return {
    // Data
    applicants,
    statistics,
    isLoading,
    isLoadingStats,
    error,
    
    // Individual applicant hook
    useApplicantDetail,
    
    // Actions
    updateStatus: updateStatusMutation.mutate,
    approveApplicant: approveApplicantMutation.mutate,
    rejectApplicant: rejectApplicantMutation.mutate,
    archiveApplicant: archiveApplicantMutation.mutate,
    
    // Status
    isUpdatingStatus: updateStatusMutation.isPending,
    isApproving: approveApplicantMutation.isPending,
    isRejecting: rejectApplicantMutation.isPending,
    isArchiving: archiveApplicantMutation.isPending,
    
    // Utilities
    refetch: () => queryClient.invalidateQueries({ queryKey: ['/api/applicants'] })
  };
}