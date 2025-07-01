import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, MapPin, Users, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  // Fetch existing schedule blocks using unified validation system
  const { data: scheduleBlocks, isLoading } = useQuery({
    queryKey: ['/api/scheduler/schedule-blocks'],
    queryFn: async () => {
      const response = await fetch('/api/scheduler/schedule-blocks', {
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

  // Create schedule mutation using unified validation system
  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      const validationData = {
        operation: "create",
        entityType: "scheduleBlock",
        entityId: null,
        data: {
          name: "New Schedule",
          description: "",
          locationId: 1, // Default to first location, user can change in edit mode
          isActive: false // Default to inactive until user configures it
        }
      };
      
      const response = await apiRequest('POST', '/api/validation/execute', validationData);
      const result = await response.json();
      
      // Extract the schedule block ID from the unified validation response
      if (result.success && result.data && result.data.id) {
        return { id: result.data.id };
      }
      
      throw new Error('Failed to create schedule - validation failed or no ID returned');
    },
    onSuccess: (data: any) => {
      console.log('Create schedule response:', data);
      
      // Ensure we have a valid schedule ID
      if (!data || !data.id) {
        console.error('Invalid response from create schedule:', data);
        toast({
          title: "Creation Warning",
          description: "Schedule created but ID is missing. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }
      
      // Invalidate the schedule list to show the new schedule
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/schedule-blocks'] });
      
      // Add a small delay to ensure database consistency before navigation
      setTimeout(() => {
        navigate(`/scheduler/edit/${data.id}`);
      }, 100);
      
      toast({
        title: "Schedule Created",
        description: "New schedule created successfully. You can now configure it.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error?.message || "Failed to create schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateNew = () => {
    createScheduleMutation.mutate();
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
        
        <Button 
          onClick={handleCreateNew} 
          disabled={createScheduleMutation.isPending}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {createScheduleMutation.isPending ? "Creating..." : "Create New Schedule"}
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
            <Button 
              onClick={handleCreateNew} 
              disabled={createScheduleMutation.isPending}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {createScheduleMutation.isPending ? "Creating..." : "Create Your First Schedule"}
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
                    <Badge 
                      className={`${schedule.isActive ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
                    >
                      {schedule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
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