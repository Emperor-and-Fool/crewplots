import React from 'react';
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

export default function WeeklyCalendarPreview({ 
  shifts, 
  weekScheduleName,
  onShiftClick,
  onShiftDelete 
}: WeeklyCalendarPreviewProps) {
  const currentWeek = getWeekNumber();

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Remove seconds if present
  };

  const getShiftsForDay = (day: string) => {
    return shifts.filter(shift => shift.dayOfWeek === day);
  };

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
        <div className="space-y-2">
          {DAYS_OF_WEEK.map((day) => {
            const dayShifts = getShiftsForDay(day);
            return (
              <div key={day} className="flex items-center min-h-[60px] border-b last:border-b-0 py-2">
                {/* Day label - fixed width */}
                <div className="w-24 flex-shrink-0 text-sm font-medium">
                  {DAY_LABELS[day as keyof typeof DAY_LABELS]}
                </div>
                
                {/* Shifts for this day */}
                <div className="flex-1 flex flex-wrap gap-2">
                  {dayShifts.length > 0 ? (
                    dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="relative group bg-blue-50 border border-blue-200 rounded px-3 py-2 hover:bg-blue-100 transition-colors cursor-pointer"
                        onClick={() => onShiftClick?.(shift)}
                        title={`${shift.title}\n${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}${shift.position ? `\nPosition: ${shift.position}` : ''}`}
                      >
                        <div className="text-sm font-medium text-blue-900">
                          {shift.title}
                        </div>
                        <div className="text-xs text-blue-700">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </div>
                        {shift.position && (
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
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">
                      No shifts scheduled
                    </div>
                  )}
                </div>
                
                {/* Shift count */}
                <div className="w-16 flex-shrink-0 text-right text-xs text-muted-foreground">
                  {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}