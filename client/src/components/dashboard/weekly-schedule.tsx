import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
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
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Shift } from "@shared/schema";

interface WeeklyScheduleProps {
  locationId: number;
  weekStartDate?: Date;
}

const timeSlots = [
  "9:00 AM - 2:00 PM", 
  "5:00 PM - 11:00 PM"
];

const days = [
  "Sunday", 
  "Monday", 
  "Tuesday", 
  "Wednesday", 
  "Thursday", 
  "Friday", 
  "Saturday"
];

export function WeeklySchedule({ locationId, weekStartDate = new Date() }: WeeklyScheduleProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  // Fetch week schedules for this location
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

  // Get active week schedule for this location
  const activeWeekSchedule = weekSchedules?.find((ws: any) => 
    ws.locationId === locationId && ws.isActive
  );

  // Fetch shifts for the active week schedule
  const { data: shifts } = useQuery<Shift[]>({
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

  // Get shifts for a specific day and time slot
  const getShiftsForSlot = (dayIndex: number, timeSlot: string) => {
    if (!shifts) return [];

    const dayDate = new Date(weekStartDate);
    dayDate.setDate(dayDate.getDate() + dayIndex);
    
    // Format date to ISO string for comparison, truncated to date part only
    const dayDateStr = dayDate.toISOString().split('T')[0];
    
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.date).toISOString().split('T')[0];
      return shiftDate === dayDateStr && 
             shift.startTime + " - " + shift.endTime === timeSlot;
    });
  };

  const applyTemplate = () => {
    if (!selectedTemplate) return;
    
    // Logic to apply template would go here
    // This would typically be a mutation to create a new schedule
    console.log("Applying template", selectedTemplate);
  };

  // Format date range for display (e.g., "May 15 - May 21, 2023")
  const formatDateRange = () => {
    const endDate = new Date(weekStartDate);
    endDate.setDate(endDate.getDate() + 6);
    
    return `${weekStartDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric'
    })} - ${endDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric'
    })}`;
  };

  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <div className="-ml-4 -mt-2 flex items-center justify-between flex-wrap sm:flex-nowrap">
          <div className="ml-4 mt-2">
            <CardTitle className="text-lg font-medium text-gray-900">
              Weekly Schedule
            </CardTitle>
          </div>
          <div className="ml-4 mt-2 flex-shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="default">Apply Template</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Choose Template</h4>
                    <p className="text-sm text-muted-foreground">
                      Select a template to apply to this week
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {templates?.map(template => (
                      <div 
                        key={template.id} 
                        className="flex items-center justify-between"
                      >
                        <span>{template.name}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template.id);
                            applyTemplate();
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden border-b border-gray-200">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </TableHead>
                    {days.map((day, index) => (
                      <TableHead 
                        key={day}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {day}
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
                      {days.map((day, dayIndex) => {
                        const slotShifts = getShiftsForSlot(dayIndex, timeSlot);
                        const bgColor = timeIndex === 0 ? "bg-blue-50 border-blue-200" : "bg-indigo-50 border-indigo-200";
                        const textColor = timeIndex === 0 ? "text-primary-700" : "text-indigo-700";
                        
                        return (
                          <TableCell 
                            key={`${timeSlot}-${day}`} 
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {slotShifts.map(shift => (
                              <div 
                                key={shift.id}
                                className={`${bgColor} p-2 rounded-md border ${timeIndex > 0 ? 'mt-2' : ''}`}
                              >
                                <div className={`font-medium ${textColor}`}>
                                  {shift.staffId ? `Staff #${shift.staffId}` : 'Unassigned'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {shift.role} {shift.requiredCompetencyLevel ? `(C${shift.requiredCompetencyLevel})` : ''}
                                </div>
                              </div>
                            ))}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
