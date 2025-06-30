import { useState } from "react";
import { useLocation, useRouter } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth";
import { useLocationContext } from "@/contexts/location-context";
import { useWorkflowPermissions } from "@/hooks/use-workflow-permissions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, UserPlus, Clock, BarChart3, PlusCircle, Trash2, User } from "lucide-react";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import LocationHeader from "@/modules/locations/components/LocationHeader";

// Dashboard module components (sophisticated restoration)
import { StatsCard, StaffOverview, CashManagementSummary, useAdminActions, WeeklyCalendarPreview } from "@/modules/dashboard";
import { ApplicantsSummary } from "@/modules/users/components/workflows/ApplicantsSummary";


export default function Dashboard() {
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { user } = useAuth();
  const { selectedLocationId, isAllLocations } = useLocationContext();
  const { hasWorkflowAccess } = useWorkflowPermissions();
  
  // Admin actions from dashboard module
  const { clearAllSessions, isClearing } = useAdminActions();

  // Fetch week schedules
  const { data: weekSchedules } = useQuery({
    queryKey: ['/api/scheduler/week-schedules'],
    queryFn: async () => {
      const response = await fetch('/api/scheduler/week-schedules', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch week schedules');
      }
      return response.json();
    }
  });

  // Get active week schedule for current location
  const activeWeekSchedule = weekSchedules?.find((ws: any) => 
    (!selectedLocationId || ws.locationId === selectedLocationId) && ws.isActive
  );

  // Fetch shifts for the active week schedule
  const { data: shifts } = useQuery({
    queryKey: ['/api/scheduler/week-schedules', activeWeekSchedule?.id, 'shifts'],
    queryFn: async () => {
      const response = await fetch(`/api/scheduler/week-schedules/${activeWeekSchedule.id}/shifts`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch shifts');
      }
      return response.json();
    },
    enabled: !!activeWeekSchedule?.id,
  });

  const { data: profileData } = useQuery({
    queryKey: ['/api/profile-data'],
    queryFn: async () => {
      const response = await fetch('/api/profile-data', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }
      return response.json();
    }
  });

  // Fetch user's assigned locations for role-based filtering
  const { data: userLocations } = useQuery({
    queryKey: ['/api/user-locations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/user-locations/${user.id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return []; // No assignments
        throw new Error('Failed to fetch user locations');
      }
      return response.json();
    },
    enabled: !!user?.id && (user?.role === 'crew_chief')
  });

  // Get assigned location IDs for role-based filtering
  const assignedLocationIds = userLocations?.map((ul: any) => ul.locationId) || [];
  const isLocationRestricted = (user?.role === 'crew_chief') && assignedLocationIds.length > 0;

  // Cherry-pick crew data from unified profile data (include all non-applicant roles)
  let staffUsers = profileData?.filter((user: any) => 
    user.role === 'crew_member' || 
    user.role === 'crew_chief' || 
    user.role === 'app_manager' || 
    user.role === 'owner' || 
    user.role === 'administrator'
  ) || [];

  // Apply location filtering for crew managers
  if (isLocationRestricted) {
    staffUsers = staffUsers.filter((user: any) => 
      !user.locationId || assignedLocationIds.includes(user.locationId)
    );
  }

  const totalStaff = staffUsers.length;
  const shiftsThisWeek = shifts?.length || 0;
  const hoursScheduled = shifts?.reduce((total: number, shift: any) => {
    if (shift.startTime && shift.endTime) {
      const start = new Date(`1970-01-01T${shift.startTime}`);
      const end = new Date(`1970-01-01T${shift.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }
    return total;
  }, 0) || 0;

  // Calculate applicant stats from profile data (cherry-pick applicants only)
  let applicantUsers = profileData?.filter((user: any) => user.role === 'applicant') || [];
  
  // Apply location filtering for crew managers
  if (isLocationRestricted) {
    applicantUsers = applicantUsers.filter((user: any) => 
      !user.locationId || assignedLocationIds.includes(user.locationId)
    );
  }
  
  const newApplicants = applicantUsers?.filter((applicant: any) => applicant.status === 'new').length || 0;
  const shortListedApplicants = applicantUsers?.filter((applicant: any) => applicant.status === 'short-listed').length || 0;
  const displayApplicantCount = applicantUsers?.length || 0;

  // Use location-filtered data when location is selected, or show all data when no location selected
  const currentLocationId = selectedLocationId;
  
  // Override location context for role-restricted users
  const effectiveIsAllLocations = isLocationRestricted ? false : isAllLocations;
  const restrictedLocationMessage = isLocationRestricted ? 
    `Showing data for your assigned locations (${assignedLocationIds.length} locations)` : 
    null;

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Mobile navigation */}
      <MobileNavbar />
        
        {/* Top header with search and user */}
        <Header />
        
        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 relative">
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Location-aware Dashboard Header */}
            <LocationHeader />
            
            <div className="md:flex md:items-center md:justify-between mb-8">
              <div className="flex-1 min-w-0">
                <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex md:mt-0 md:ml-4">
                <Button variant="outline" onClick={() => navigate("/reports")}>
                  Export
                </Button>
                <Button className="ml-3" onClick={() => navigate("/shift-creation")}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Shift
                </Button>
                {user?.role === 'administrator' && (
                  <Button 
                    variant="destructive" 
                    className="ml-3"
                    onClick={clearAllSessions}
                    disabled={isClearing}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isClearing ? "Clearing..." : "Clear Sessions"}
                  </Button>
                )}
              </div>
            </div>

            {/* Stats cards - Show based on workflow permissions and location context */}
            {(isAllLocations || isLocationRestricted) && hasWorkflowAccess('application') && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <StatsCard
                  title="Total Applicants"
                  value={displayApplicantCount}
                  subtitle={`${newApplicants} new, ${shortListedApplicants} short-listed`}
                  icon={<UserPlus className="h-6 w-6" />}
                  link={{ text: "Review applicants", href: "/applicants" }}
                  onClick={() => navigate("/applicants")}
                />
                
                <StatsCard
                  title="Total Crew"
                  value={totalStaff}
                  icon={<Users className="h-6 w-6" />}
                  link={{ text: "View all", href: "/staff-management" }}
                  onClick={() => navigate("/staff-management")}
                />
                
                <StatsCard
                  title="Shifts This Week"
                  value={shiftsThisWeek}
                  icon={<Calendar className="h-6 w-6" />}
                  link={{ text: "View schedule", href: "/scheduling" }}
                  onClick={() => navigate("/scheduling")}
                />
                
                <StatsCard
                  title="Hours Scheduled"
                  value={hoursScheduled}
                  icon={<Clock className="h-6 w-6" />}
                  link={{ text: "View details", href: "/reports" }}
                  onClick={() => navigate("/reports")}
                />
              </div>
            )}

            {/* Dashboard content grid - permission-based layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
              {/* Scheduling content - prioritized for crew members */}
              {hasWorkflowAccess('scheduling') && (
                <div className="lg:col-span-8">
                {activeWeekSchedule && shifts ? (
                  <WeeklyCalendarPreview 
                    shifts={shifts} 
                    weekScheduleName={activeWeekSchedule.name}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Weekly Schedule
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        No active schedule found for this location. 
                        <Button variant="link" className="p-0 ml-1" onClick={() => navigate("/shift-creation")}>
                          Create a schedule
                        </Button>
                      </p>
                    </CardContent>
                  </Card>
                )}
                </div>
              )}
              
              {/* Right sidebar - permission-based content */}
              {(hasWorkflowAccess('scheduling') || hasWorkflowAccess('application')) && (
                <div className="lg:col-span-4 space-y-6">
                {/* Quick actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => navigate("/scheduling/new")}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create New Shift
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => navigate("/applicants")}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Review Applicants
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => navigate("/reports")}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Reports
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Staff overview - location-specific */}
                {selectedLocationId && (
                  <StaffOverview locationId={selectedLocationId} />
                )}
                
                {/* Cash management summary - location-specific */}
                {selectedLocationId && (
                  <CashManagementSummary locationId={selectedLocationId} />
                )}
                </div>
              )}
            </div>

            {/* Recent applicants - permission-based display */}
            {effectiveIsAllLocations && hasWorkflowAccess('application') && (
              <ApplicantsSummary limit={6} />
            )}
          </div>
        </main>
    </div>
  );
}