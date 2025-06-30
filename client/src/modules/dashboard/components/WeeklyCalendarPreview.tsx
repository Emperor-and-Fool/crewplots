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
          {weekScheduleName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map(day => {
            const dayShifts = getShiftsForDay(day);
            return (
              <div key={day} className="min-h-[120px] border rounded-lg p-2">
                <h3 className="font-medium text-sm mb-2 text-center">
                  {DAY_LABELS[day as keyof typeof DAY_LABELS]}
                </h3>
                <div className="space-y-1">
                  {dayShifts.map(shift => (
                    <div
                      key={shift.id}
                      className={`p-1 rounded text-xs ${
                        onShiftClick ? 'cursor-pointer hover:bg-blue-100' : ''
                      } bg-blue-50 border border-blue-200`}
                      onClick={() => onShiftClick?.(shift)}
                    >
                      <div className="font-medium truncate">
                        {shift.position || shift.title}
                      </div>
                      <div className="text-gray-600">
                        {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}