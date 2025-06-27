import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Clock, Users, MapPin, Plus, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Location } from '@shared/schema';
import { useSchedulerPermissions } from '../hooks/useSchedulerPermissions';
import WeeklyCalendarPreview from '../components/WeeklyCalendarPreview';

// Schema for week schedule creation form
const weekScheduleCreationSchema = z.object({
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

type WeekScheduleCreationForm = z.infer<typeof weekScheduleCreationSchema>;
type ShiftCreationForm = z.infer<typeof shiftCreationSchema>;

export default function SchedulerCreatePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  
  // Transforming page state management
  const [currentWeekSchedule, setCurrentWeekSchedule] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('basic-info');
  const [editingShift, setEditingShift] = useState<any>(null);

  // Form for week schedule creation
  const scheduleForm = useForm<WeekScheduleCreationForm>({
    resolver: zodResolver(weekScheduleCreationSchema),
    defaultValues: {
      name: '',
      description: '',
      locationId: 0,
      isActive: true
    }
  });

  // Form for shift creation
  const shiftForm = useForm<ShiftCreationForm>({
    resolver: zodResolver(shiftCreationSchema),
    defaultValues: {
      position: '',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      maxSlots: 1,
      subscriptionDeadline: '',
      competencyRequirements: []
    }
  });

  // Queries
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/locations'],
    enabled: permissions.canCreateShifts
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['/api/week-schedules', currentWeekSchedule?.id, 'shifts'],
    enabled: !!currentWeekSchedule?.id
  });

  const createWeekScheduleMutation = useMutation({
    mutationFn: async (data: WeekScheduleCreationForm) => {
      return apiRequest('POST', '/api/week-schedules', data);
    },
    onSuccess: (newSchedule) => {
      setCurrentWeekSchedule(newSchedule);
      toast({
        title: "Week schedule created",
        description: "You can now add shifts to your schedule."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create schedule",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: ShiftCreationForm) => {
      const shiftsToCreate = data.daysOfWeek.map(day => ({
        weekScheduleId: currentWeekSchedule.id,
        position: data.position,
        dayOfWeek: day,
        startTime: data.startTime,
        endTime: data.endTime,
        maxSlots: data.maxSlots,
        subscriptionDeadline: data.subscriptionDeadline,
        status: 'open'
      }));
      
      return apiRequest('POST', `/api/week-schedules/${currentWeekSchedule.id}/shifts`, { shifts: shiftsToCreate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules', currentWeekSchedule.id, 'shifts'] });
      shiftForm.reset();
      toast({
        title: "Shifts created successfully",
        description: `Created ${shiftForm.getValues().daysOfWeek.length} shift(s)`
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create shifts",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleScheduleSubmit = async (data: WeekScheduleCreationForm) => {
    createWeekScheduleMutation.mutate(data);
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
      daysOfWeek: [shift.dayOfWeek],
      maxSlots: shift.maxSlots || 1,
      subscriptionDeadline: shift.subscriptionDeadline || '',
      competencyRequirements: []
    });
    setActiveTab('basic-info');
    toast({
      title: "Shift selected for editing",
      description: `Editing ${shift.position} shift for ${shift.dayOfWeek}`
    });
  };

  const showTabbedInterface = !!currentWeekSchedule;

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
    'Crew Chief',
    'Assistant Manager'
  ];

  if (!permissions.canCreateShifts) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">You don't have permission to create schedules.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {!showTabbedInterface ? (
        // Initial state: Simple schedule creation form
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
            <h1 className="text-3xl font-bold">Create Week Schedule</h1>
            <p className="text-muted-foreground mt-2">
              Create a new weekly schedule template for your team
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Details
              </CardTitle>
              <CardDescription>
                Set up the basic information for your weekly schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...scheduleForm}>
                <form onSubmit={scheduleForm.handleSubmit(handleScheduleSubmit)} className="space-y-4">
                  <FormField
                    control={scheduleForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Floor Week Schedule" {...field} />
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
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
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

                  <FormField
                    control={scheduleForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of this schedule template..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createWeekScheduleMutation.isPending}
                  >
                    {createWeekScheduleMutation.isPending ? (
                      "Creating Schedule..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create Week Schedule
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Transformed state: Tabbed shift management interface
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>

              <TabsContent value="basic-info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Shift Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...shiftForm}>
                      <form onSubmit={shiftForm.handleSubmit(handleShiftSubmit)} className="space-y-4">
                        <FormField
                          control={shiftForm.control}
                          name="position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Position</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a position" />
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
                          name="daysOfWeek"
                          render={() => (
                            <FormItem>
                              <FormLabel>Days of Week</FormLabel>
                              <div className="grid grid-cols-4 gap-2">
                                {DAYS_OF_WEEK.map((day) => (
                                  <FormField
                                    key={day.value}
                                    control={shiftForm.control}
                                    name="daysOfWeek"
                                    render={({ field }) => {
                                      return (
                                        <FormItem
                                          key={day.value}
                                          className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value?.includes(day.value)}
                                              onCheckedChange={(checked) => {
                                                return checked
                                                  ? field.onChange([...field.value, day.value])
                                                  : field.onChange(
                                                      field.value?.filter(
                                                        (value) => value !== day.value
                                                      )
                                                    )
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="text-sm font-normal">
                                            {day.label}
                                          </FormLabel>
                                        </FormItem>
                                      )
                                    }}
                                  />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={shiftForm.control}
                          name="maxSlots"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Slots</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1"
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

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
                      Set required skills and competencies for this shift
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Competency requirements will be available soon.</p>
                      <p className="text-sm">For now, focus on creating your basic shift structure.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Schedule Preview
                    </CardTitle>
                    <CardDescription>
                      View and manage your weekly schedule
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
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Schedule Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">{currentWeekSchedule?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(locations as Location[]).find((l: Location) => l.id === currentWeekSchedule?.locationId)?.name}
                    </p>
                  </div>
                  {currentWeekSchedule?.description && (
                    <p className="text-xs text-muted-foreground">
                      {currentWeekSchedule.description}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Schedule Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Total Shifts:</span>
                      <Badge variant="secondary">{(shifts as any[]).length}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Click any shift in the Schedule tab to edit it
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}