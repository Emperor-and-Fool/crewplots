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
import { LocationSummaryProps } from "../../types/dashboard.types";

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

export const WeeklySummary = ({ locationId }: LocationSummaryProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  // Fetch week schedules for this location
  const { data: weekSchedules } = useQuery({
    queryKey: ['/api/scheduler/week-schedules'],
    enabled: !!locationId
  });

  // Fetch shifts for selected template
  const { data: shifts } = useQuery({
    queryKey: ['/api/scheduler/shifts', selectedTemplate],
    enabled: !!selectedTemplate
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Template Selection */}
          <div className="flex gap-2">
            {weekSchedules?.map((schedule: any) => (
              <Button
                key={schedule.id}
                variant={selectedTemplate === schedule.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTemplate(schedule.id)}
              >
                {schedule.name}
              </Button>
            ))}
          </div>

          {/* Schedule Display */}
          {selectedTemplate && shifts && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  {days.map(day => (
                    <TableHead key={day}>{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeSlots.map(timeSlot => (
                  <TableRow key={timeSlot}>
                    <TableCell className="font-medium">{timeSlot}</TableCell>
                    {days.map(day => {
                      const dayShifts = shifts.filter((shift: Shift) => 
                        shift.daysOfWeek?.includes(day.toLowerCase())
                      );
                      
                      return (
                        <TableCell key={day}>
                          {dayShifts.length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                  {dayShifts.length} shift{dayShifts.length > 1 ? 's' : ''}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent>
                                <div className="space-y-2">
                                  {dayShifts.map((shift: Shift) => (
                                    <div key={shift.id} className="text-sm">
                                      <div className="font-medium">{shift.position}</div>
                                      <div className="text-gray-600">
                                        {shift.startTime} - {shift.endTime}
                                      </div>
                                      <div className="text-gray-500">
                                        Max: {shift.maxSlots} people
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};