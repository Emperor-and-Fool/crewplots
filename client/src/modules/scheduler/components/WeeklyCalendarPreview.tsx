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
  status: string;
  shiftGroupId?: string;
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

export default function WeeklyCalendarPreview({ shifts, weekScheduleName, onShiftClick, onShiftDelete }: WeeklyCalendarPreviewProps) {
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
                        className="relative group p-2 rounded text-xs border transition-colors hover:bg-muted"
                        title={`${shift.title}\n${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}${shift.position ? `\nPosition: ${shift.position}` : ''}`}
                      >
                        <div 
                          onClick={() => onShiftClick?.(shift)}
                          className={`cursor-pointer ${onShiftClick ? 'hover:opacity-70' : ''}`}
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
                        {onShiftDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onShiftDelete(shift);
                            }}
                            className="absolute -top-1 -right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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