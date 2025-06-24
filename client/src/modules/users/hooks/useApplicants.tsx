// useApplicants hook - Comprehensive applicant management
// Extracted from existing applicant functionality

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { 
  Applicant, 
  ApplicantFormData, 
  ApplicantFilters,
  ApplicantStats,
  ApplicationStatus 
} from '../types/applicant.types';

export interface ApplicantsConfig {
  locationId?: number;
  initialFilters?: ApplicantFilters;
  enableRealtime?: boolean;
}

export function useApplicants(config: ApplicantsConfig = {}) {
  const { locationId, initialFilters, enableRealtime = false } = config;
  const { toast } = useToast();
  
  // Filter state
  const [filters, setFilters] = useState<ApplicantFilters>(initialFilters || {});
  const [selectedApplicant, setSelectedApplicant] = useState<number | null>(null);

  // Fetch applicants query
  const { data: applicants = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/applicants', locationId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (locationId) params.append('locationId', locationId.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.competencies?.length) {
        filters.competencies.forEach(comp => params.append('competencies', comp));
      }
      
      const response = await fetch(`/api/applicants?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch applicants: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: enableRealtime ? 0 : 30000,
    refetchInterval: enableRealtime ? 10000 : false
  });

  // Fetch applicant stats
  const { data: stats } = useQuery({
    queryKey: ['/api/applicants/stats', locationId],
    queryFn: async () => {
      const params = locationId ? `?locationId=${locationId}` : '';
      const response = await fetch(`/api/applicants/stats${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 60000 // 1 minute
  });

  // Create applicant mutation
  const createApplicantMutation = useMutation({
    mutationFn: async (data: ApplicantFormData) => {
      const formData = new FormData();
      
      // Add text fields
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) return; // Handle files separately
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      // Add file uploads
      if (data.resume) formData.append('resume', data.resume);
      if (data.coverLetter) formData.append('coverLetter', data.coverLetter);
      
      const response = await fetch('/api/applicants', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create applicant: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (newApplicant) => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applicants/stats'] });
      
      toast({
        title: 'Application submitted',
        description: `Application for ${newApplicant.firstName} ${newApplicant.lastName} has been created.`,
        duration: 4000
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to submit application. Please try again.',
        variant: 'destructive',
        duration: 4000
      });
    }
  });

  // Update applicant status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ applicantId, status, reason }: { 
      applicantId: number; 
      status: ApplicationStatus; 
      reason?: string 
    }) => {
      const response = await fetch(`/api/applicants/${applicantId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, reason })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (updatedApplicant, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applicants/stats'] });
      
      const statusLabels = {
        contacted: 'contacted',
        interviewed: 'scheduled for interview',
        hired: 'hired',
        rejected: 'rejected',
        'short-listed': 'short-listed'
      };
      
      toast({
        title: 'Status updated',
        description: `Applicant has been ${statusLabels[status] || status}.`,
        duration: 4000
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to update applicant status. Please try again.',
        variant: 'destructive',
        duration: 4000
      });
    }
  });

  // Delete applicant mutation
  const deleteApplicantMutation = useMutation({
    mutationFn: async (applicantId: number) => {
      const response = await fetch(`/api/applicants/${applicantId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete applicant: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/applicants/stats'] });
      
      toast({
        title: 'Applicant deleted',
        description: 'Applicant has been removed from the system.',
        duration: 4000
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to delete applicant. Please try again.',
        variant: 'destructive',
        duration: 4000
      });
    }
  });

  // Utility functions
  const getApplicantById = (id: number): Applicant | undefined => {
    return applicants.find((applicant: Applicant) => applicant.id === id);
  };

  const getApplicantsByStatus = (status: ApplicationStatus): Applicant[] => {
    return applicants.filter((applicant: Applicant) => applicant.status === status);
  };

  const updateFilters = (newFilters: Partial<ApplicantFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  // Public interface
  return {
    // Data
    applicants,
    stats,
    isLoading,
    error,
    
    // Selection
    selectedApplicant,
    setSelectedApplicant,
    
    // Filters
    filters,
    updateFilters,
    clearFilters,
    
    // Operations
    createApplicant: createApplicantMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    deleteApplicant: deleteApplicantMutation.mutate,
    refetch,
    
    // Utilities
    getApplicantById,
    getApplicantsByStatus,
    
    // Mutation states
    isCreating: createApplicantMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    isDeleting: deleteApplicantMutation.isPending
  };
}