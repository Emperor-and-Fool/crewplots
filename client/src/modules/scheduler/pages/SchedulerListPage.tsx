import React from 'react';
import { Plus, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useAuth } from '@/modules/auth';
import { useSchedulerPermissions } from '../hooks/useSchedulerPermissions';
import { useWeekSchedules } from '../hooks/useSchedulerData';
import type { Location } from '@shared/schema';

export default function SchedulerListPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const permissions = useSchedulerPermissions();
  
  const { data: weekSchedules = [], isLoading } = useWeekSchedules();

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

  const handleCreateNew = () => {
    navigate('/scheduler/new');
  };

  const handleEditSchedule = (scheduleId: number) => {
    navigate(`/scheduler/edit/${scheduleId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Week Schedules</h1>
          <p className="text-gray-600">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Week Schedules</h1>
          <p className="text-gray-600 mt-2">Manage your weekly scheduling templates</p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Schedule
        </Button>
      </div>

      {weekSchedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No schedules yet</h3>
            <p className="text-gray-600 mb-6">Create your first week schedule to get started</p>
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {weekSchedules.map((schedule: any) => (
            <Card key={schedule.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{schedule.name}</h3>
                      <Badge variant={schedule.isActive ? "default" : "secondary"}>
                        {schedule.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    {schedule.description && (
                      <p className="text-gray-600 mb-3">{schedule.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Location ID: {schedule.locationId}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created: {new Date(schedule.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => handleEditSchedule(schedule.id)}
                    >
                      Edit & Add Shifts
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}