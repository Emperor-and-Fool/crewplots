import { useState } from "react";
import { useNavigate } from "wouter";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ScheduleCalendar } from "@/components/scheduling/schedule-calendar";
import { ShiftForm } from "@/components/scheduling/shift-form";
import { useAuth } from "@/hooks/use-auth";

export default function Scheduling() {
  const [, navigate] = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState<number>(0);
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [isEditingShift, setIsEditingShift] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const { user } = useAuth();

  // Check if user has management role
  const isManager = user?.role === "manager";
  const isFloorManager = user?.role === "floor_manager";

  // If user is a floor manager, use their assigned location
  const defaultLocationId = isFloorManager && user?.locationId ? user.locationId : selectedLocation;

  // Fetch shift if editing
  const { data: shift } = useQuery({
    queryKey: ['/api/shifts', selectedShiftId],
    enabled: !!selectedShiftId && isEditingShift,
  });

  // Handle location change from header
  const handleLocationChange = (locationId: number) => {
    setSelectedLocation(locationId);
  };

  // Check if editing shift from URL
  useState(() => {
    const path = window.location.pathname;
    const editMatch = path.match(/^\/scheduling\/edit\/(\d+)$/);
    if (editMatch) {
      setSelectedShiftId(parseInt(editMatch[1]));
      setIsEditingShift(true);
    } else if (path === "/scheduling/new") {
      setIsAddingShift(true);
    }
  });

  // If not a manager or floor manager, redirect to dashboard
  if (!isManager && !isFloorManager) {
    navigate("/dashboard");
    return null;
  }

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
            {isAddingShift ? (
              // Show shift form for adding new shift
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddingShift(false);
                    navigate("/scheduling");
                  }}
                  className="mb-4"
                >
                  Back to Schedule
                </Button>
                <ShiftForm />
              </div>
            ) : isEditingShift && shift ? (
              // Show shift form for editing existing shift
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditingShift(false);
                    setSelectedShiftId(null);
                    navigate("/scheduling");
                  }}
                  className="mb-4"
                >
                  Back to Schedule
                </Button>
                <ShiftForm shift={shift} isEditing={true} />
              </div>
            ) : (
              // Show schedule calendar
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Staff Scheduling</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage weekly schedules and shifts
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => navigate("/scheduling/templates")}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Templates
                    </Button>
                    <Button onClick={() => {
                      setIsAddingShift(true);
                      navigate("/scheduling/new");
                    }}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      New Shift
                    </Button>
                  </div>
                </div>

                {defaultLocationId > 0 ? (
                  <ScheduleCalendar locationId={defaultLocationId} />
                ) : (
                  <div className="bg-white rounded-md shadow p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a Location
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Please select a location from the dropdown in the header to view and manage schedules.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => isManager ? navigate("/locations") : null}
                      disabled={!isManager}
                    >
                      {isManager ? "Manage Locations" : "Contact a manager to set up locations"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
