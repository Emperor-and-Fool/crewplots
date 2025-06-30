import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, MapPin, Users, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLocation } from 'wouter';
import { useAuth } from '@/modules/auth';
import { useSchedulerPermissions } from '../hooks/useSchedulerPermissions';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Location } from '@shared/schema';

export default function SchedulerListPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const permissions = useSchedulerPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing schedule blocks with creator names using packaging service
  const { data: scheduleBlocks, isLoading } = useQuery({
    queryKey: ['/api/scheduler/packages/schedule-blocks'],
    queryFn: async () => {
      const response = await fetch('/api/scheduler/packages/schedule-blocks', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch schedule blocks');
      return response.json();
    }
  });

  // Fetch locations for display
  const { data: locations } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

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

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      return apiRequest('DELETE', `/api/scheduler/packages/delete/${scheduleId}`);
    }
  });

  // Toggle schedule status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ scheduleId, isActive }: { scheduleId: number; isActive: boolean }) => {
      return apiRequest('PUT', `/api/scheduler/packages/schedule-blocks/${scheduleId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/packages/schedule-blocks'] });
      toast({
        title: "Schedule status updated",
        description: "The schedule status has been changed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update schedule status",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleDeleteSchedule = (scheduleId: number, closeDialog: () => void) => {
    deleteScheduleMutation.mutate(scheduleId, {
      onSuccess: () => {
        closeDialog();
        queryClient.invalidateQueries({ queryKey: ['/api/scheduler/packages/schedule-blocks'] });
        toast({
          title: "Schedule deleted successfully",
          description: "The schedule and all its shifts have been permanently removed"
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to delete schedule",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  const handleToggleStatus = (scheduleId: number, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ 
      scheduleId, 
      isActive: !currentStatus 
    });
  };

  // Delete confirmation component with counts
  const DeleteConfirmationDialog = ({ schedule }: { schedule: any }) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    
    const deletionInfoQuery = useQuery({
      queryKey: ['/api/scheduler/packages/delete-info', schedule.id],
      queryFn: async () => {
        const response = await fetch(`/api/scheduler/packages/delete-info/${schedule.id}`, {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch deletion info');
        return response.json();
      },
      enabled: dialogOpen // Only fetch when dialog is open
    });

    return (
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={deleteScheduleMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{schedule.name}"? 
              {deletionInfoQuery.data && (
                <div className="mt-2 p-3 bg-red-50 rounded-md">
                  <div className="text-sm text-red-800">
                    This will permanently remove:
                    <ul className="mt-1 list-disc list-inside">
                      <li>{deletionInfoQuery.data.weekSchedulesCount} week schedule{deletionInfoQuery.data.weekSchedulesCount !== 1 ? 's' : ''}</li>
                      <li>{deletionInfoQuery.data.shiftsCount} shift{deletionInfoQuery.data.shiftsCount !== 1 ? 's' : ''}</li>
                    </ul>
                  </div>
                </div>
              )}
              {deletionInfoQuery.isLoading && (
                <div className="mt-2 text-sm text-gray-500">Loading deletion details...</div>
              )}
              <div className="mt-2 text-sm text-gray-600">
                This action cannot be undone.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteSchedule(schedule.id, () => setDialogOpen(false))}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteScheduleMutation.isPending || deletionInfoQuery.isLoading}
            >
              {deleteScheduleMutation.isPending ? "Deleting..." : "Delete Schedule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Schedules
          </h1>
          <p className="text-gray-600 mt-2">
            Manage multi-week schedules containing week schedules and shift planning
          </p>
        </div>
        
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Schedule
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading schedules...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!scheduleBlocks || scheduleBlocks.length === 0) && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedules</h3>
            <p className="text-gray-600 mb-6">
              Create your first schedule to get started with multi-week planning.
            </p>
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Schedule
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Schedule Grid */}
      {!isLoading && scheduleBlocks && scheduleBlocks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scheduleBlocks.map((schedule: any) => {
            const location = (locations as Location[])?.find(l => l.id === schedule.locationId);
            
            return (
              <Card key={schedule.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{schedule.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${schedule.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {schedule.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <Switch
                        checked={schedule.isActive}
                        onCheckedChange={() => handleToggleStatus(schedule.id, schedule.isActive)}
                        disabled={toggleStatusMutation.isPending}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                      />
                    </div>
                  </div>
                  {schedule.description && (
                    <p className="text-sm text-gray-600 mt-2">{schedule.description}</p>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{location?.name || 'Unknown Location'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Created {new Date(schedule.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {schedule.creatorName && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>created by: {schedule.creatorName}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Max {schedule.maxWeeks} weeks</span>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditSchedule(schedule.id)}
                      className="flex-1"
                    >
                      Edit Schedule
                    </Button>
                    
                    <DeleteConfirmationDialog schedule={schedule} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}