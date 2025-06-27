import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/hooks/use-toast';
import { useSchedulerPermissions } from '../hooks/useSchedulerPermissions';
import { useCreateWeekSchedule } from '../hooks/useSchedulerData';
import WeekScheduleEditor from '../components/WeekScheduleEditor';
import type { WeekScheduleFormData } from '../types/scheduler.types';

export default function SchedulerCreatePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  
  const createWeekScheduleMutation = useCreateWeekSchedule();

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

  const handleBackToList = () => {
    navigate('/scheduler');
  };

  const handleSaveSchedule = async (data: WeekScheduleFormData) => {
    try {
      const response = await createWeekScheduleMutation.mutateAsync(data);
      toast({ description: 'Week schedule created successfully' });
      // Navigate to the edit page with the new schedule ID
      if (response && typeof response === 'object' && 'id' in response) {
        navigate(`/scheduler/edit/${response.id}`);
      } else {
        navigate('/scheduler');
      }
    } catch (error) {
      console.error('Failed to create week schedule:', error);
      toast({ 
        description: 'Failed to create week schedule',
        variant: 'destructive'
      });
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Create New Week Schedule</h1>
          <p className="text-gray-600 mt-2">Set up a new weekly scheduling template</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Schedule Details</CardTitle>
          </CardHeader>
          <CardContent>
            <WeekScheduleEditor
              onSave={handleSaveSchedule}
              onCancel={handleBackToList}
              isCreating={true}
              isLoading={createWeekScheduleMutation.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}