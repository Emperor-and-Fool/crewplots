import { useQuery } from '@tanstack/react-query';

export function useShiftCreationData(locationId?: number) {
  return useQuery({
    queryKey: ['/api/scheduler/creation-data', locationId],
    queryFn: async () => {
      const url = locationId 
        ? `/api/scheduler/creation-data?locationId=${locationId}`
        : '/api/scheduler/creation-data';
      
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Failed to fetch creation data: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // 30 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
}