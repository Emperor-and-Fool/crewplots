import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { WeekScheduleWithShifts, WeekScheduleFormData, ShiftFormData } from '../types/scheduler.types';

// Data fetching hooks
export const useWeekSchedules = () => {
  return useQuery({
    queryKey: ['/api/validation/v3/execute', 'weekSchedule', 'list'],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'list',
        entityType: 'weekSchedule',
        data: {},
        context: {}
      });
      return response;
    }
  });
};

export const useWeekSchedule = (id: number | null) => {
  return useQuery({
    queryKey: ['/api/validation/v3/execute', 'weekSchedule', 'read', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'read',
        entityType: 'weekSchedule',
        data: { id },
        context: {}
      });
      return response;
    },
    enabled: !!id
  });
};

export const useWeekScheduleShifts = (weekScheduleId: number | null) => {
  return useQuery({
    queryKey: ['/api/validation/v3/execute', 'shift', 'list', weekScheduleId],
    queryFn: async () => {
      if (!weekScheduleId) return [];
      const response = await apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'list',
        entityType: 'shift',
        data: { weekScheduleId },
        context: {}
      });
      return response;
    },
    enabled: !!weekScheduleId
  });
};

// Mutation hooks for creating/updating
export const useCreateWeekSchedule = () => {
  return useMutation({
    mutationFn: async (data: WeekScheduleFormData) => {
      return apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'create',
        entityType: 'weekSchedule',
        data,
        context: {}
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'weekSchedule', 'list'] });
    }
  });
};

export const useUpdateWeekSchedule = () => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<WeekScheduleFormData> }) => {
      return apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'update',
        entityType: 'weekSchedule',
        data: { id, ...data },
        context: {}
      });
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'weekSchedule', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'weekSchedule', 'read', id] });
    }
  });
};

export const useCreateShift = () => {
  return useMutation({
    mutationFn: async (data: ShiftFormData & { weekScheduleId: number }) => {
      return apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'create',
        entityType: 'shift',
        data,
        context: {}
      });
    },
    onSuccess: (result, { weekScheduleId }) => {
      // Immediately invalidate and refetch shift list for live updates
      queryClient.invalidateQueries({ 
        queryKey: ['/api/validation/v3/execute', 'shift', 'list', weekScheduleId] 
      });
      queryClient.refetchQueries({ 
        queryKey: ['/api/validation/v3/execute', 'shift', 'list', weekScheduleId],
        type: 'active'
      });
      
      // Update week schedule list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/validation/v3/execute', 'weekSchedule', 'list'] 
      });
    }
  });
};

export const useUpdateShift = () => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ShiftFormData> }) => {
      return apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'update',
        entityType: 'shift',
        data: { id, ...data },
        context: {}
      });
    },
    onSuccess: (result, { id, data }) => {
      // Extract weekScheduleId from the updated data or original data
      const weekScheduleId = data.weekScheduleId || result?.weekScheduleId;
      
      // 1. Invalidate specific shift list for the week schedule (highest priority)
      if (weekScheduleId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/validation/v3/execute', 'shift', 'list', weekScheduleId] 
        });
      }
      
      // 2. Invalidate individual shift query
      queryClient.invalidateQueries({ 
        queryKey: ['/api/validation/v3/execute', 'shift', 'read', id] 
      });
      
      // 3. Invalidate all shift-related queries (catch-all)
      queryClient.invalidateQueries({ 
        queryKey: ['/api/validation/v3/execute', 'shift'] 
      });
      
      // 4. Invalidate week schedule queries to update schedule preview
      queryClient.invalidateQueries({ 
        queryKey: ['/api/validation/v3/execute', 'weekSchedule'] 
      });
      
      // 5. Force immediate refetch for active schedule views
      queryClient.refetchQueries({ 
        queryKey: ['/api/validation/v3/execute', 'shift', 'list', weekScheduleId],
        type: 'active'
      });
    }
  });
};

export const useDeleteShift = () => {
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'delete',
        entityType: 'shift',
        data: { id },
        context: {}
      });
    },
    onSuccess: (result, deletedShiftId) => {
      // Get shift data to extract weekScheduleId for targeted invalidation
      const shiftQueries = queryClient.getQueriesData({ 
        queryKey: ['/api/validation/v3/execute', 'shift'] 
      });
      
      // Extract weekScheduleId from cached shift data
      let weekScheduleId;
      for (const [queryKey, data] of shiftQueries) {
        if (Array.isArray(data)) {
          const shift = data.find((s: any) => s.id === deletedShiftId);
          if (shift?.weekScheduleId) {
            weekScheduleId = shift.weekScheduleId;
            break;
          }
        }
      }
      
      // Targeted invalidation
      if (weekScheduleId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/validation/v3/execute', 'shift', 'list', weekScheduleId] 
        });
        queryClient.refetchQueries({ 
          queryKey: ['/api/validation/v3/execute', 'shift', 'list', weekScheduleId],
          type: 'active'
        });
      }
      
      // Broad invalidation as fallback
      queryClient.invalidateQueries({ 
        queryKey: ['/api/validation/v3/execute', 'shift'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/validation/v3/execute', 'weekSchedule'] 
      });
    }
  });
};