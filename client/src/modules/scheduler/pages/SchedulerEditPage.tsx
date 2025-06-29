import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Clock, Users, MapPin, Plus, Save, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Location } from '@shared/schema';
import { useSchedulerPermissions } from '../hooks/useSchedulerPermissions';
import WeeklyCalendarPreview from '../components/WeeklyCalendarPreview';

// Schema for week schedule update form
const weekScheduleUpdateSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  description: z.string().optional(),
  locationId: z.number().min(1, 'Location is required'),
  isActive: z.boolean().default(true)
});

// Schema for shift creation form
const shiftCreationSchema = z.object({
  position: z.string().min(1, 'Position is required'),
  daysOfWeek: z.array(z.string()).min(1, 'Select at least one day'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  maxSlots: z.number().min(1, 'Max slots must be at least 1'),
  subscriptionDeadline: z.string().optional(),
  competencyRequirements: z.array(z.object({
    competencyId: z.string(),
    priority: z.enum(['required', 'preferred', 'nice-to-have'])
  })).optional()
});

type WeekScheduleUpdateForm = z.infer<typeof weekScheduleUpdateSchema>;
type ShiftCreationForm = z.infer<typeof shiftCreationSchema>;

export default function SchedulerEditPage() {
  const params = useParams();
  const { scheduleId } = params; // Schedule block ID from URL parameter
  const id = scheduleId; // For backward compatibility with existing code
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  
  // Schedule block-based state
  const [selectedWeekScheduleId, setSelectedWeekScheduleId] = useState<number | null>(null);
  const [hasBeenEdited, setHasBeenEdited] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic-info' | 'requirements' | 'schedule'>('basic-info');
  const [editingShift, setEditingShift] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form setup
  const scheduleForm = useForm<WeekScheduleUpdateForm>({
    resolver: zodResolver(weekScheduleUpdateSchema),
    defaultValues: {
      name: '',
      description: '',
      locationId: 0,
      isActive: true
    }
  });

  const shiftForm = useForm<ShiftCreationForm>({
    resolver: zodResolver(shiftCreationSchema),
    defaultValues: {
      position: '',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      maxSlots: 1,
      subscriptionDeadline: '',
      competencyRequirements: []
    }
  });

  // Fetch schedule block data
  const { data: scheduleBlockData, isLoading: scheduleBlockLoading, error: scheduleBlockError } = useQuery({
    queryKey: ['/api/schedule-blocks', id],
    queryFn: async () => {
      console.log('🔍 FRONTEND: Fetching schedule block with ID:', id);
      console.log('🔍 FRONTEND: Permissions check - canEditSchedules:', permissions.canEditSchedules);
      const response = await fetch(`/api/schedule-blocks/${id}`, {
        credentials: 'include'
      });
      console.log('🔍 FRONTEND: Schedule block response status:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error('Failed to fetch schedule block');
      }
      const data = await response.json();
      console.log('🔍 FRONTEND: Schedule block data received:', data);
      return data;
    },
    enabled: !!id && permissions.canEditSchedules,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 30 * 60 * 1000, // 30 minutes in memory
  });

  // Use schedule block data as the primary source
  const existingSchedule = scheduleBlockData;

  const { data: locations = [] } = useQuery({
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
    staleTime: 10 * 60 * 1000, // 10 minutes cache for locations
    gcTime: 60 * 60 * 1000, // 1 hour in memory
  });

  // Individual fetch for shifts - following CrewMemberProfile pattern
  const { data: shifts = [], isLoading: shiftsLoading, error: shiftsError } = useQuery({
    queryKey: ['/api/week-schedules', scheduleId, 'shifts'],
    queryFn: async () => {
      console.log('🔍 SHIFTS QUERY: Fetching shifts for week schedule:', scheduleId);
      const response = await fetch(`/api/week-schedules/${scheduleId}/shifts`, {
        credentials: 'include'
      });
      console.log('🔍 SHIFTS QUERY: Response status:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error('Failed to fetch shifts');
      }
      const data = await response.json();
      console.log('🔍 SHIFTS QUERY: Shifts data received:', data);
      return data;
    },
    enabled: !!scheduleId && permissions.canEditSchedules,
    staleTime: 2 * 60 * 1000, // 2 minutes cache like CrewMemberProfile
    gcTime: 10 * 60 * 1000, // 10 minutes in memory
  });

  // Use consolidated data as primary source (following the standard pattern)
  const actualScheduleData = existingSchedule;

  // Populate form when schedule data loads
  useEffect(() => {
    if (actualScheduleData && actualScheduleData.name) {
      scheduleForm.reset({
        name: actualScheduleData.name || '',
        description: actualScheduleData.description || '',
        locationId: actualScheduleData.locationId || 0,
        isActive: actualScheduleData.isActive !== false
      });
    }
  }, [actualScheduleData, scheduleForm]);

  // Create a basic info form that syncs with the schedule data for the tabbed interface
  const basicInfoForm = useForm<WeekScheduleUpdateForm>({
    resolver: zodResolver(weekScheduleUpdateSchema),
    defaultValues: {
      name: '',
      description: '',
      locationId: 0,
      isActive: true
    }
  });

  // Keep basicInfoForm in sync with schedule data
  useEffect(() => {
    if (actualScheduleData && actualScheduleData.name) {
      basicInfoForm.reset({
        name: actualScheduleData.name || '',
        description: actualScheduleData.description || '',
        locationId: actualScheduleData.locationId || 0,
        isActive: actualScheduleData.isActive !== false
      });
    }
  }, [actualScheduleData, basicInfoForm]);

  const isLoading = scheduleBlockLoading && !existingSchedule;
  
  // State for controlling view transition
  const [showTabbedInterface, setShowTabbedInterface] = useState(true);

  // Function to go back to initial schedule form
  const handleBackToSchedule = () => {
    setShowTabbedInterface(false);
  };





  // Mutations
  const updateWeekScheduleMutation = useMutation({
    mutationFn: async (data: WeekScheduleUpdateForm) => {
      return await apiRequest('PUT', `/api/week-schedules/${scheduleId}`, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
      // Update selectedWeekScheduleId for schedule block architecture
      // Schedule block architecture - no week schedule ID needed
      setHasBeenEdited(true);
      toast({
        title: "Schedule updated successfully",
        description: "You can now manage shifts for this schedule"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update schedule",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: ShiftCreationForm) => {
      console.log('🚀 FRONTEND: Starting shift creation mutation');
      console.log('🚀 FRONTEND: Form data received:', data);
      console.log('🚀 FRONTEND: Current scheduleId:', scheduleId);
      
      // Generate unique group ID for shifts created together
      const shiftGroupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🚀 FRONTEND: Generated shiftGroupId:', shiftGroupId);
      
      const shiftsToCreate = data.daysOfWeek.map(dayOfWeek => ({
        scheduleId: parseInt(scheduleId || '0'),
        shiftGroupId,
        title: `${data.position} - ${dayOfWeek}`, // Generate title from position and day
        position: data.position,
        dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        maxSlots: data.maxSlots,
        subscriptionDeadline: data.subscriptionDeadline || null,
        competencyRequirements: data.competencyRequirements || [],
        status: 'open' as const // Changed from 'active' to 'open'
      }));

      console.log('🚀 FRONTEND: Shifts to create:', shiftsToCreate);
      console.log('🚀 FRONTEND: Making API requests to:', `/api/week-schedules/${scheduleId}/shifts`);

      const promises = shiftsToCreate.map((shift, index) => {
        console.log(`🚀 FRONTEND: Creating shift ${index + 1}:`, shift);
        return apiRequest('POST', `/api/week-schedules/${scheduleId}/shifts`, shift);
      });
      
      console.log('🚀 FRONTEND: Executing', promises.length, 'API requests');
      const results = await Promise.all(promises);
      console.log('🚀 FRONTEND: All API requests completed, results:', results);
      return results;
    },
    onSuccess: (data) => {
      console.log('🎯 FRONTEND: Shift creation successful, invalidating cache');
      // Force refresh the shifts query using the exact same key structure
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules', scheduleId, 'shifts'] });
      queryClient.refetchQueries({ queryKey: ['/api/week-schedules', scheduleId, 'shifts'] });
      console.log('🎯 FRONTEND: Cache invalidation and refetch triggered');
      
      shiftForm.reset();
      setEditingShift(null);
      const shiftCount = data.length;
      toast({
        title: `${shiftCount} shift${shiftCount > 1 ? 's' : ''} created successfully`,
        description: "Your shifts have been added to the schedule"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create shifts",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleScheduleSubmit = async (data: WeekScheduleUpdateForm) => {
    // Get the latest isActive value from basicInfoForm since that's where the Switch is connected
    const basicInfoValues = basicInfoForm.getValues();
    const mergedData = {
      ...data,
      isActive: basicInfoValues.isActive // Use the Switch value from basicInfoForm
    };
    updateWeekScheduleMutation.mutate(mergedData);
  };

  const handleShiftSubmit = async (data: ShiftCreationForm) => {
    console.log('🎯 FRONTEND: handleShiftSubmit called with data:', data);
    console.log('🎯 FRONTEND: editingShift state:', editingShift);
    console.log('🎯 FRONTEND: createShiftMutation.isPending:', createShiftMutation.isPending);
    
    // In edit mode, we should NOT create new shifts when editing existing schedule
    // This prevents the same duplicate creation issue we had with the messaging system
    if (editingShift) {
      console.log('🎯 FRONTEND: In edit mode - showing toast and returning');
      // If we're editing an existing shift, update it instead of creating new ones
      // This prevents duplicate shifts from being created during edit operations
      toast({
        title: "Edit Mode Active",
        description: "Click-to-edit functionality is for viewing shift details. To modify shifts, use individual shift management.",
        variant: "default"
      });
      return;
    }
    
    console.log('🎯 FRONTEND: Not in edit mode - proceeding with shift creation');
    console.log('🎯 FRONTEND: Calling createShiftMutation.mutate with data:', data);
    // Only create new shifts when explicitly adding new ones to the schedule
    createShiftMutation.mutate(data);
  };

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      return apiRequest('DELETE', `/api/shifts/${shiftId}`);
    },
    onSuccess: () => {
      // Invalidate the week schedule shifts query
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules', scheduleId, 'shifts'] });
      toast({
        title: "Shift deleted successfully",
        description: "The shift has been removed from the schedule"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete shift",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const [, setLocation] = useLocation();
  
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      return apiRequest('DELETE', `/api/week-schedules/${scheduleId}`);
    },
    onSuccess: () => {
      setLocation('/scheduler');
      toast({
        title: "Schedule deleted successfully",
        description: "The schedule and all its shifts have been removed"
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

  // Schedule block update mutation
  const updateScheduleBlockMutation = useMutation({
    mutationFn: async (blockData: { name: string; description?: string; locationId: number; isActive: boolean }) => {
      return await apiRequest('PUT', `/api/schedule-blocks/${id}`, blockData);
    },
    onSuccess: (block: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-blocks'] });
      toast({
        title: "Schedule updated successfully",
        description: `Schedule "${block?.name || 'block'}" has been updated`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update schedule",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const copyWeekToFrameMutation = useMutation({
    mutationFn: async ({ frameId, weekNumber }: { frameId: number; weekNumber: number }) => {
      return await apiRequest('POST', `/api/week-schedules/${scheduleId}/copy`, {
        multiWeekFrameId: frameId,
        weekNumber
      });
    },
    onSuccess: (copiedWeek: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-blocks', scheduleId] });
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules', scheduleId] });
      toast({
        title: "Week copied successfully",
        description: `Week ${copiedWeek?.weekNumber || 'new'} added to multi-week frame`
      });
      // Stay on current editor - don't navigate away
      // The user wants to see unified multi-week editing
    },
    onError: (error: any) => {
      toast({
        title: "Failed to copy week",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleShiftClick = (shift: any) => {
    setEditingShift(shift);
    shiftForm.reset({
      position: shift.position || '',
      startTime: shift.startTime || '',
      endTime: shift.endTime || '',
      maxSlots: shift.maxSlots || 1,
      subscriptionDeadline: shift.subscriptionDeadline || '',
      daysOfWeek: [shift.dayOfWeek || ''],
      competencyRequirements: shift.competencyRequirements || []
    });
    toast({
      title: "Shift selected for editing",
      description: `Editing ${shift.position} shift for ${shift.dayOfWeek}`
    });
  };

  const handleShiftDelete = (shift: any) => {
    deleteShiftMutation.mutate(shift.id);
  };

  const handleScheduleDelete = () => {
    const scheduleIdFromParams = scheduleId ? parseInt(scheduleId) : undefined;
    if (scheduleIdFromParams) {
      deleteScheduleMutation.mutate(scheduleIdFromParams);
    } else {
      toast({
        title: "Error",
        description: "Cannot delete schedule - invalid ID",
        variant: "destructive"
      });
    }
  };

  // Multi-week frame handlers
  const handleAddWeek = async () => {
    if (!actualScheduleData) return;

    // If this schedule doesn't have a multi-week frame yet, create one
    if (!actualScheduleData.multiWeekFrameId) {
      // Create a new multi-week frame
      const frameData = {
        name: `${actualScheduleData.name} - Multi-Week Frame`,
        description: `Multi-week frame for ${actualScheduleData.name}`,
        locationId: actualScheduleData.locationId,
        maxWeeks: 8
      };

      try {
        // Schedule block architecture - no frame creation needed
        const frame = { id: parseInt(scheduleId!) };
        
        // Update the current schedule to be part of this frame as week 1
        await updateWeekScheduleMutation.mutateAsync({
          ...actualScheduleData,
          multiWeekFrameId: frame.id,
          weekNumber: 1,
          name: `${actualScheduleData.name} (Week 1)`
        });

        // Refresh data to get updated schedule
        queryClient.invalidateQueries({ queryKey: ['/api/week-schedules', scheduleId] });

        // Now copy this week to create week 2
        await copyWeekToFrameMutation.mutateAsync({
          frameId: frame.id,
          weekNumber: 2
        });
      } catch (error) {
        console.error('Error creating multi-week frame:', error);
      }
    } else {
      // Frame already exists, just copy the current week
      const nextWeekNumber = 2; // Default to week 2 for schedule blocks
      if (nextWeekNumber <= 8) {
        await copyWeekToFrameMutation.mutateAsync({
          frameId: actualScheduleData.multiWeekFrameId,
          weekNumber: nextWeekNumber
        });
      } else {
        toast({
          title: "Maximum weeks reached",
          description: "Cannot add more than 8 weeks to a frame",
          variant: "destructive"
        });
      }
    }
  };

  const DAYS_OF_WEEK = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  const POSITION_TEMPLATES = [
    'Manager',
    'Staff',
    'Supervisor', 
    'Floor Staff',
    'Assistant Manager',
    'Team Lead',
    'Coordinator'
  ];

  if (!permissions.canEditSchedules) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">You don't have permission to edit schedules.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !existingSchedule) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              {isLoading ? "Loading schedule data..." : "Loading schedule..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (scheduleBlockError) {
    return (
      <div className="container mx-auto p-6">
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
      {!showTabbedInterface ? (
        // Initial state: Schedule editing form (pre-populated)
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">
              Edit Week Schedule: {existingSchedule?.name || 'Loading...'}
            </h1>
            <p className="text-muted-foreground mt-2">
              Update the details for your weekly schedule template
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Details
              </CardTitle>
              <CardDescription>
                Modify the basic information for your weekly schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...scheduleForm}>
                <form onSubmit={scheduleForm.handleSubmit(handleScheduleSubmit)} className="space-y-6">
                  <FormField
                    control={scheduleForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Week 1 Schedule" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={scheduleForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of this schedule..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={scheduleForm.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(locations as Location[]).map((location: Location) => (
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

                  <div className="flex justify-between gap-4">
                    <Button 
                      type="button"
                      variant="ghost"
                      onClick={async () => {
                        const formData = scheduleForm.getValues();
                        await updateWeekScheduleMutation.mutateAsync(formData);
                        window.location.href = '/scheduler';
                      }}
                      disabled={updateWeekScheduleMutation.isPending}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {updateWeekScheduleMutation.isPending ? "Saving..." : "To Templates"}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="ghost"
                      onClick={async () => {
                        const formData = scheduleForm.getValues();
                        await updateWeekScheduleMutation.mutateAsync(formData);
                        setShowTabbedInterface(true);
                      }}
                      disabled={updateWeekScheduleMutation.isPending}
                    >
                      {updateWeekScheduleMutation.isPending ? "Saving..." : "To Shifts"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Transformed state: Tabbed shift management interface (identical to create page)
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                <Button
                  variant="ghost"
                  onClick={handleBackToSchedule}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Schedule
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleAddWeek}
                  disabled={updateScheduleBlockMutation.isPending || copyWeekToFrameMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {updateScheduleBlockMutation.isPending || copyWeekToFrameMutation.isPending 
                    ? "Adding Week..." 
                    : "Add Week"
                  }
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">
                    Add Shifts to {actualScheduleData?.name}
                    {actualScheduleData?.weekNumber && (
                      <span className="text-muted-foreground text-xl ml-2">
                        (Week {actualScheduleData.weekNumber})
                      </span>
                    )}
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Create and manage shifts for your weekly schedule
                  </p>
                </div>
                
                {actualScheduleData?.multiWeekFrameId && (
                  <div className="text-sm text-muted-foreground">
                    Multi-week schedule
                  </div>
                )}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>

              <TabsContent value="basic-info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Schedule Information
                    </CardTitle>
                    <CardDescription>
                      Edit the basic details of your weekly schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...basicInfoForm}>
                      <form onSubmit={basicInfoForm.handleSubmit(handleScheduleSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={basicInfoForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Schedule Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., Weekend Service Schedule"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={basicInfoForm.control}
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
                                    {(locations as Location[]).map((location: Location) => (
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
                        </div>

                        <FormField
                          control={basicInfoForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Brief description of this schedule template..."
                                  className="resize-none"
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={basicInfoForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className={`text-base font-medium ${field.value ? 'text-green-600' : 'text-red-600'}`}>
                                  {field.value ? 'Active Schedule' : 'Inactive Schedule'}
                                </FormLabel>
                                <FormDescription className={field.value ? 'text-green-500' : 'text-red-500'}>
                                  {field.value ? 'Available for shift creation' : 'Not available for shift creation'}
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={updateWeekScheduleMutation.isPending}
                        >
                          {updateWeekScheduleMutation.isPending ? (
                            "Updating..."
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Update Schedule
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requirements" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Competency Requirements
                    </CardTitle>
                    <CardDescription>
                      Define the skills and competencies needed for this shift
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Competency requirements will be configured here. This feature is coming soon.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Create New Shifts
                    </CardTitle>
                    <CardDescription>
                      Add new shifts to this weekly schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...shiftForm}>
                      <form onSubmit={shiftForm.handleSubmit(handleShiftSubmit)} className="space-y-6">
                        <FormField
                          control={shiftForm.control}
                          name="position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Position</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select or type a position" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {POSITION_TEMPLATES.map((position) => (
                                    <SelectItem key={position} value={position}>
                                      {position}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          name="maxSlots"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Slots</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={shiftForm.control}
                          name="subscriptionDeadline"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subscription Deadline (Optional)</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-3">
                          <FormLabel>Days of Week</FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {DAYS_OF_WEEK.map(({ value, label }) => (
                              <FormField
                                key={value}
                                control={shiftForm.control}
                                name="daysOfWeek"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(value)}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          if (checked) {
                                            field.onChange([...currentValue, value]);
                                          } else {
                                            field.onChange(currentValue.filter((item) => item !== value));
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {label}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={createShiftMutation.isPending}
                        >
                          {createShiftMutation.isPending ? (
                            "Creating Shifts..."
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Shifts
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requirements" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Competency Requirements
                    </CardTitle>
                    <CardDescription>
                      Define the skills and competencies needed for this shift
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Competency requirements will be configured here. This feature is coming soon.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Weekly Schedule
                    </CardTitle>
                    <CardDescription>
                      View and manage your weekly shift schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WeeklyCalendarPreview 
                      shifts={shifts as any[]}
                      weekScheduleName={existingSchedule?.name || ''}
                      onShiftClick={handleShiftClick}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Schedule Preview
                </CardTitle>
                <CardDescription>
                  {(locations as Location[]).find((l: Location) => l.id === existingSchedule?.locationId)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <WeeklyCalendarPreview
                  shifts={(shifts as any[]).map((shift: any) => ({
                    id: shift.id,
                    title: shift.position,
                    dayOfWeek: shift.dayOfWeek,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    position: shift.position,
                    status: shift.status
                  }))}
                  weekScheduleName={existingSchedule?.name || ''}
                  onShiftClick={handleShiftClick}
                  onShiftDelete={handleShiftDelete}
                />
                
                <div className="pt-4 border-t">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full"
                    onClick={handleScheduleDelete}
                    disabled={deleteScheduleMutation.isPending}
                  >
                    {deleteScheduleMutation.isPending ? (
                      "Deleting..."
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Entire Schedule
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}