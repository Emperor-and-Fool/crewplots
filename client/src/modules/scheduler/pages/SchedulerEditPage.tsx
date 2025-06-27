import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Clock, Users, MapPin, Plus, Save, ArrowLeft } from 'lucide-react';
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
  const { scheduleId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  const [currentWeekSchedule, setCurrentWeekSchedule] = useState<any>(null);
  const [hasBeenEdited, setHasBeenEdited] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic-info' | 'requirements' | 'schedule'>('basic-info');
  const [editingShift, setEditingShift] = useState<any>(null);

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

  // Individual fetch pattern - exact match to working CrewMemberProfile pattern
  const { data: existingSchedule, isLoading: scheduleLoading, error: scheduleError } = useQuery({
    queryKey: ['/api/week-schedules', scheduleId],
    queryFn: async () => {
      console.log('🔍 FRONTEND: Fetching schedule with scheduleId:', scheduleId);
      const response = await fetch(`/api/week-schedules/${scheduleId}`, {
        credentials: 'include'
      });
      console.log('🔍 FRONTEND: Response status:', response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔍 FRONTEND: Error response:', errorText);
        throw new Error('Failed to fetch schedule');
      }
      const data = await response.json();
      console.log('🔍 FRONTEND: Schedule data received:', data);
      return data;
    },
    enabled: !!scheduleId && permissions.canEditSchedules,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    cacheTime: 30 * 60 * 1000, // 30 minutes in memory
  });

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
    cacheTime: 60 * 60 * 1000, // 1 hour in memory
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['/api/week-schedules', scheduleId, 'shifts'],
    queryFn: async () => {
      console.log('🔍 SHIFTS QUERY: Starting fetch for week schedule:', scheduleId);
      console.log('🔍 SHIFTS QUERY: existingSchedule loaded:', !!existingSchedule);
      
      const response = await fetch(`/api/week-schedules/${scheduleId}/shifts`, {
        credentials: 'include'
      });
      console.log('🔍 SHIFTS QUERY: Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shifts for week schedule ${scheduleId}`);
      }
      const data = await response.json();
      console.log('🔍 SHIFTS QUERY: Week schedule shifts received:', data);
      return data;
    },
    enabled: !!(scheduleId && permissions.canEditSchedules && !scheduleLoading),
    staleTime: 2 * 60 * 1000, // 2 minutes cache for shifts data
    cacheTime: 15 * 60 * 1000, // 15 minutes in memory
  });

  // Populate form when existing schedule loads
  useEffect(() => {
    if (existingSchedule) {
      scheduleForm.reset({
        name: existingSchedule.name || '',
        description: existingSchedule.description || '',
        locationId: existingSchedule.locationId || 0,
        isActive: existingSchedule.isActive !== false
      });
    }
  }, [existingSchedule, scheduleForm]);

  // Create a basic info form that syncs with the existing schedule data for the tabbed interface
  const basicInfoForm = useForm<WeekScheduleUpdateForm>({
    resolver: zodResolver(weekScheduleUpdateSchema),
    defaultValues: {
      name: '',
      description: '',
      locationId: 0,
      isActive: true
    }
  });

  // Keep basicInfoForm in sync with existing schedule data
  useEffect(() => {
    if (existingSchedule) {
      basicInfoForm.reset({
        name: existingSchedule.name || '',
        description: existingSchedule.description || '',
        locationId: existingSchedule.locationId || 0,
        isActive: existingSchedule.isActive !== false
      });
    }
  }, [existingSchedule, basicInfoForm]);

  const isLoading = scheduleLoading && !existingSchedule;
  
  // Transform page when schedule loads (same as create page)
  // For edit page: only show tabbed interface after user has made changes or submitted
  const showTabbedInterface = !!(currentWeekSchedule || hasBeenEdited);





  // Mutations
  const updateWeekScheduleMutation = useMutation({
    mutationFn: async (data: WeekScheduleUpdateForm) => {
      return await apiRequest('PUT', `/api/week-schedules/${scheduleId}`, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
      // Set currentWeekSchedule to the updated data for the tabbed interface
      setCurrentWeekSchedule(data);
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
      const shiftsToCreate = data.daysOfWeek.map(dayOfWeek => ({
        scheduleId: parseInt(scheduleId),
        position: data.position,
        dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        maxSlots: data.maxSlots,
        subscriptionDeadline: data.subscriptionDeadline || null,
        competencyRequirements: data.competencyRequirements || [],
        status: 'active' as const
      }));

      const promises = shiftsToCreate.map(shift => 
        apiRequest('POST', '/api/shifts', shift)
      );
      
      return await Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
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
    updateWeekScheduleMutation.mutate(data);
  };

  const handleShiftSubmit = async (data: ShiftCreationForm) => {
    createShiftMutation.mutate(data);
  };

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
    setActiveTab('basic-info');
    toast({
      title: "Shift selected for editing",
      description: `Editing ${shift.position} shift for ${shift.dayOfWeek}`
    });
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

  if (isLoading || (!existingSchedule && !currentWeekSchedule)) {
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

  if (scheduleError) {
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
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scheduler
            </Button>
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

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={updateWeekScheduleMutation.isPending}
                  >
                    {updateWeekScheduleMutation.isPending ? (
                      "Updating..."
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Edit Shifts
                      </>
                    )}
                  </Button>
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
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Scheduler
              </Button>
              <h1 className="text-3xl font-bold">
                Add Shifts to {currentWeekSchedule?.name}
              </h1>
              <p className="text-muted-foreground mt-2">
                Create and manage shifts for your weekly schedule
              </p>
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
                                <FormLabel className="text-base">
                                  Active Schedule
                                </FormLabel>
                                <FormDescription>
                                  Make this schedule available for shift creation
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
                      weekScheduleName={currentWeekSchedule?.name || ''}
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
                  {(locations as Location[]).find((l: Location) => l.id === currentWeekSchedule?.locationId)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Current Shifts</h4>
                  {(shifts as any[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No shifts created yet</p>
                  ) : (
                    <div className="space-y-2">
                      {(shifts as any[]).map((shift: any, index: number) => (
                        <div 
                          key={index} 
                          className="p-3 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors"
                          onClick={() => handleShiftClick(shift)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{shift.position}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {shift.dayOfWeek}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {shift.startTime} - {shift.endTime}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}