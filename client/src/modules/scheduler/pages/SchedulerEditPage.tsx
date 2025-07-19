import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/modules/auth';
import { useSchedulerPermissions } from '../hooks/useSchedulerPermissions';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator';
import { apiRequest } from '@/lib/queryClient';
import { insertScheduleBlockSchema, type InsertScheduleBlock } from '@shared/schema';
import type { Location } from '@shared/schema';
import type { ShiftFormData } from '../types/scheduler.types';
import CompetencySelector from '../components/CompetencySelector';
import ShiftManagementInterface from '../components/ShiftManagementInterface';
import { useDeleteShift, useWeekScheduleShifts, useUpdateShift } from '../hooks/useSchedulerData';

export default function SchedulerEditPage() {
  const params = useParams();
  const { scheduleId } = params;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  const queryClient = useQueryClient();
  
  // Shift management hooks
  const deleteShiftMutation = useDeleteShift();
  const updateShiftMutation = useUpdateShift();
  
  // Fetch week schedules for this schedule block
  const { data: weekSchedules = [] } = useQuery({
    queryKey: ['/api/validation/v3/execute', 'weekSchedule', 'list', scheduleId],
    queryFn: async () => {
      console.log('🔍 WEEK SCHEDULES: Fetching for schedule block:', scheduleId);
      const response = await apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'list',
        entityType: 'weekSchedule',
        data: { scheduleBlockId: parseInt(scheduleId) },
        context: {}
      }, { unpackVE30: true });
      
      console.log('🔍 WEEK SCHEDULES: Response (VE30 unpacked):', response);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!scheduleId,
    staleTime: 2 * 60 * 1000,
  });

  // Edit mode only - scheduleId is required
  if (!scheduleId) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Invalid schedule ID. Please check the URL.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State
  const [activeTab, setActiveTab] = useState<'basic-info' | 'requirements' | 'schedule'>('basic-info');
  
  // Shift editing state (Phase 1 implementation)
  const [editingShift, setEditingShift] = useState<any>(null);
  const [showGroupEditDialog, setShowGroupEditDialog] = useState(false);
  const [groupEditDialogShift, setGroupEditDialogShift] = useState<any>(null);

  // Form setup
  const form = useForm<InsertScheduleBlock>({
    resolver: zodResolver(insertScheduleBlockSchema),
    defaultValues: {
      name: '',
      description: '',
      locationId: 0,
      isActive: true
    }
  });

  // Shift form setup (for editing existing shifts)
  const shiftForm = useForm<ShiftFormData>({
    defaultValues: {
      title: '',
      position: '',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      description: '',
      competencyRequirements: []
    }
  });

  // Fetch schedule block data
  const { data: scheduleData, isLoading, error } = useQuery({
    queryKey: ['/api/validation/v3/execute', 'scheduleBlock', 'read', scheduleId],
    queryFn: async () => {
      console.log('🔍 SCHEDULER EDIT: Loading schedule ID:', scheduleId);
      const scheduleData = await apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'read',
        entityType: 'scheduleBlock',
        data: { id: parseInt(scheduleId) },
        context: {}
      }, { unpackVE30: true });
      
      console.log('🔍 SCHEDULER EDIT: VE30 unpacker result:', scheduleData);
      return scheduleData;
    },
    enabled: !!scheduleId,
  });

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return response.json();
    },
    enabled: permissions.canEditSchedules,
  });

  // Populate form when schedule data loads
  useEffect(() => {
    if (scheduleData && scheduleData.name) {
      form.reset({
        name: scheduleData.name || '',
        description: scheduleData.description || '',
        locationId: scheduleData.locationId || 0,
        isActive: scheduleData.isActive
      });
    }
  }, [scheduleData, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: InsertScheduleBlock) => {
      const response = await apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'update',
        entityType: 'scheduleBlock',
        data: { id: parseInt(scheduleId), ...data },
        context: {}
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "✅ Schedule Updated",
        description: "All changes have been saved successfully.",
        duration: 3000,
      });
      
      // Enhanced cache invalidation for immediate cross-tab updates
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'scheduleBlock'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/schedule-blocks'] });
      queryClient.refetchQueries({ queryKey: ['/api/validation/v3/execute', 'scheduleBlock', parseInt(scheduleId)] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-save configuration using ValidationEngine30
  const formValues = form.watch();
  const autoSave = useAutoSave(formValues, {
    endpoint: `/api/validation/v3/execute`,
    method: 'POST',
    debounceMs: 2000,
    minContentLength: 1,
    enabled: permissions.canEditSchedules && !!scheduleData,
    validateData: (data) => {
      // Only auto-save if data is valid and has changed from initial values
      return !!(data.name && data.name.trim().length > 0) || data.isActive !== undefined;
    },
    transformData: (data) => {
      // Transform form data to validation engine format
      return {
        operation: "update",
        entityType: "scheduleBlock",
        entityId: parseInt(scheduleId),
        data: {
          id: parseInt(scheduleId),
          name: data.name || '',
          description: data.description || '',
          locationId: data.locationId || 0,
          isActive: data.isActive
        }
      };
    },
    onSaveSuccess: () => {
      // Enhanced success feedback with cross-tab synchronization
      toast({
        title: "✅ Changes Saved",
        description: "Schedule status updated successfully",
        duration: 3000,
      });
      
      // Invalidate queries to refresh data across all tabs
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'scheduleBlock'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/schedule-blocks'] });
      
      // Force immediate refetch of current schedule data
      queryClient.refetchQueries({ queryKey: ['/api/validation/v3/execute', 'scheduleBlock', parseInt(scheduleId)] });
    },
    onSaveError: (error) => {
      console.error('Auto-save failed:', error);
      toast({
        title: "❌ Save Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    }
  });

  const handleSave = async (data: InsertScheduleBlock) => {
    await updateMutation.mutateAsync(data);
  };

  const handleShiftClick = (shift: any) => {
    // Check if this shift belongs to a group
    if (shift.shiftGroupId) {
      // Show group editing dialog
      setGroupEditDialogShift(shift);
      setShowGroupEditDialog(true);
    } else {
      // Edit single shift directly
      editSingleShift(shift);
    }
  };

  const editSingleShift = (shift: any) => {
    console.log('🎯 SHIFT EDIT: Editing single shift:', shift);
    setEditingShift(shift);
    
    // Populate shift form with existing data
    shiftForm.reset({
      title: shift.title || '',
      position: shift.position || '',
      startTime: shift.startTime || '',
      endTime: shift.endTime || '',
      daysOfWeek: [shift.dayOfWeek || ''],
      description: shift.description || '',
      competencyRequirements: shift.competencyRequirements || []
    });
    
    // Auto-switch to Requirements tab where editing interface appears
    setActiveTab('requirements');
    
    toast({
      title: "Shift selected for editing",
      description: `Editing ${shift.position || shift.title} shift for ${shift.dayOfWeek}.`,
    });
  };

  const editShiftGroup = (shift: any) => {
    console.log('🎯 SHIFT EDIT: Editing shift group:', shift);
    // Find all shifts in the same group across all weeks
    const allShifts: any[] = [];
    weekSchedules.forEach((weekSchedule: any) => {
      if (weekSchedule.shifts) {
        allShifts.push(...weekSchedule.shifts);
      }
    });
    
    const groupShifts = allShifts.filter((s: any) => s.shiftGroupId === shift.shiftGroupId);
    const groupDays = groupShifts.map((s: any) => s.dayOfWeek);
    
    setEditingShift(shift);
    
    shiftForm.reset({
      title: shift.title || '',
      position: shift.position || '',
      startTime: shift.startTime || '',
      endTime: shift.endTime || '',
      daysOfWeek: groupDays, // Set all days from the group
      description: shift.description || '',
      competencyRequirements: shift.competencyRequirements || []
    });
    
    // Historical behavior: No tab switching, editing appears contextually
    
    toast({
      title: "Group selected for editing",
      description: `Editing ${shift.position || shift.title} shift group (${groupDays.length} days)`,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="p-6">
            <p>Loading schedule data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load schedule data. Please try refreshing the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="ghost"
                onClick={() => navigate('/scheduler')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Schedules
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                Edit Week Schedule: {scheduleData?.name || 'Loading...'}
              </h1>
              {scheduleData && (
                <Badge 
                  className={`${scheduleData.isActive ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
                >
                  {scheduleData.isActive ? 'Active' : 'Inactive'}
                  {autoSave.isSaving && <span className="ml-1 animate-pulse">●</span>}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-2">
              Update the details for your weekly schedule template
            </p>
          </div>
          <AutoSaveIndicator
            status={autoSave.status}
            lastSaved={autoSave.lastSaved}
            hasUnsavedChanges={autoSave.hasUnsavedChanges}
            error={autoSave.error}
            onManualSave={autoSave.manualSave}
            variant="button"
            className="flex-shrink-0"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="basic-info">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter schedule name" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter schedule description" 
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id.toString()}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className={`text-base font-medium ${field.value ? 'text-green-600' : 'text-red-600'}`}>
                            {field.value ? 'Active Schedule' : 'Inactive Schedule'}
                          </FormLabel>
                          <div className={`text-sm ${field.value ? 'text-green-500' : 'text-red-500'}`}>
                            {field.value ? 'Available for shift creation' : 'Not available for shift creation'}
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={async (newValue) => {
                              // Immediate UI update
                              field.onChange(newValue);
                              
                              // Direct save - bypass auto-save completely
                              try {
                                await updateMutation.mutateAsync({
                                  id: parseInt(scheduleId),
                                  name: form.getValues('name'),
                                  description: form.getValues('description'),
                                  locationId: form.getValues('locationId'),
                                  isActive: newValue
                                });
                                
                                toast({
                                  title: newValue ? "✅ Schedule Activated" : "✅ Schedule Deactivated",
                                  description: "Status saved successfully",
                                  duration: 2000,
                                });
                              } catch (error) {
                                // Revert UI on error
                                field.onChange(!newValue);
                                toast({
                                  title: "❌ Save Failed",
                                  description: "Failed to update status. Please try again.",
                                  variant: "destructive",
                                  duration: 3000,
                                });
                              }
                            }}
                            className={`${field.value ? '!bg-green-600' : '!bg-red-600'} !important`}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements">
          <div className="space-y-4">
            <CompetencySelector 
              scheduleBlockId={parseInt(scheduleId)} 
              locationId={scheduleData?.locationId || 1}
            />
            
            {/* Historical Shift Editing Interface - appears when editingShift is set */}
            {editingShift && (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Shift: {editingShift.position || editingShift.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {editingShift.dayOfWeek} • {editingShift.startTime} - {editingShift.endTime}
                  </p>
                </CardHeader>
                <CardContent>
                  <Form {...shiftForm}>
                    <form onSubmit={shiftForm.handleSubmit(async (data) => {
                      try {
                        console.log('🎯 SHIFT SAVE: Form submitted:', data);
                        console.log('🎯 SHIFT SAVE: editingShift context:', editingShift);
                        
                        // Assemble Russian Doll compliant data structure
                        const shiftUpdateData = {
                          id: editingShift.id,
                          weekScheduleId: editingShift.weekScheduleId,
                          dayOfWeek: editingShift.dayOfWeek,
                          title: data.title,
                          position: data.position,
                          startTime: data.startTime,
                          endTime: data.endTime,
                          maxSlots: editingShift.maxSlots || 1,
                          subscriptionDeadline: editingShift.subscriptionDeadline
                        };
                        
                        console.log('🎯 SHIFT SAVE: Russian Doll data assembled:', shiftUpdateData);
                        
                        // Call ValidationEngine30 update
                        await updateShiftMutation.mutateAsync({
                          id: editingShift.id,
                          data: shiftUpdateData
                        });
                        
                        // Clear editing state and show success
                        setEditingShift(null);
                        toast({
                          title: "Shift Updated",
                          description: "Changes saved successfully.",
                        });
                      } catch (error) {
                        console.error('🎯 SHIFT SAVE: Error:', error);
                        toast({
                          title: "Save Failed",
                          description: error instanceof Error ? error.message : 'An error occurred while saving the shift.',
                          variant: "destructive"
                        });
                      }
                    })} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={shiftForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Shift Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Morning Shift" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={shiftForm.control}
                          name="position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Position</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Manager, Staff" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={shiftForm.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={shiftForm.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={shiftForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Additional shift details..."
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-between">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => {
                            setEditingShift(null);
                            toast({
                              title: "Edit Cancelled",
                              description: "Shift editing cancelled.",
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={updateShiftMutation.isPending}
                        >
                          {updateShiftMutation.isPending ? 'Saving...' : 'Save Shift Changes'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <ShiftManagementInterface
            scheduleBlockId={parseInt(scheduleId)}
            scheduleBlockName={scheduleData?.name || 'Schedule'}
            weekSchedules={weekSchedules}
            onShiftClick={handleShiftClick}
            onShiftDelete={async (shift) => {
              try {
                await deleteShiftMutation.mutateAsync(shift.id);
                toast({
                  title: "Shift Deleted",
                  description: "Shift has been removed successfully."
                });
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to delete shift.",
                  variant: "destructive"
                });
              }
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Group Edit Dialog (Phase 1 implementation) */}
      <Dialog open={showGroupEditDialog} onOpenChange={setShowGroupEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Shift Group</DialogTitle>
            <DialogDescription>
              This shift belongs to a group of shifts. Choose how you want to edit it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Shift: {groupEditDialogShift?.position || groupEditDialogShift?.title}
            </div>
            <div className="text-sm text-muted-foreground">
              Day: {groupEditDialogShift?.dayOfWeek}
            </div>
          </div>

          <DialogFooter className="space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                if (groupEditDialogShift) {
                  editSingleShift(groupEditDialogShift);
                }
                setShowGroupEditDialog(false);
              }}
            >
              Edit This Day Only
            </Button>
            <Button
              onClick={() => {
                if (groupEditDialogShift) {
                  editShiftGroup(groupEditDialogShift);
                }
                setShowGroupEditDialog(false);
              }}
            >
              Edit Entire Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}