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

export function WeeklyCalendarPreview({ shifts, weekScheduleName, onShiftClick }: WeeklyCalendarPreviewProps) {
  const getShiftsForDay = (day: string) => {
    return shifts.filter(shift => shift.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Weekly Preview: {weekScheduleName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const dayShifts = getShiftsForDay(day);
            
            return (
              <div key={day} className="border rounded-lg p-2 min-h-[120px]">
                <div className="font-medium text-sm text-center mb-2 text-muted-foreground">
                  {DAY_LABELS[day as keyof typeof DAY_LABELS]}
                </div>
                
                <div className="space-y-1">
                  {dayShifts.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No shifts
                    </div>
                  ) : (
                    dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="bg-blue-50 border border-blue-200 rounded p-2 text-xs cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => onShiftClick?.(shift)}
                      >
                        <div className="font-medium text-blue-900 truncate">
                          {shift.title}
                        </div>
                        <div className="text-blue-700">
                          {shift.startTime}-{shift.endTime}
                        </div>
                        {shift.position && (
                          <div className="text-blue-600 text-xs mt-1">
                            {shift.position}
                          </div>
                        )}
                        <Badge 
                          variant={shift.status === 'open' ? 'default' : 'secondary'}
                          className="mt-1 text-xs"
                        >
                          {shift.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {shifts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No shifts scheduled for this week template</p>
            <p className="text-sm">Add shifts using the form above to see them here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}