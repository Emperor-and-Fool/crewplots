import React, { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";

export default function ViewCalendar() {
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const [selectedLocation, setSelectedLocation] = useState<number>(0);
  const { user } = useAuth();
  
  // Current week state
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Start on the current Sunday
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 0 });
  });

  // Handle location change from header
  const handleLocationChange = (locationId: number) => {
    setSelectedLocation(locationId);
  };

  // Time slots for the schedule
  const timeSlots = [
    "9:00 AM - 2:00 PM", 
    "5:00 PM - 11:00 PM"
  ];

  // Get days for the three weeks
  const getWeekDays = (startDate: Date) => {
    return Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));
  };

  // Current week days
  const currentWeekDays = getWeekDays(currentWeekStart);
  
  // Next week days
  const nextWeekDays = getWeekDays(addWeeks(currentWeekStart, 1));
  
  // Week after next days
  const weekAfterNextDays = getWeekDays(addWeeks(currentWeekStart, 2));

  // Navigation functions
  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  // Format date range for display header
  const currentWeekDateRange = `${format(currentWeekStart, 'MMMM d')} - ${format(
    addDays(currentWeekStart, 6),
    'MMMM d, yyyy'
  )}`;

  const nextWeekDateRange = `${format(addWeeks(currentWeekStart, 1), 'MMMM d')} - ${format(
    addDays(addWeeks(currentWeekStart, 1), 6),
    'MMMM d, yyyy'
  )}`;

  const weekAfterNextDateRange = `${format(addWeeks(currentWeekStart, 2), 'MMMM d')} - ${format(
    addDays(addWeeks(currentWeekStart, 2), 6),
    'MMMM d, yyyy'
  )}`;

  // Render a week table
  const renderWeekTable = (days: Date[], dateRange: string) => (
    <Card className="shadow-md mb-6">
      <CardHeader className="px-4 py-4 border-b border-gray-200 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Weekly Schedule</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </TableHead>
                {days.map((day) => (
                  <TableHead 
                    key={day.toString()}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div>{format(day, 'EEEE')}</div>
                    <div className="text-xs font-normal mt-1">{format(day, 'MMM d')}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
              {timeSlots.map((timeSlot, timeIndex) => (
                <TableRow key={timeSlot}>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {timeSlot}
                  </TableCell>
                  {days.map((day) => {
                    const bgColor = timeIndex === 0 ? "bg-blue-50 border-blue-200" : "bg-indigo-50 border-indigo-200";
                    const textColor = timeIndex === 0 ? "text-primary-700" : "text-indigo-700";
                    
                    // Mock staff data for demonstration
                    const mockStaff = [
                      { day: 0, shift: 0, name: "Alex Smith", role: "Bartender" },
                      { day: 1, shift: 0, name: "Jamie Lee", role: "Server" },
                      { day: 2, shift: 1, name: "Taylor Jones", role: "Bartender" },
                      { day: 4, shift: 0, name: "Morgan Davis", role: "Host" },
                      { day: 5, shift: 1, name: "Casey Wilson", role: "Server" },
                    ];
                    
                    // Check if there's a mock shift for this day and time slot
                    const dayOfWeek = day.getDay();
                    const hasShift = mockStaff.some(
                      s => s.day === dayOfWeek && s.shift === timeIndex
                    );
                    
                    const staffForShift = mockStaff.find(
                      s => s.day === dayOfWeek && s.shift === timeIndex
                    );
                    
                    return (
                      <TableCell 
                        key={`${timeSlot}-${day}`} 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {staffForShift ? (
                          <div className={`${bgColor} p-2 rounded-md border`}>
                            <div className={`font-medium ${textColor}`}>
                              {staffForShift.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {staffForShift.role}
                            </div>
                          </div>
                        ) : (
                          <div className="h-10 flex items-center justify-center text-gray-400">
                            (No staff assigned)
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">3-Week Calendar View</h1>
                <p className="mt-1 text-sm text-gray-500">
                  View schedule for the current and upcoming weeks
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex gap-2">
                <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Current Week */}
            {renderWeekTable(currentWeekDays, currentWeekDateRange)}
            
            {/* Next Week */}
            {renderWeekTable(nextWeekDays, nextWeekDateRange)}
            
            {/* Week After Next */}
            {renderWeekTable(weekAfterNextDays, weekAfterNextDateRange)}
          </div>
        </main>
      </div>
    </div>
  );
}
