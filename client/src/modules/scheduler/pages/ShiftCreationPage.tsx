import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/hooks/use-toast';
import { useSchedulerPermissions } from '../hooks/useSchedulerPermissions';
import { useWeekSchedules, useWeekSchedule, useWeekScheduleShifts } from '../hooks/useSchedulerData';
import WeekScheduleEditor from '../components/WeekScheduleEditor';
import ShiftCreationPanel from '../components/ShiftCreationPanel';
import WeeklyCalendarPreview from '../components/WeeklyCalendarPreview';
import type { WeekScheduleWithShifts } from '../types/scheduler.types';

export default function ShiftCreationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  
  const [selectedWeekScheduleId, setSelectedWeekScheduleId] = useState<number | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // Data queries
  const { data: weekSchedules, isLoading: weekSchedulesLoading } = useWeekSchedules();
  const { data: selectedWeekSchedule } = useWeekSchedule(selectedWeekScheduleId);
  const { data: shifts, refetch: refetchShifts } = useWeekScheduleShifts(selectedWeekScheduleId);

  // Permission check
  if (!permissions.canCreateShifts) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the scheduler.</p>
        </div>
      </div>
    );
  }

  // Auto-select first week schedule on load (always-edit mode)
  useEffect(() => {
    if (weekSchedules && weekSchedules.length > 0 && !selectedWeekScheduleId && !isCreatingNew) {
      setSelectedWeekScheduleId(weekSchedules[0].id);
    }
  }, [weekSchedules, selectedWeekScheduleId, isCreatingNew]);

  const handleWeekScheduleSelect = (value: string) => {
    if (value === "CREATE_NEW") {
      setIsCreatingNew(true);
      setSelectedWeekScheduleId(null);
    } else {
      setIsCreatingNew(false);
      setSelectedWeekScheduleId(parseInt(value));
    }
  };

  const handleShiftClick = (shift: any) => {
    // Populate shift form for editing
    setActiveTab("basic");
    toast({
      title: "Edit mode",
      description: `Selected ${shift.title} for editing`,
    });
  };

  const handleShiftCreated = () => {
    refetchShifts();
  };

  const currentWeekSchedule: WeekScheduleWithShifts | null = selectedWeekSchedule ? {
    ...selectedWeekSchedule,
    shifts: shifts || []
  } : null;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Shift Creation</h1>
            <p className="text-muted-foreground">
              {isCreatingNew ? 'Create a new week schedule' : 'Manage week schedules and shifts'}
            </p>
          </div>
        </div>

        {/* Week Schedule Selector - Always-Edit Mode */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Week Schedule:</label>
          <Select 
            value={isCreatingNew ? "CREATE_NEW" : selectedWeekScheduleId?.toString() || ""}
            onValueChange={handleWeekScheduleSelect}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select or create schedule" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CREATE_NEW">
                + Create New Week Schedule
              </SelectItem>
              {weekSchedules?.map((schedule: any) => (
                <SelectItem key={schedule.id} value={schedule.id.toString()}>
                  {schedule.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Week Schedule Editor - Always in Edit Mode */}
          <WeekScheduleEditor 
            weekSchedule={currentWeekSchedule}
            onWeekScheduleChange={(updatedSchedule) => {
              // Handle week schedule updates
              if (!selectedWeekScheduleId && updatedSchedule.id) {
                setSelectedWeekScheduleId(updatedSchedule.id);
                setIsCreatingNew(false);
              }
            }}
          />

          {/* Shift Creation Panel */}
          {!isCreatingNew && currentWeekSchedule && (
            <ShiftCreationPanel 
              weekSchedule={currentWeekSchedule}
              onShiftCreated={handleShiftCreated}
            />
          )}

          {/* Create New Schedule Prompt */}
          {isCreatingNew && (
            <Card>
              <CardContent className="py-6">
                <div className="text-center text-muted-foreground">
                  <p className="mb-2">Save the week schedule above to start adding shifts</p>
                  <p className="text-sm">Once saved, the shift creation panel will appear</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar - Calendar Preview */}
        <div className="lg:col-span-1">
          <WeeklyCalendarPreview 
            shifts={shifts || []}
            weekScheduleName={currentWeekSchedule?.name || 'New Schedule'}
            onShiftClick={handleShiftClick}
          />
        </div>
      </div>

      {/* Loading States */}
      {weekSchedulesLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading week schedules...</p>
          </div>
        </div>
      )}
    </div>
  );
}