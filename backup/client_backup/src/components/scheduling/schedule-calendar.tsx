import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO } from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  PlusCircle
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  WeeklySchedule, 
  Shift, 
  Staff, 
  User, 
  Competency,
  ScheduleTemplate
} from "@shared/schema";

interface ScheduleCalendarProps {
  locationId: number;
  timeSlots?: string[];
}

// Time slots for the schedule
const DEFAULT_TIME_SLOTS = [
  "9:00 AM - 2:00 PM", 
  "5:00 PM - 11:00 PM"
];

export function ScheduleCalendar({ 
  locationId,
  timeSlots = DEFAULT_TIME_SLOTS
}: ScheduleCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Start on the upcoming Sunday
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 0 });
  });
  
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get days of the week from current week start
  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  // Format date for API
  const formatDateForApi = (date: Date) => {
    return date.toISOString();
  };

  // Fetch the weekly schedule for the current week
  const { 
    data: weeklySchedule, 
    isLoading: isLoadingSchedule,
    refetch: refetchSchedule
  } = useQuery<WeeklySchedule>({
    queryKey: ['/api/weekly-schedules/location', locationId, formatDateForApi(currentWeekStart)],
    enabled: !!locationId,
  });

  // Fetch shifts for the weekly schedule
  const { 
    data: shifts,
    isLoading: isLoadingShifts,
    refetch: refetchShifts
  } = useQuery<Shift[]>({
    queryKey: ['/api/shifts/schedule', weeklySchedule?.id],
    enabled: !!weeklySchedule?.id,
  });

  // Fetch staff members
  const { data: staffMembers } = useQuery<Staff[]>({
    queryKey: ['/api/staff/location', locationId],
    enabled: !!locationId,
  });

  // Fetch users to get names
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!staffMembers,
  });

  // Fetch competencies
  const { data: competencies } = useQuery<Competency[]>({
    queryKey: ['/api/competencies/location', locationId],
    enabled: !!locationId,
  });

  // Fetch schedule templates
  const { data: templates } = useQuery<ScheduleTemplate[]>({
    queryKey: ['/api/schedule-templates/location', locationId],
    enabled: !!locationId,
  });

  // Helper to get staff name
  const getStaffName = (staffId: number) => {
    const staff = staffMembers?.find(s => s.id === staffId);
    if (!staff) return `Staff #${staffId}`;
    
    const user = users?.find(u => u.id === staff.userId);
    return user?.name || `Staff #${staffId}`;
  };

  // Helper to get competency name
  const getCompetencyName = (competencyId?: number) => {
    if (!competencyId) return null;
    const competency = competencies?.find(c => c.id === competencyId);
    return competency?.name || null;
  };

  // Get shifts for a specific day and time slot
  const getShiftsForSlot = (date: Date, timeSlot: string) => {
    if (!shifts) return [];

    const dateStr = format(date, 'yyyy-MM-dd');
    
    return shifts.filter(shift => {
      const shiftDate = typeof shift.date === 'string' 
        ? format(parseISO(shift.date), 'yyyy-MM-dd')
        : format(shift.date, 'yyyy-MM-dd');
      
      return shiftDate === dateStr && 
             shift.startTime + " - " + shift.endTime === timeSlot;
    });
  };

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

  // Create new weekly schedule if none exists
  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/weekly-schedules', {
        locationId,
        weekStartDate: formatDateForApi(currentWeekStart),
        templateId: null,
        isPublished: false
      });
    },
    onSuccess: async () => {
      toast({
        title: "Schedule Created",
        description: "New weekly schedule has been created.",
      });
      refetchSchedule();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create weekly schedule.",
        variant: "destructive",
      });
    }
  });

  // Apply template to schedule
  const applyTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      // This would fetch template shifts and create new shifts for each day
      // Simplified implementation here
      return apiRequest('PUT', `/api/weekly-schedules/${weeklySchedule?.id}`, {
        ...weeklySchedule,
        templateId
      });
    },
    onSuccess: async () => {
      toast({
        title: "Template Applied",
        description: "Schedule template has been applied.",
      });
      setShowTemplateDialog(false);
      refetchSchedule();
      refetchShifts();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to apply template to schedule.",
        variant: "destructive",
      });
    }
  });

  // Create schedule if none exists
  useEffect(() => {
    if (locationId && !isLoadingSchedule && !weeklySchedule) {
      createScheduleMutation.mutate();
    }
  }, [locationId, isLoadingSchedule, weeklySchedule]);

  // Apply the selected template
  const handleApplyTemplate = () => {
    if (selectedTemplate && weeklySchedule) {
      applyTemplateMutation.mutate(selectedTemplate);
    }
  };

  // Format date range for display header
  const dateRangeText = `${format(currentWeekStart, 'MMMM d')} - ${format(
    addDays(currentWeekStart, 6),
    'MMMM d, yyyy'
  )}`;

  if (isLoadingSchedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Loading schedule...</CardDescription>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <p>Loading schedule data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Weekly Schedule</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRangeText}
            </CardDescription>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button>Apply Template</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Apply Schedule Template</DialogTitle>
                  <DialogDescription>
                    Select a template to apply to the current week. This will create shifts based on the template.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                  <Select onValueChange={(value) => setSelectedTemplate(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
                  <Button onClick={handleApplyTemplate} disabled={!selectedTemplate}>Apply Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button onClick={() => navigate("/scheduling/new")}>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Shift
            </Button>
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
                    const slotShifts = getShiftsForSlot(day, timeSlot);
                    const bgColor = timeIndex === 0 ? "bg-blue-50 border-blue-200" : "bg-indigo-50 border-indigo-200";
                    const textColor = timeIndex === 0 ? "text-primary-700" : "text-indigo-700";
                    
                    return (
                      <TableCell 
                        key={`${timeSlot}-${day}`} 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {slotShifts.length > 0 ? (
                          slotShifts.map(shift => (
                            <div 
                              key={shift.id}
                              className={`${bgColor} p-2 rounded-md border mb-2`}
                              onClick={() => navigate(`/scheduling/edit/${shift.id}`)}
                              role="button"
                              tabIndex={0}
                            >
                              <div className={`font-medium ${textColor}`}>
                                {shift.staffId ? getStaffName(shift.staffId) : 'Unassigned'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {shift.role} {shift.requiredCompetencyLevel ? 
                                  `(${getCompetencyName(shift.competencyId)?.charAt(0) || 'C'}${shift.requiredCompetencyLevel})` : ''}
                              </div>
                            </div>
                          ))
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full border-dashed text-gray-400 hover:text-gray-700"
                            onClick={() => navigate(`/scheduling/new?date=${format(day, 'yyyy-MM-dd')}&timeSlot=${encodeURIComponent(timeSlot)}`)}
                          >
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Add Shift
                          </Button>
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
      <CardFooter className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-gray-500">
            {weeklySchedule?.isPublished 
              ? 'Schedule is published' 
              : 'Schedule is in draft mode'}
          </div>
          {!weeklySchedule?.isPublished && (
            <Button variant="default">
              Publish Schedule
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
