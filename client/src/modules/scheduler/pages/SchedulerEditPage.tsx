import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation, useParams } from 'wouter';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/hooks/use-toast';
import { useSchedulerPermissions } from '../hooks/useSchedulerPermissions';
import { useWeekSchedule, useWeekScheduleShifts, useUpdateWeekSchedule } from '../hooks/useSchedulerData';
import WeekScheduleEditor from '../components/WeekScheduleEditor';
import ShiftCreationPanel from '../components/ShiftCreationPanel';
import WeeklyCalendarPreview from '../components/WeeklyCalendarPreview';
import type { WeekScheduleFormData, ShiftFormData } from '../types/scheduler.types';

export default function SchedulerEditPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  
  const [activeTab, setActiveTab] = useState("schedule");
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);

  const scheduleIdNumber = scheduleId ? parseInt(scheduleId) : null;
  
  // Data queries using URL parameter
  const { data: schedule, isLoading: scheduleLoading, error: scheduleError } = useWeekSchedule(scheduleIdNumber);
  const { data: shifts = [], refetch: refetchShifts } = useWeekScheduleShifts(scheduleIdNumber);
  
  const updateWeekScheduleMutation = useUpdateWeekSchedule();

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

  // Handle invalid schedule ID
  if (scheduleError || (!scheduleLoading && !schedule)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Schedule Not Found</h1>
          <p className="text-gray-600 mb-6">The schedule you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/scheduler')}>
            Back to Schedules
          </Button>
        </div>
      </div>
    );
  }

  if (scheduleLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading Schedule</h1>
          <p className="text-gray-600">Loading schedule details...</p>
        </div>
      </div>
    );
  }

  const handleBackToList = () => {
    navigate('/scheduler');
  };

  const handleSaveSchedule = async (data: WeekScheduleFormData) => {
    if (!scheduleIdNumber) return;
    
    try {
      await updateWeekScheduleMutation.mutateAsync({ id: scheduleIdNumber, data });
      toast({ description: 'Week schedule updated successfully' });
    } catch (error) {
      console.error('Failed to update week schedule:', error);
      toast({ 
        description: 'Failed to update week schedule',
        variant: 'destructive'
      });
    }
  };

  const handleShiftClick = (shift: any) => {
    setEditingShiftId(shift.id);
    setActiveTab("shifts");
  };

  const handleShiftSaved = () => {
    refetchShifts();
    setEditingShiftId(null);
    toast({ description: 'Shift saved successfully' });
  };

  const handleAddNewShift = () => {
    setEditingShiftId(null);
    setActiveTab("shifts");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={handleBackToList}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Schedules
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{schedule?.name}</h1>
          <p className="text-gray-600 mt-2">Edit schedule details and manage shifts</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="schedule">Schedule Details</TabsTrigger>
          <TabsTrigger value="shifts">
            <div className="flex items-center gap-2">
              Shifts
              {shifts.length > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {shifts.length}
                </span>
              )}
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Details</CardTitle>
              </CardHeader>
              <CardContent>
                <WeekScheduleEditor
                  initialData={schedule}
                  onSave={handleSaveSchedule}
                  onCancel={handleBackToList}
                  isCreating={false}
                  isLoading={updateWeekScheduleMutation.isPending}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shift Creation/Edit Panel */}
            <div>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {editingShiftId ? 'Edit Shift' : 'Add New Shift'}
                    </CardTitle>
                    {editingShiftId && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingShiftId(null)}
                      >
                        Add New Instead
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ShiftCreationPanel
                    weekScheduleId={scheduleIdNumber!}
                    editingShiftId={editingShiftId}
                    onShiftSaved={handleShiftSaved}
                    onCancel={() => setEditingShiftId(null)}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Calendar Preview */}
            <div>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Weekly Preview</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleAddNewShift}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Shift
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <WeeklyCalendarPreview
                    shifts={shifts}
                    weekScheduleName={schedule?.name || ''}
                    onShiftClick={handleShiftClick}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}