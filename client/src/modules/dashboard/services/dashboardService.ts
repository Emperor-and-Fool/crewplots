// Dashboard service layer - API abstraction for dashboard data
export const dashboardService = {
  getProfileData: () => 
    fetch('/api/profile-data', { credentials: 'include' }),
  
  getShiftsData: () => 
    fetch('/api/shifts', { credentials: 'include' }),
  
  getUserLocations: (userId: number) => 
    fetch(`/api/user-locations/${userId}`, { credentials: 'include' }),
  
  clearAllSessions: () => 
    fetch('/api/auth/clear-sessions', { 
      method: 'POST', 
      credentials: 'include' 
    })
};