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
import { ValidationEngine30Test } from "@/components/ValidationEngine30Test";


export default function Dashboard() {
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { user } = useAuth();
  const { selectedLocationId, isAllLocations } = useLocationContext();
  const { hasWorkflowAccess } = useWorkflowPermissions();
  
  // Admin actions from dashboard module
  const { clearAllSessions, isClearing } = useAdminActions();

  // SEQUENTIAL LOADING: Prevent session flooding by loading data in sequence
  
  // 1. First: Load week schedules (base data)
  const { data: weekSchedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['/api/scheduler/week-schedules'],
    queryFn: async () => {
      const response = await fetch('/api/scheduler/week-schedules', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch week schedules');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Get active week schedule for current location
  const activeWeekSchedule = weekSchedules?.find((ws: any) => 
    (!selectedLocationId || ws.locationId === selectedLocationId) && ws.isActive
  );

  // 2. Second: Load shifts only after schedules loaded
  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['/api/scheduler/shifts', activeWeekSchedule?.id],
    queryFn: async () => {
      if (!activeWeekSchedule?.id) return [];
      const response = await fetch(`/api/scheduler/week-schedules/${activeWeekSchedule.id}/shifts`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch shifts');
      }
      return response.json();
    },
    enabled: !!activeWeekSchedule?.id && !!weekSchedules, // Only run after schedules loaded
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  // 3. Third: Load profile data
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/validation/v3/execute'],
    queryFn: async () => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: 'userList',
          operation: 'list',
          data: {}
        }),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const result = await response.json();
      return result.data;
    },
    enabled: !!shifts, // Only run after shifts loaded
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Calculate statistics 
  const staffUsers = Array.isArray(profileData) ? profileData.filter((user: any) => 
    (user.role === 'staff' || user.role === 'crew_member') && 
    (!selectedLocationId || user.locationIds?.includes(selectedLocationId))
  ) : [];

  const applicantUsers = Array.isArray(profileData) ? profileData.filter((user: any) => 
    user.role === 'applicant' && 
    (!selectedLocationId || user.locationIds?.includes(selectedLocationId))
  ) : [];

  const thisWeekShifts = shifts || [];
  const hoursScheduled = thisWeekShifts.reduce((total: number, shift: any) => {
    if (shift.startTime && shift.endTime) {
      const start = new Date(`2000-01-01T${shift.startTime}`);
      const end = new Date(`2000-01-01T${shift.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + (hours > 0 ? hours : 0);
    }
    return total;
  }, 0);

  const recentApplicants = applicantUsers
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const isLoading = schedulesLoading || shiftsLoading || profileLoading;

  return (
    <div className="flex h-screen bg-background">
      <div className="lg:flex hidden">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden">
          <MobileNavbar />
        </div>
        
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <div className="container mx-auto space-y-6">
            <LocationHeader />
            
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {/* Stats Grid - Only show in "All Locations" view */}
                {isAllLocations && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                      title="Total Applicants"
                      value={applicantUsers.length}
                      description="+5 from last month"
                      icon={UserPlus}
                    />
                    <StatsCard
                      title="Total Staff"
                      value={staffUsers.length}
                      description="Active crew members"
                      icon={Users}
                    />
                    <StatsCard
                      title="Shifts This Week"
                      value={thisWeekShifts.length}
                      description="Across all locations"
                      icon={Calendar}
                    />
                    <StatsCard
                      title="Hours Scheduled"
                      value={Math.round(hoursScheduled)}
                      description="This week total"
                      icon={Clock}
                    />
                  </div>
                )}

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Recent Applicants - Only in "All Locations" view */}
                    {isAllLocations && (
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Recent Applicants</CardTitle>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate('/applicants')}
                          >
                            View All
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <ApplicantsSummary />
                        </CardContent>
                      </Card>
                    )}

                    {/* Staff Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Staff Overview</CardTitle>
                        <CardDescription>Current team members</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <StaffOverview />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Weekly Calendar Preview */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Week's Schedule</CardTitle>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate('/scheduler')}
                        >
                          View Full Calendar
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {activeWeekSchedule ? (
                          <WeeklyCalendarPreview 
                            weekSchedule={activeWeekSchedule}
                            shifts={thisWeekShifts}
                          />
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            No active schedule for this location
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Cash Management Summary */}
                    {hasWorkflowAccess('cash_management') && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Cash Management</CardTitle>
                          <CardDescription>Recent transactions</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <CashManagementSummary />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common tasks and shortcuts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/scheduler')}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                      >
                        <Calendar className="h-6 w-6" />
                        <span className="text-sm">Schedule</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => navigate('/applicants')}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                      >
                        <UserPlus className="h-6 w-6" />
                        <span className="text-sm">Applicants</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => navigate('/reports')}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                      >
                        <BarChart3 className="h-6 w-6" />
                        <span className="text-sm">Reports</span>
                      </Button>
                      
                      {hasWorkflowAccess('cash_management') && (
                        <Button
                          variant="outline"
                          onClick={() => navigate('/cash-management')}
                          className="flex flex-col items-center gap-2 h-auto py-4"
                        >
                          <PlusCircle className="h-6 w-6" />
                          <span className="text-sm">Cash Count</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Admin Section */}
                {user?.role === 'administrator' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Administration</CardTitle>
                      <CardDescription>System management tools</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        <Button
                          variant="destructive"
                          onClick={clearAllSessions}
                          disabled={isClearing}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          {isClearing ? "Clearing..." : "Clear All Sessions"}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => navigate('/validation-test')}
                          className="flex items-center gap-2"
                        >
                          <User className="h-4 w-4" />
                          Validation Test
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}