import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MultiWeekCalendarPreview from './MultiWeekCalendarPreview';

interface WeekSchedule {
  id: number;
  scheduleBlockId: number;
  weekNumber: number;
  templateId?: number;
  createdAt: string;
  updatedAt: string;
}

interface Shift {
  id: number;
  title: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  position?: string;
  weekScheduleId: number;
}

interface ShiftManagementInterfaceProps {
  scheduleBlockId: number;
  scheduleBlockName: string;
  weekSchedules: WeekSchedule[];
  onShiftClick?: (shift: Shift) => void;
  onShiftDelete?: (shift: Shift) => void;
}

export default function ShiftManagementInterface({
  scheduleBlockId,
  scheduleBlockName,
  weekSchedules,
  onShiftClick,
  onShiftDelete
}: ShiftManagementInterfaceProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Manage shifts across all weeks in this schedule. Click on any shift to edit its details.
          </p>
          
          <MultiWeekCalendarPreview
            scheduleBlockId={scheduleBlockId}
            scheduleBlockName={scheduleBlockName}
            weekSchedules={weekSchedules}
            onShiftClick={onShiftClick}
            onShiftDelete={onShiftDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
}