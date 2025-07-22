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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  console.log('🚨 SCHEDULER EDIT PAGE: Component function executing!');
  const params = useParams();
  const { scheduleId } = params;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  const queryClient = useQueryClient();
  
  // Creation mode detection
  const isCreationMode = scheduleId === 'new';
  const scheduleIdNumber = isCreationMode ? null : parseInt(scheduleId || '0');
  
  // Shift management hooks
  const deleteShiftMutation = useDeleteShift();
  const updateShiftMutation = useUpdateShift();
  
  // Fetch week schedules for this schedule block (only in edit mode)
  const { data: weekSchedules = [] } = useQuery({
    queryKey: ['/api/validation/v3/execute', 'weekSchedule', 'list', scheduleId],
    queryFn: async () => {
      console.log('🔍 WEEK SCHEDULES: Fetching for schedule block:', scheduleId);
      const response = await apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'list',
        entityType: 'weekSchedule',
        data: { scheduleBlockId: scheduleIdNumber },
        context: {}
      }, { unpackVE30: true });
      
      console.log('🔍 WEEK SCHEDULES: Response (VE30 unpacked):', response);
      console.log('🔍 WEEK SCHEDULES: First item structure:', response?.[0]);
      console.log('🔍 WEEK SCHEDULES: Has weekStructureLocked field?', response?.[0]?.weekStructureLocked);
      return Array.isArray(response) ? response : [];
    },
    enabled: !isCreationMode && !!scheduleIdNumber,
    staleTime: 2 * 60 * 1000,
  });

  // Validate schedule ID (must be number or 'new')
  if (!scheduleId || (!isCreationMode && !scheduleIdNumber)) {
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
  const [showWeekConfirmDialog, setShowWeekConfirmDialog] = useState(false);
  const [pendingWeekCount, setPendingWeekCount] = useState<number | null>(null);
  const [selectedWeekCount, setSelectedWeekCount] = useState<number | null>(null);

  // Form setup - different defaults for creation vs edit mode
  const form = useForm<InsertScheduleBlock>({
    resolver: zodResolver(insertScheduleBlockSchema),
    defaultValues: isCreationMode ? {
      name: '',
      description: '',
      locationId: 1,  // Default to first location (Grand Hotel Amsterdam)
      isActive: false  // Default to inactive for new schedules
    } : {
      name: '',
      description: '',
      locationId: 1,  // Default to first location 
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

  // Fetch schedule block data (only in edit mode)
  const { data: scheduleData, isLoading, error } = useQuery({
    queryKey: ['/api/validation/v3/execute', 'scheduleBlock', 'read', scheduleId],
    queryFn: async () => {
      console.log('🔍 SCHEDULER EDIT: Loading schedule ID:', scheduleId);
      const scheduleData = await apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'read',
        entityType: 'scheduleBlock',
        data: { id: scheduleIdNumber },
        context: {}
      }, { unpackVE30: true });
      
      console.log('🔍 SCHEDULER EDIT: VE30 unpacker result:', scheduleData);
      return scheduleData;
    },
    enabled: !isCreationMode && !!scheduleIdNumber,
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

  // Populate form when schedule data loads (only in edit mode)
  useEffect(() => {
    if (!isCreationMode && scheduleData && scheduleData.name) {
      form.reset({
        name: scheduleData.name || '',
        description: scheduleData.description || '',
        locationId: scheduleData.locationId || 0,
        isActive: scheduleData.isActive
      });
    }
  }, [scheduleData, form, isCreationMode]);

  // Create mutation (for creation mode)
  const createMutation = useMutation({
    mutationFn: async (data: InsertScheduleBlock) => {
      const response = await apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'create',
        entityType: 'scheduleBlock',
        data: {
          name: data.name,
          description: data.description,
          locationId: data.locationId,
          isActive: data.isActive,
          // maxWeeks removed - week count is now calculated from weekSchedules.length
        },
        context: {}
      }, { unpackVE30: true });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "✅ Schedule Created",
        description: "Schedule created successfully. You can now configure it.",
        duration: 3000,
      });
      
      // Navigate to edit mode with the new schedule ID
      if (data && data.id) {
        navigate(`/scheduler/edit/${data.id}`);
      }
      
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'scheduleBlock'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error?.message || "Failed to create schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: InsertScheduleBlock) => {
      const response = await apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'update',
        entityType: 'scheduleBlock',
        data: { id: scheduleIdNumber, ...data },
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
      queryClient.refetchQueries({ queryKey: ['/api/validation/v3/execute', 'scheduleBlock', scheduleIdNumber] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to lock week structure and create week blocks
  const lockWeekStructureMutation = useMutation({
    mutationFn: async ({ weekCount }: { weekCount: number }) => {
      console.log('🔄 LOCK MUTATION: Starting week structure lock via scheduleBlock update', { weekCount, scheduleBlockId: scheduleIdNumber });
      
      // Phase 2: Update scheduleBlock with maxWeeks and trigger week creation
      const requestData = {
        operation: 'update',
        entityType: 'scheduleBlock',
        data: {
          id: scheduleIdNumber,
          maxWeeks: weekCount,
          weekStructureAction: 'lock', // Triggers backend week creation
          isActive: true // Activate schedule after locking
        },
        context: {}
      };
      
      console.log('🔄 LOCK MUTATION: Updating scheduleBlock with week lock data:', requestData);
      const result = await apiRequest('POST', '/api/validation/v3/execute', requestData);
      console.log('🔄 LOCK MUTATION: ScheduleBlock update completed, result:', result);
      
      return { success: true, weekCount };
    },
    onSuccess: ({ weekCount }) => {
      toast({
        title: "✅ Week Structure Locked",
        description: `${weekCount} week${weekCount > 1 ? 's' : ''} created successfully. Structure is now immutable.`,
        duration: 4000,
      });
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'scheduleBlock'] });
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'weekSchedule'] });
    },
    onError: (error: any) => {
      toast({
        title: "Lock Failed",
        description: error?.message || "Failed to lock week structure. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-save configuration using ValidationEngine30 (only in edit mode)
  const formValues = form.watch();
  const autoSave = useAutoSave(formValues, {
    endpoint: `/api/validation/v3/execute`,
    method: 'POST',
    debounceMs: 2000,
    minContentLength: 1,
    enabled: false, // TEMPORARILY DISABLED FOR DEBUGGING
    validateData: (data) => {
      // Only auto-save if data is valid and has changed from initial values
      return !!(data.name && data.name.trim().length > 0) || data.isActive !== undefined;
    },
    transformData: (data) => {
      // Transform form data to validation engine format
      return {
        operation: "update",
        entityType: "scheduleBlock",
        entityId: scheduleIdNumber,
        data: {
          id: scheduleIdNumber,
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
    if (isCreationMode) {
      await createMutation.mutateAsync(data);
    } else {
      await updateMutation.mutateAsync(data);
    }
  };

  const handleWeekCountConfirmation = async () => {
    console.log('🔘 BUTTON CLICK: handleWeekCountConfirmation called');
    console.log('🔘 STATE CHECK: pendingWeekCount =', pendingWeekCount);
    console.log('🔘 STATE CHECK: scheduleIdNumber =', scheduleIdNumber);
    console.log('🔘 STATE CHECK: scheduleId (param) =', scheduleId);
    console.log('🔘 STATE CHECK: Condition check =', !!(pendingWeekCount && scheduleIdNumber));
    
    if (pendingWeekCount && scheduleIdNumber) {
      console.log('🔘 CONDITION PASSED: Calling lockWeekStructureMutation.mutateAsync');
      // maxWeeks field removed - week count now calculated from weekSchedules.length
      
      // Lock the structure and create week blocks
      await lockWeekStructureMutation.mutateAsync({ weekCount: pendingWeekCount });
      
      // Reset all week-related state
      setPendingWeekCount(null);
      setSelectedWeekCount(null);
      setShowWeekConfirmDialog(false);
    } else {
      console.log('🚨 CONDITION FAILED: Week count confirmation blocked');
      console.log('🚨 FAILED REASON: pendingWeekCount:', pendingWeekCount, 'scheduleIdNumber:', scheduleIdNumber);
    }
  };

  const handleWeekCountCancel = () => {
    setPendingWeekCount(null);
    setSelectedWeekCount(null);
    setShowWeekConfirmDialog(false);
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
                {isCreationMode 
                  ? 'Create New Schedule' 
                  : `Edit Week Schedule: ${scheduleData?.name || 'Loading...'}`}
              </h1>
              {!isCreationMode && scheduleData && (
                <Badge 
                  className={`${scheduleData.isActive ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
                >
                  {scheduleData.isActive ? 'Active' : 'Inactive'}
                  {autoSave.status === 'saving' && <span className="ml-1 animate-pulse">●</span>}
                </Badge>
              )}
              {isCreationMode && (
                <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
                  New Schedule
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-2">
              {isCreationMode 
                ? 'Enter basic details to create a new schedule template'
                : 'Update the details for your weekly schedule template'}
            </p>
          </div>
          {!isCreationMode && (
            <AutoSaveIndicator
              status={autoSave.status}
              lastSaved={autoSave.lastSaved}
              hasUnsavedChanges={autoSave.hasUnsavedChanges}
              error={autoSave.error}
              onManualSave={autoSave.manualSave}
              variant="button"
              className="flex-shrink-0"
            />
          )}
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

                  {/* Week Count Configuration */}
                  {!isCreationMode && (
                    <div className="rounded-lg border p-4">
                      <div className="space-y-4">
                        <div className="text-sm font-medium">Week Structure</div>
                        
                        {weekSchedules?.some(w => w.weekStructureLocked) ? (
                          // Locked state - show read-only info
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                              🔒 {weekSchedules?.length || 0} week{(weekSchedules?.length || 0) !== 1 ? 's' : ''} (locked and cannot be modified)
                            </div>
                            {process.env.NODE_ENV === 'development' && (
                              <div className="text-xs text-blue-600">
                                DEBUG: weekSchedules.length={weekSchedules?.length}, anyWeekLocked={weekSchedules?.some(w => w.weekStructureLocked)}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Unlocked state - show dropdown for one-time configuration
                          <div className="space-y-3">
                            <div className="text-sm text-muted-foreground">
                              Current: {weekSchedules?.length || 0} week{(weekSchedules?.length || 0) !== 1 ? 's' : ''}
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <Select 
                                value={selectedWeekCount?.toString() || ""} 
                                onValueChange={(value) => setSelectedWeekCount(parseInt(value))}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Set number of weeks" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => (
                                    <SelectItem key={week} value={week.toString()}>
                                      {week} week{week > 1 ? 's' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!selectedWeekCount || lockWeekStructureMutation.isPending}
                                onClick={() => {
                                  console.log('🔘 CONFIRM BUTTON: Clicked, selectedWeekCount =', selectedWeekCount);
                                  if (selectedWeekCount) {
                                    console.log('🔘 CONFIRM BUTTON: Setting pendingWeekCount to', selectedWeekCount);
                                    setPendingWeekCount(selectedWeekCount);
                                    setShowWeekConfirmDialog(true);
                                  } else {
                                    console.log('🚨 CONFIRM BUTTON: selectedWeekCount is null/undefined');
                                  }
                                }}
                              >
                                {lockWeekStructureMutation.isPending ? 'Processing...' : 'Confirm Week Count'}
                              </Button>
                            </div>
                            
                            <div className="text-xs text-orange-600">
                              ⚠️ Warning: You can only set the week count once. After confirmation, the structure will be locked permanently.
                            </div>
                            
                            {process.env.NODE_ENV === 'development' && (
                              <div className="text-xs text-blue-600">
                                DEBUG: weekSchedules.length={weekSchedules?.length}, anyWeekLocked={weekSchedules?.some(w => w.weekStructureLocked)}, selectedWeekCount={selectedWeekCount}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                              
                              // Only save immediately in edit mode
                              if (!isCreationMode) {
                                try {
                                  await updateMutation.mutateAsync({
                                    name: form.getValues('name'),
                                    description: form.getValues('description'),
                                    locationId: form.getValues('locationId'),
                                    isActive: newValue,
                                    createdBy: 1
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
                    disabled={isCreationMode ? createMutation.isPending : updateMutation.isPending}
                  >
                    {isCreationMode 
                      ? (createMutation.isPending ? 'Creating...' : 'Create Schedule')
                      : (updateMutation.isPending ? 'Saving...' : 'Save Changes')
                    }
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements">
          <div className="space-y-4">
            {isCreationMode ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-center">
                    Create the schedule first to set up requirements and shifts.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <CompetencySelector 
                scheduleBlockId={scheduleIdNumber || 0} 
                locationId={scheduleData?.locationId || 1}
              />
            )}
            
            {/* Historical Shift Editing Interface - appears when editingShift is set */}
            {!isCreationMode && editingShift && (
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
          {isCreationMode ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                  Create the schedule first to manage shifts and weekly calendar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Week Block Information Display */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Schedule Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Schedule Name</label>
                      <p className="text-base">{scheduleData?.name || 'Untitled Schedule'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Week Block Configuration</label>
                      <p className="text-base font-medium">
                        {scheduleData?.maxWeeks || 1} {(scheduleData?.maxWeeks || 1) === 1 ? 'Week' : 'Weeks'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fixed setting - cannot be modified after creation
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shift Management Interface */}
              <ShiftManagementInterface
                scheduleBlockId={scheduleIdNumber || 0}
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
            </div>
          )}
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

      {/* Week Count Confirmation Dialog */}
      <AlertDialog open={showWeekConfirmDialog} onOpenChange={setShowWeekConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set Number of Weeks?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to set the number of weeks to <strong>{pendingWeekCount}</strong>? 
              <br /><br />
              <span className="text-orange-600 font-medium">⚠️ You can only set this number once.</span>
              <br />
              After confirmation, the week structure will be locked and {pendingWeekCount} week schedule{(pendingWeekCount || 0) > 1 ? 's' : ''} will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleWeekCountCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleWeekCountConfirmation}
              disabled={lockWeekStructureMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {lockWeekStructureMutation.isPending ? 'Creating...' : `Yes, Create ${pendingWeekCount} Week${(pendingWeekCount || 0) > 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}