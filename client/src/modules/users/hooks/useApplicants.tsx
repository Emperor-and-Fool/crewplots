// User Module - Applicant Management Hook

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  ApplicantSummary,
  ApplicantDetail,
  ApplicantFilters,
  ApplicationForm,
  ApplicationStatus,
  CreateApplicationRequest,
  UpdateApplicationStatusRequest
} from '../types/applicant.types';

export interface UseApplicantsConfig {
  filters?: ApplicantFilters;
  page?: number;
  limit?: number;
}

export interface UseApplicantsReturn {
  // Data
  applicants: ApplicantSummary[];
  total: number;
  isLoading: boolean;
  error: string | null;
  
  // Operations
  createApplication: (data: CreateApplicationRequest) => Promise<void>;
  updateStatus: (data: UpdateApplicationStatusRequest) => Promise<void>;
  deleteApplication: (applicantId: number) => Promise<void>;
  
  // Utility
  refetch: () => Promise<any>;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function useApplicants(config: UseApplicantsConfig = {}): UseApplicantsReturn {
  const queryClient = useQueryClient();
  const { filters = {}, page = 1, limit = 20 } = config;

  // Build query parameters
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(filters.status && { status: filters.status }),
    ...(filters.locationId && { locationId: filters.locationId.toString() }),
    ...(filters.search && { search: filters.search }),
    ...(filters.dateRange?.start && { startDate: filters.dateRange.start }),
    ...(filters.dateRange?.end && { endDate: filters.dateRange.end })
  });

  // Applicants list query
  const { 
    data: applicantsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['/api/applicants', queryParams.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/applicants?${queryParams}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch applicants');
      }
      
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create application mutation
  const createApplicationMutation = useMutation({
    mutationFn: async (data: CreateApplicationRequest) => {
      const formData = new FormData();
      formData.append('application', JSON.stringify(data.application));
      
      if (data.documents) {
        data.documents.forEach((file, index) => {
          formData.append(`document_${index}`, file);
        });
      }

      const response = await fetch('/api/applicant-portal/apply', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit application');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: UpdateApplicationStatusRequest) => {
      const response = await fetch(`/api/applicants/${data.applicantId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: data.status, 
          note: data.note 
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
    }
  });

  // Delete application mutation
  const deleteApplicationMutation = useMutation({
    mutationFn: async (applicantId: number) => {
      const response = await fetch(`/api/applicants/${applicantId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete application');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
    }
  });

  // API functions
  const createApplication = useCallback(async (data: CreateApplicationRequest): Promise<void> => {
    await createApplicationMutation.mutateAsync(data);
  }, [createApplicationMutation]);

  const updateStatus = useCallback(async (data: UpdateApplicationStatusRequest): Promise<void> => {
    await updateStatusMutation.mutateAsync(data);
  }, [updateStatusMutation]);

  const deleteApplication = useCallback(async (applicantId: number): Promise<void> => {
    await deleteApplicationMutation.mutateAsync(applicantId);
  }, [deleteApplicationMutation]);

  return {
    applicants: applicantsData?.applicants || [],
    total: applicantsData?.total || 0,
    isLoading,
    error: error?.message || null,
    createApplication,
    updateStatus,
    deleteApplication,
    refetch,
    hasNextPage: page * limit < (applicantsData?.total || 0),
    hasPreviousPage: page > 1
  };
}

// Hook for single applicant detail
export function useApplicantDetail(applicantId: number) {
  return useQuery({
    queryKey: ['/api/applicants', applicantId],
    queryFn: async (): Promise<ApplicantDetail> => {
      const response = await fetch(`/api/applicants/${applicantId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch applicant detail');
      }
      
      return response.json();
    },
    enabled: !!applicantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for applicant statistics (dashboard integration)
export function useApplicantStats() {
  return useQuery({
    queryKey: ['/api/applicants/stats'],
    queryFn: async () => {
      const response = await fetch('/api/applicants/stats', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch applicant stats');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}