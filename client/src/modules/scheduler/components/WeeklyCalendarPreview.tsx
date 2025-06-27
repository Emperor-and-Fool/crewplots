import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

interface Shift {
  id: number;
  title: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  position?: string;
  status: string;
}

interface WeeklyCalendarPreviewProps {
  shifts: Shift[];
  weekScheduleName: string;
  onShiftClick?: (shift: Shift) => void;
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

export default function WeeklyCalendarPreview({ shifts, weekScheduleName, onShiftClick }: WeeklyCalendarPreviewProps) {
  const getShiftsForDay = (day: string) => {
    return shifts.filter(shift => shift.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Preview: {weekScheduleName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const dayShifts = getShiftsForDay(day);
            return (
              <div key={day} className="border rounded-lg p-3 min-h-[120px]">
                <div className="text-sm font-medium text-center mb-2 pb-2 border-b">
                  {DAY_LABELS[day as keyof typeof DAY_LABELS]}
                </div>
                <div className="space-y-2">
                  {dayShifts.length > 0 ? (
                    dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        onClick={() => onShiftClick?.(shift)}
                        className={`p-2 rounded text-xs border cursor-pointer transition-colors hover:bg-muted ${
                          onShiftClick ? 'hover:border-primary' : ''
                        }`}
                        title={`${shift.title}\n${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}${shift.position ? `\nPosition: ${shift.position}` : ''}`}
                      >
                        <div className="font-medium truncate">
                          {shift.title}
                        </div>
                        <div className="text-muted-foreground">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </div>
                        {shift.position && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {shift.position}
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No shifts
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {shifts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No shifts scheduled yet</p>
            <p className="text-sm">Add shifts to see them in the calendar preview</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}