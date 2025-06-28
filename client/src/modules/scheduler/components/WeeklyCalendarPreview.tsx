import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Trash2 } from 'lucide-react';

interface Shift {
  id: number;
  title: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  position?: string;
}

interface WeeklyCalendarPreviewProps {
  shifts: Shift[];
  weekScheduleName: string;
  onShiftClick?: (shift: Shift) => void;
  onShiftDelete?: (shift: Shift) => void;
}

const DAYS_OF_WEEK = [
  'monday',
  'tuesday', 
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

const DAY_LABELS = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun'
};

// Helper function to get current week number
const getWeekNumber = (date: Date = new Date()): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Helper function to generate time slots
const generateTimeSlots = (startHour: number = 10, endHour: number = 22): string[] => {
  const slots = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
};

// Helper function to convert time string to minutes from start of day
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to calculate position and width of shift in grid
const getShiftPosition = (startTime: string, endTime: string, gridStartHour: number = 10, scrollOffset: number = 0): {
  left: number;
  width: number;
} => {
  const gridStartMinutes = gridStartHour * 60;
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const minutesPerPixel = 2; // 2 pixels per minute for better visibility
  
  const left = (startMinutes - gridStartMinutes) * minutesPerPixel - scrollOffset;
  const width = (endMinutes - startMinutes) * minutesPerPixel;
  
  return { left: Math.max(-200, left), width: Math.max(60, width) }; // Allow shifts to start off-screen
};

export default function WeeklyCalendarPreview({ 
  shifts, 
  weekScheduleName,
  onShiftClick,
  onShiftDelete 
}: WeeklyCalendarPreviewProps) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [gridStartHour, setGridStartHour] = useState(10);
  const [gridEndHour, setGridEndHour] = useState(22);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentWeek = getWeekNumber();
  const timeSlots = generateTimeSlots(gridStartHour, gridEndHour);
  const totalMinutes = (gridEndHour - gridStartHour) * 60;
  const pixelsPerMinute = 2;
  const gridWidth = totalMinutes * pixelsPerMinute;

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Remove seconds if present
  };

  const getShiftsForDay = (day: string) => {
    return shifts.filter(shift => shift.dayOfWeek === day);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollOffset(e.currentTarget.scrollLeft);
  };

  useEffect(() => {
    // Auto-scroll to show morning hours (10:00) initially
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Preview: {weekScheduleName}
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            Week {currentWeek}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Time header */}
          <div className="flex">
            <div className="w-16 flex-shrink-0"></div> {/* Day label space */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-x-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300"
              onScroll={handleScroll}
            >
              <div className="flex border-b bg-muted/30" style={{ width: gridWidth }}>
                {timeSlots.map((time) => (
                  <div 
                    key={time}
                    className="text-xs text-center py-2 border-r border-gray-200 flex-shrink-0"
                    style={{ width: pixelsPerMinute * 60 }} // 60 minutes per hour
                  >
                    {time}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Days and shifts */}
          {DAYS_OF_WEEK.map((day) => {
            const dayShifts = getShiftsForDay(day);
            return (
              <div key={day} className="flex">
                {/* Day label */}
                <div className="w-16 flex-shrink-0 py-3 px-2 text-xs font-medium border-r bg-muted/20">
                  <div>{DAY_LABELS[day as keyof typeof DAY_LABELS]}</div>
                  <div className="text-muted-foreground text-xs">
                    {dayShifts.length}
                  </div>
                </div>

                {/* Time grid for this day */}
                <div className="flex-1 overflow-hidden">
                  <div 
                    className="relative border-b h-12" 
                    style={{ width: gridWidth, marginLeft: -scrollOffset }}
                  >
                    {/* Grid lines */}
                    {timeSlots.map((time, index) => (
                      <div 
                        key={time}
                        className="absolute top-0 bottom-0 border-r border-gray-100"
                        style={{ left: index * pixelsPerMinute * 60 }}
                      />
                    ))}

                    {/* Shifts for this day */}
                    {dayShifts.map((shift) => {
                      const position = getShiftPosition(shift.startTime, shift.endTime, gridStartHour, scrollOffset);
                      return (
                        <div
                          key={shift.id}
                          className="absolute top-1 bottom-1 bg-blue-100 border border-blue-300 rounded px-2 cursor-pointer hover:bg-blue-200 transition-colors group"
                          style={{
                            left: position.left,
                            width: position.width,
                            minWidth: '60px'
                          }}
                          onClick={() => onShiftClick?.(shift)}
                          title={`${shift.title}\n${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}${shift.position ? `\nPosition: ${shift.position}` : ''}`}
                        >
                          <div className="text-xs font-medium truncate text-blue-800">
                            {shift.title}
                          </div>
                          <div className="text-xs text-blue-600 truncate">
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                          </div>
                          {shift.position && position.width > 80 && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {shift.position}
                            </Badge>
                          )}
                          {onShiftDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onShiftDelete(shift);
                              }}
                              className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}

                    {/* Empty day indicator */}
                    {dayShifts.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                        No shifts
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline controls */}
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>Timeline: {gridStartHour}:00 - {gridEndHour}:00</div>
            <div>Scroll horizontally to navigate • Touch and drag on mobile</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}