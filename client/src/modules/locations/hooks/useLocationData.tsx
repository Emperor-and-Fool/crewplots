import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Location } from '@shared/schema';
import type { LocationFormData } from '../types/location.types';

// Fetch all locations
export function useLocationData() {
  return useQuery({
    queryKey: ['/api/locations'],
    queryFn: async (): Promise<Location[]> => {
      const response = await fetch('/api/locations', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return response.json();
    }
  });
}

// Fetch single location
export function useLocation(id: number) {
  return useQuery({
    queryKey: ['/api/locations', id],
    queryFn: async (): Promise<Location> => {
      const response = await fetch(`/api/locations/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch location');
      }
      return response.json();
    },
    enabled: !!id
  });
}

// Create location mutation
export function useCreateLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (locationData: LocationFormData): Promise<Location> => {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(locationData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create location');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
    }
  });
}

// Update location mutation
export function useUpdateLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<LocationFormData> }): Promise<Location> => {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update location');
      }
      
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/locations', id] });
    }
  });
}

// Delete location mutation
export function useDeleteLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete location');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
    }
  });
}