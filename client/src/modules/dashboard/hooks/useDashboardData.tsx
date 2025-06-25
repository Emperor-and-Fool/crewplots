import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { User } from "@shared/schema";
import { DashboardStats } from "../types/dashboard.types";
import { dashboardService } from "../services/dashboardService";

export const useDashboardData = (selectedLocationId?: number) => {
  const profileQuery = useQuery<User[]>({
    queryKey: ['/api/profile-data'],
    queryFn: async () => {
      const response = await dashboardService.getProfileData();
      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }
      return response.json();
    }
  });

  const shiftsQuery = useQuery({
    queryKey: ['/api/shifts'],
    queryFn: async () => {
      const response = await dashboardService.getShiftsData();
      if (!response.ok) {
        throw new Error('Failed to fetch shifts');
      }
      return response.json();
    }
  });

  // Computed statistics with memoization
  const statsData: DashboardStats = useMemo(() => {
    const profileData = profileQuery.data || [];
    const shiftsStats = shiftsQuery.data || [];

    // Calculate staff count (all non-applicant roles)
    const staffUsers = profileData.filter(user => 
      user.role === 'crew_member' || 
      user.role === 'crew_manager' || 
      user.role === 'manager' || 
      user.role === 'administrator'
    );

    // Calculate applicant count
    const applicantUsers = profileData.filter(user => user.role === 'applicant');

    // Calculate hours scheduled
    const hoursScheduled = shiftsStats.reduce((total: number, shift: any) => {
      const startHour = parseInt(shift.startTime.split(":")[0]);
      const endHour = parseInt(shift.endTime.split(":")[0]);
      const hours = endHour - startHour;
      return total + hours;
    }, 0);

    return {
      totalApplicants: applicantUsers.length,
      totalStaff: staffUsers.length,
      shiftsThisWeek: shiftsStats.length,
      hoursScheduled
    };
  }, [profileQuery.data, shiftsQuery.data]);

  return { 
    statsData, 
    profileQuery, 
    shiftsQuery,
    isLoading: profileQuery.isLoading || shiftsQuery.isLoading 
  };
};