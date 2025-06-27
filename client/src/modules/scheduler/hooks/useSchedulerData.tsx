import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { WeekScheduleWithShifts, WeekScheduleFormData, ShiftFormData } from '../types/scheduler.types';

// Data fetching hooks
export const useWeekSchedules = () => {
  return useQuery({
    queryKey: ['/api/week-schedules'],
    queryFn: async () => {
      const response = await fetch('/api/week-schedules');
      if (!response.ok) throw new Error('Failed to fetch week schedules');
      return response.json();
    }
  });
};

export const useWeekSchedule = (id: number | null) => {
  return useQuery({
    queryKey: ['/api/week-schedules', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/week-schedules/${id}`);
      if (!response.ok) throw new Error('Failed to fetch week schedule');
      return response.json();
    },
    enabled: !!id
  });
};

export const useWeekScheduleShifts = (weekScheduleId: number | null) => {
  return useQuery({
    queryKey: ['/api/week-schedules', weekScheduleId, 'shifts'],
    queryFn: async () => {
      if (!weekScheduleId) return [];
      const response = await fetch(`/api/week-schedules/${weekScheduleId}/shifts`);
      if (!response.ok) throw new Error('Failed to fetch shifts');
      return response.json();
    },
    enabled: !!weekScheduleId
  });
};

// Mutation hooks for creating/updating
export const useCreateWeekSchedule = () => {
  return useMutation({
    mutationFn: async (data: WeekScheduleFormData) => {
      return apiRequest('POST', '/api/week-schedules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
    }
  });
};

export const useUpdateWeekSchedule = () => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<WeekScheduleFormData> }) => {
      return apiRequest('PATCH', `/api/week-schedules/${id}`, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules', id] });
    }
  });
};

export const useCreateShift = () => {
  return useMutation({
    mutationFn: async (data: ShiftFormData & { weekScheduleId: number }) => {
      return apiRequest('POST', '/api/shifts', data);
    },
    onSuccess: (_, { weekScheduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules', weekScheduleId, 'shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
    }
  });
};

export const useUpdateShift = () => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ShiftFormData> }) => {
      return apiRequest('PATCH', `/api/shifts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
    }
  });
};

export const useDeleteShift = () => {
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
    }
  });
};