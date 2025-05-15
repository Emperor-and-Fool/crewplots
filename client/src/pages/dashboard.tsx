import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import { StatsCard } from "@/components/ui/stats-card";
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule";
import { StaffOverview } from "@/components/dashboard/staff-overview";
import { ApplicantsSummary } from "@/components/dashboard/applicants-summary";
import { CashManagementSummary } from "@/components/dashboard/cash-management-summary";
import { PlusCircle, Trash2 } from "lucide-react";
import { 
  Users, 
  Calendar, 
  Clock, 
  UserPlus 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [selectedLocation, setSelectedLocation] = useState<number>(0);
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { user } = useAuth();
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  
  // Function to clear all sessions (admin only)
  const clearAllSessions = async () => {
    if (!user || user.role !== 'administrator') {
      toast({
        title: "Access Denied",
        description: "Only administrators can clear sessions",
        variant: "destructive"
      });
      return;
    }
    
    if (confirm("Are you sure you want to clear ALL sessions? This will log out all users.")) {
      setIsClearing(true);
      try {
        const response = await fetch('/api/auth/clear-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
          toast({
            title: "Success",
            description: "All sessions have been cleared",
            variant: "default"
          });
        } else {
          throw new Error(data.message || 'Failed to clear sessions');
        }
      } catch (error) {
        console.error('Error clearing sessions:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to clear sessions',
          variant: "destructive"
        });
      } finally {
        setIsClearing(false);
      }
    }
  };

  // Fetch statistics data
  const { data: staffStats } = useQuery({
    queryKey: ['/api/staff/location', selectedLocation],
    enabled: !!selectedLocation,
  });

  const { data: shiftsStats } = useQuery({
    queryKey: ['/api/shifts'],
    enabled: !!selectedLocation,
  });

  const { data: applicantsStats } = useQuery({
    queryKey: ['/api/applicants/status/new'],
  });

  // Count data
  const totalStaff = staffStats?.length || 0;
  const shiftsThisWeek = shiftsStats?.length || 0;
  const hoursScheduled = shiftsStats?.reduce((total, shift) => {
    // Calculate hours between start and end time (simplified)
    const startHour = parseInt(shift.startTime.split(":")[0]);
    const endHour = parseInt(shift.endTime.split(":")[0]);
    const hours = endHour - startHour;
    return total + hours;
  }, 0) || 0;
  const newApplicants = applicantsStats?.length || 0;

  // Handle location change from header
  const handleLocationChange = (locationId: number) => {
    setSelectedLocation(locationId);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for larger screens */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile navigation */}
        <MobileNavbar />
        
        {/* Top header with search and user */}
        <Header onLocationChange={handleLocationChange} />
        
        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Dashboard Header */}
            <div className="md:flex md:items-center md:justify-between mb-8">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                  Dashboard
                </h2>
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

            {/* Stats cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatsCard
                title="Total Staff"
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
              
              <StatsCard
                title="New Applicants"
                value={newApplicants}
                icon={<UserPlus className="h-6 w-6" />}
                link={{ text: "Review applicants", href: "/applicants" }}
                onClick={() => navigate("/applicants")}
              />
            </div>

            {/* Weekly Schedule */}
            {selectedLocation > 0 && (
              <div className="mb-8">
                <WeeklySchedule locationId={selectedLocation} />
              </div>
            )}

            {/* Staff Overview and Applicants */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Staff List */}
              <div className="lg:col-span-2">
                {selectedLocation > 0 ? (
                  <StaffOverview locationId={selectedLocation} />
                ) : (
                  <div className="bg-white shadow rounded-md p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a Location
                    </h3>
                    <p className="text-gray-500">
                      Please select a location from the dropdown in the header to view staff information.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Applicants Summary and Cash Management */}
              <div className="lg:col-span-1 space-y-6">
                <ApplicantsSummary locationId={selectedLocation || undefined} />
                
                {selectedLocation > 0 && (
                  <CashManagementSummary locationId={selectedLocation} />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Quick Actions Fixed Button */}
      <div className="fixed right-4 bottom-4">
        <Button
          size="icon"
          className="rounded-full h-12 w-12 shadow-lg"
          onClick={() => navigate("/scheduling/new")}
        >
          <PlusCircle className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
