import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth";
import { useLocationContext } from "@/contexts/location-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, UserPlus, Clock, BarChart3, PlusCircle, Trash2, User } from "lucide-react";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import LocationHeader from "@/modules/locations/components/LocationHeader";

// Dashboard module components and hooks
import { 
  StatsCard, 
  WeeklySummary,
  useDashboardData,
  useDashboardFilters,
  useAdminActions 
} from "@/modules/dashboard";


export default function Dashboard() {
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { user } = useAuth();
  const { selectedLocationId, isAllLocations } = useLocationContext();
  
  // Dashboard module hooks
  const dashboardData = useDashboardData(selectedLocationId || undefined);
  const filters = useDashboardFilters(user || null, selectedLocationId || undefined);
  const { clearAllSessions, isClearing } = useAdminActions();

  // Extract data from dashboard hooks
  const { statsData, profileQuery, shiftsQuery } = dashboardData;
  const profileData = profileQuery.data;
  const shiftsStats = shiftsQuery.data;

  // Fetch user's assigned locations for role-based filtering (preserved existing logic)
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
    enabled: !!user?.id && (user?.role === 'crew_manager')
  });

  // Get assigned location IDs for role-based filtering
  const assignedLocationIds = userLocations?.map((ul: any) => ul.locationId) || [];
  const isLocationRestricted = (user?.role === 'crew_manager') && assignedLocationIds.length > 0;

  // Use modular dashboard stats
  const totalApplicantsCount = statsData.totalApplicants;
  const totalStaffCount = statsData.totalStaff;
  const shiftsThisWeekCount = statsData.shiftsThisWeek;
  const hoursScheduledCount = statsData.hoursScheduled;

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
                <Button className="ml-3" onClick={() => navigate("/scheduling/new")}>
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

            {/* Stats cards - Show for administrators/managers or location-restricted users */}
            {(effectiveIsAllLocations || isLocationRestricted) && (
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
                  value={totalStaffCount}
                  icon={<Users className="h-6 w-6" />}
                  link={{ text: "View all", href: "/crew-management" }}
                  onClick={() => navigate("/crew-management")}
                />
                
                <StatsCard
                  title="Shifts This Week"
                  value={shiftsThisWeekCount}
                  icon={<Calendar className="h-6 w-6" />}
                  link={{ text: "View schedule", href: "/scheduling" }}
                  onClick={() => navigate("/scheduling")}
                />
                
                <StatsCard
                  title="Hours Scheduled"
                  value={hoursScheduledCount}
                  icon={<Clock className="h-6 w-6" />}
                  link={{ text: "View details", href: "/reports" }}
                  onClick={() => navigate("/reports")}
                />
              </div>
            )}

            {/* Weekly summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2">
                <WeeklySummary 
                  shiftsData={shiftsStats || []}
                  isLocationRestricted={isLocationRestricted}
                  restrictedLocationMessage={restrictedLocationMessage}
                />
              </div>
              
              {/* Quick actions */}
              <div className="lg:col-span-1">
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
              </div>
            </div>

            {/* Recent applicants - Show for administrators/managers only or when viewing all locations */}
            {effectiveIsAllLocations && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Recent Applicants
                  </h3>
                  
                  {applicantUsers && applicantUsers.length > 0 ? (
                    <div className="space-y-3">
                      {applicantUsers.slice(0, 5).map((applicant: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                             onClick={() => navigate(`/applicants/${applicant.id}`)}>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={applicant.profileImage} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {applicant.name || `${applicant.firstName} ${applicant.lastName}`.trim()}
                              </p>
                              <p className="text-sm text-gray-500">{applicant.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={applicant.status === 'new' ? 'default' : 'secondary'}>
                              {applicant.status || 'new'}
                            </Badge>
                            {applicant.phoneNumber && (
                              <a 
                                href={`tel:${applicant.phoneNumber}`}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Call
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {applicantUsers.length > 5 && (
                        <div className="text-center pt-4">
                          <Button variant="outline" onClick={() => navigate("/applicants")}>
                            View All Applicants
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent applicants</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
    </div>
  );
}