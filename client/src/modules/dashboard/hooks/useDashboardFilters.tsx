import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { User } from "@shared/schema";
import { DashboardFilters } from "../types/dashboard.types";
import { dashboardService } from "../services/dashboardService";

export const useDashboardFilters = (user: User, selectedLocationId?: number) => {
  const { data: userLocations } = useQuery({
    queryKey: ['/api/user-locations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await dashboardService.getUserLocations(user.id);
      if (!response.ok) {
        if (response.status === 404) return []; // No assignments
        throw new Error('Failed to fetch user locations');
      }
      return response.json();
    },
    enabled: !!user?.id && user?.role === 'crew_manager'
  });

  const filters: DashboardFilters = useMemo(() => {
    const assignedLocationIds = userLocations?.map((ul: any) => ul.locationId) || [];
    const isLocationRestricted = user?.role === 'crew_manager' && assignedLocationIds.length > 0;
    
    return {
      selectedLocationId,
      isAllLocations: !selectedLocationId,
      assignedLocationIds,
      isLocationRestricted
    };
  }, [userLocations, selectedLocationId, user?.role]);

  const applyLocationFilter = useCallback((data: any[]) => {
    if (!filters.isLocationRestricted) return data;
    
    return data.filter((item: any) => 
      !item.locationId || filters.assignedLocationIds.includes(item.locationId)
    );
  }, [filters]);

  return { filters, applyLocationFilter };
};