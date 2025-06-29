import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Trash2, Plus, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Shift {
  id: number;
  title: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  position?: string;
  weekScheduleId: number;
}

interface WeekSchedule {
  id: number;
  scheduleBlockId: number;
  weekNumber: number;
  templateId?: number;
  createdAt: string;
  updatedAt: string;
}

interface MultiWeekCalendarPreviewProps {
  scheduleBlockId: number;
  scheduleBlockName: string;
  weekSchedules: WeekSchedule[];
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
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

// Helper function to get current week number
const getWeekNumber = (date: Date = new Date()): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export default function MultiWeekCalendarPreview({ 
  scheduleBlockId,
  scheduleBlockName,
  weekSchedules,
  onShiftClick,
  onShiftDelete
}: MultiWeekCalendarPreviewProps) {
  const currentWeek = getWeekNumber();
  const scrollContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [isDragging, setIsDragging] = useState<{ [key: string]: boolean }>({});
  const [dragStart, setDragStart] = useState<{ [key: string]: { x: number; scrollLeft: number } }>({});
  const [isSynced, setIsSynced] = useState(true);
  const syncRef = useRef(false);
  const { toast } = useToast();

  // Fetch shifts for all week schedules in this schedule block
  const { data: allShifts = [] } = useQuery({
    queryKey: ['/api/schedule-blocks', scheduleBlockId, 'all-shifts'],
    queryFn: async () => {
      console.log('🔍 MULTI-WEEK SHIFTS: Fetching all shifts for schedule block:', scheduleBlockId);
      
      // Fetch shifts for each week schedule
      const shiftsPromises = weekSchedules.map(async (weekSchedule) => {
        const response = await fetch(`/api/week-schedules/${weekSchedule.id}/shifts`, {
          credentials: 'include'
        });
        if (!response.ok) {
          console.warn(`Failed to fetch shifts for week schedule ${weekSchedule.id}`);
          return [];
        }
        const shifts = await response.json();
        return shifts.map((shift: any) => ({
          ...shift,
          weekScheduleId: weekSchedule.id,
          weekNumber: weekSchedule.weekNumber
        }));
      });
      
      const allShiftsArrays = await Promise.all(shiftsPromises);
      const flattenedShifts = allShiftsArrays.flat();
      console.log('🔍 MULTI-WEEK SHIFTS: Total shifts loaded:', flattenedShifts.length);
      return flattenedShifts;
    },
    enabled: weekSchedules.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Remove seconds if present
  };

  const getShiftsForDayAndWeek = (day: string, weekNumber: number) => {
    return allShifts.filter(shift => 
      shift.dayOfWeek === day && shift.weekNumber === weekNumber
    );
  };

  // Generate time slots for full day (0h to 23h)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const totalHours = 24; // Full 24-hour day
  const pixelsPerHour = 80;
  const gridWidth = totalHours * pixelsPerHour;
  const defaultStartHour = 8; // Default view starts at 8:00 AM

  // Auto-scroll to default start time on load
  useEffect(() => {
    weekSchedules.forEach((weekSchedule) => {
      DAYS_OF_WEEK.forEach((day) => {
        const key = `week-${weekSchedule.weekNumber}-${day}`;
        const scrollContainer = scrollContainerRefs.current[key];
        if (scrollContainer) {
          const scrollPosition = defaultStartHour * pixelsPerHour;
          scrollContainer.scrollLeft = scrollPosition;
        }
      });
    });
  }, [weekSchedules, allShifts, pixelsPerHour]);

  // Synchronize scroll across all days and weeks
  const syncScrollPosition = (scrollLeft: number, excludeKey?: string) => {
    if (!isSynced || syncRef.current) return;
    syncRef.current = true;
    
    Object.entries(scrollContainerRefs.current).forEach(([key, container]) => {
      if (container && key !== excludeKey) {
        container.scrollLeft = scrollLeft;
      }
    });
    
    setTimeout(() => {
      syncRef.current = false;
    }, 0);
  };

  // Handle mouse wheel scrolling for horizontal timeline navigation
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>, key: string) => {
    e.preventDefault();
    const container = e.currentTarget;
    const newScrollLeft = container.scrollLeft + e.deltaY;
    container.scrollLeft = newScrollLeft;
    syncScrollPosition(newScrollLeft, key);
  };

  // Handle mouse drag scrolling
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, key: string) => {
    const container = e.currentTarget;
    setIsDragging(prev => ({ ...prev, [key]: true }));
    setDragStart(prev => ({
      ...prev,
      [key]: {
        x: e.pageX - container.offsetLeft,
        scrollLeft: container.scrollLeft,
      }
    }));
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, key: string) => {
    if (!isDragging[key]) return;
    e.preventDefault();
    const container = e.currentTarget;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - dragStart[key]?.x) * 2; // Scroll speed multiplier
    const newScrollLeft = dragStart[key]?.scrollLeft - walk;
    container.scrollLeft = newScrollLeft;
    syncScrollPosition(newScrollLeft, key);
  };

  const handleMouseUp = (key: string) => {
    setIsDragging(prev => ({ ...prev, [key]: false }));
  };

  const handleMouseLeave = (key: string) => {
    setIsDragging(prev => ({ ...prev, [key]: false }));
  };

  // Handle regular scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, key: string) => {
    const container = e.currentTarget;
    syncScrollPosition(container.scrollLeft, key);
  };

  // Calculate shift position on timeline
  const getShiftPosition = (startTime: string, endTime: string) => {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours + minutes / 60;
    };

    const startHour = parseTime(startTime);
    const endHour = parseTime(endTime);
    const gridStartHour = 0;

    const left = Math.max(0, (startHour - gridStartHour) * pixelsPerHour);
    const width = Math.max(40, (endHour - startHour) * pixelsPerHour);

    return { left, width };
  };

  // Sort week schedules by week number
  const sortedWeekSchedules = [...weekSchedules].sort((a, b) => a.weekNumber - b.weekNumber);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Multi-Week Schedule: {scheduleBlockName}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="sync-timeline" 
                checked={isSynced}
                onCheckedChange={(checked) => setIsSynced(checked === true)}
              />
              <label 
                htmlFor="sync-timeline" 
                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Sync Timeline
              </label>
            </div>
            <div className="text-sm font-normal text-muted-foreground">
              {sortedWeekSchedules.length} week{sortedWeekSchedules.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {sortedWeekSchedules.map((weekSchedule) => (
            <div key={weekSchedule.id} className="border-2 border-dashed border-gray-200 rounded-lg p-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Week {weekSchedule.weekNumber}
                </h3>
                <div className="text-sm text-gray-600">
                  {allShifts.filter(s => s.weekNumber === weekSchedule.weekNumber).length} total shifts
                </div>
              </div>
              
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const dayShifts = getShiftsForDayAndWeek(day, weekSchedule.weekNumber);
                  const key = `week-${weekSchedule.weekNumber}-${day}`;
                  
                  return (
                    <div key={key} className="border rounded-lg overflow-hidden">
                      {/* Day header */}
                      <div className="bg-muted/30 px-4 py-2 border-b">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">
                            {DAY_LABELS[day as keyof typeof DAY_LABELS]}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Timeline container */}
                      <div 
                        className={`overflow-x-auto ${isDragging[key] ? 'cursor-grabbing' : 'cursor-grab'}`}
                        ref={(el) => {
                          scrollContainerRefs.current[key] = el;
                        }}
                        onWheel={(e) => handleWheel(e, key)}
                        onMouseDown={(e) => handleMouseDown(e, key)}
                        onMouseMove={(e) => handleMouseMove(e, key)}
                        onMouseUp={() => handleMouseUp(key)}
                        onMouseLeave={() => handleMouseLeave(key)}
                        onScroll={(e) => handleScroll(e, key)}
                        style={{ userSelect: 'none' }}
                      >
                        <div style={{ width: gridWidth }}>
                          {/* Time header */}
                          <div className="flex border-b bg-muted/10">
                            {timeSlots.map((time) => (
                              <div 
                                key={time}
                                className="text-xs text-center py-2 border-r border-gray-200 flex-shrink-0"
                                style={{ width: pixelsPerHour }}
                              >
                                {time}
                              </div>
                            ))}
                          </div>

                          {/* Shifts timeline */}
                          <div className="relative h-16">
                            {/* Grid lines */}
                            {timeSlots.map((time, index) => (
                              <div 
                                key={time}
                                className="absolute top-0 bottom-0 border-r border-gray-100"
                                style={{ left: index * pixelsPerHour }}
                              />
                            ))}

                            {/* Shifts */}
                            {dayShifts.map((shift) => {
                              const position = getShiftPosition(shift.startTime, shift.endTime);
                              return (
                                <div
                                  key={shift.id}
                                  className="absolute top-2 bottom-2 bg-blue-100 border border-blue-300 rounded px-2 cursor-pointer hover:bg-blue-200 transition-colors group overflow-hidden"
                                  style={{
                                    left: position.left,
                                    width: position.width,
                                    minWidth: '60px'
                                  }}
                                  onClick={() => onShiftClick?.(shift)}
                                  title={`${shift.title}\n${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}${shift.position ? `\nPosition: ${shift.position}` : ''}\nWeek ${shift.weekNumber}`}
                                >
                                  <div className="text-xs font-medium truncate text-blue-800">
                                    {shift.title}
                                  </div>
                                  <div className="text-xs text-blue-600 truncate">
                                    {formatTime(shift.startTime)}-{formatTime(shift.endTime)}
                                  </div>
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
                                No shifts scheduled
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}