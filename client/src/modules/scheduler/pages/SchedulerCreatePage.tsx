import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Clock, Users, MapPin, Plus, Save, Eye, Minus, ArrowLeft } from 'lucide-react';
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
import { useLocation } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Competency, Location } from '@shared/schema';
import WeeklyCalendarPreview from '../components/WeeklyCalendarPreview';
import { useSchedulerPermissions } from '../hooks/useSchedulerPermissions';

// Schema for week schedule creation form
const weekScheduleCreationSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  description: z.string().optional(),
  locationId: z.number().min(1, 'Location is required'),
  isActive: z.boolean().default(true)
});

// Schema for shift creation form with day-of-week
const shiftCreationSchema = z.object({
  title: z.string().min(1, 'Shift title is required'),
  daysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).min(1, 'Select at least one day'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  position: z.string().optional(),
  description: z.string().optional(),
  competencyRequirements: z.array(z.object({
    competencyId: z.number(),
    requiredCount: z.number(),
    priority: z.enum(['required', 'preferred', 'optional'])
  })).optional()
});

type WeekScheduleCreationForm = z.infer<typeof weekScheduleCreationSchema>;
type ShiftCreationForm = z.infer<typeof shiftCreationSchema>;

export default function SchedulerCreatePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const permissions = useSchedulerPermissions();
  const [currentWeekSchedule, setCurrentWeekSchedule] = useState<any>(null);
  const [selectedCompetencies, setSelectedCompetencies] = useState<Array<{
    competencyId: number;
    requiredCount: number;
    priority: 'required' | 'preferred' | 'optional';
  }>>([]);
  const [activeTab, setActiveTab] = useState("basic");

  // Week Schedule Form setup
  const weekScheduleForm = useForm<WeekScheduleCreationForm>({
    resolver: zodResolver(weekScheduleCreationSchema),
    defaultValues: {
      name: '',
      description: '',
      locationId: 1,
      isActive: true
    }
  });

  // Individual Shift Form setup
  const shiftForm = useForm<ShiftCreationForm>({
    resolver: zodResolver(shiftCreationSchema),
    defaultValues: {
      title: '',
      daysOfWeek: [],
      startTime: '',
      endTime: '',
      position: '',
      description: '',
      competencyRequirements: []
    }
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

  // Fetch competencies
  const { data: competencies } = useQuery({
    queryKey: ['/api/competencies'],
    queryFn: async () => {
      const response = await fetch('/api/competencies');
      if (!response.ok) throw new Error('Failed to fetch competencies');
      return response.json();
    }
  });

  // Fetch shifts for the current week schedule
  const { data: currentScheduleShifts } = useQuery({
    queryKey: ['/api/week-schedules', currentWeekSchedule?.id, 'shifts'],
    queryFn: async () => {
      if (!currentWeekSchedule?.id) return [];
      const response = await fetch(`/api/week-schedules/${currentWeekSchedule.id}/shifts`);
      if (!response.ok) throw new Error('Failed to fetch shifts');
      return response.json();
    },
    enabled: !!currentWeekSchedule?.id
  });

  // Mutations
  const createWeekScheduleMutation = useMutation({
    mutationFn: (data: WeekScheduleCreationForm) => 
      apiRequest('POST', '/api/week-schedules', data),
    onSuccess: (data) => {
      console.log('Week schedule created, setting current:', data);
      toast({ description: 'Week schedule created successfully' });
      setCurrentWeekSchedule(data);
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
      weekScheduleForm.reset();
    },
    onError: (error) => {
      console.error('Week schedule creation failed:', error);
      toast({ 
        description: 'Failed to create week schedule',
        variant: 'destructive'
      });
    }
  });

  const addShiftToScheduleMutation = useMutation({
    mutationFn: async (data: ShiftCreationForm) => {
      console.log('Multi-day shift creation attempt:', { data, currentWeekSchedule, selectedCompetencies });
      if (!currentWeekSchedule) throw new Error('No week schedule selected');
      
      // Create a shift for each selected day
      const shiftPromises = data.daysOfWeek.map(dayOfWeek => {
        const requestData = {
          title: data.title,
          dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          position: data.position,
          description: data.description,
          competencyRequirements: selectedCompetencies
        };
        console.log('Creating shift for:', dayOfWeek, requestData);
        return apiRequest('POST', `/api/week-schedules/${currentWeekSchedule.id}/shifts`, requestData);
      });
      
      return Promise.all(shiftPromises);
    },
    onSuccess: (results) => {
      console.log('Multi-day shifts created successfully:', results);
      const dayCount = results.length;
      toast({ description: `${dayCount} shift${dayCount > 1 ? 's' : ''} added successfully` });
      
      // Critical: Invalidate cache to refetch actual shifts from database
      queryClient.invalidateQueries({ 
        queryKey: ['/api/week-schedules', currentWeekSchedule?.id, 'shifts'] 
      });
      
      shiftForm.reset();
      setSelectedCompetencies([]);
    },
    onError: (error) => {
      console.error('Multi-day shift creation failed:', error);
      toast({ 
        description: 'Failed to add shifts',
        variant: 'destructive'
      });
    }
  });

  // Permission gate
  if (!permissions.canCreateShifts) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Week Schedule Templates Access Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You need crew planning workflow access to create week schedule templates. Please contact your administrator.
            </p>
            <div className="mt-4 space-y-2">
              <div className="text-sm">
                <strong>Your Role:</strong> {user?.role || 'Unknown'}
              </div>
              <div className="text-sm">
                <strong>Required:</strong> administrator, owner, or app_manager role with crew_planning workflow access
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper functions
  const addCompetencyRequirement = (competencyId: number) => {
    if (competencyId && !selectedCompetencies.find(c => c.competencyId === competencyId)) {
      setSelectedCompetencies([...selectedCompetencies, {
        competencyId,
        requiredCount: 1,
        priority: 'required'
      }]);
    }
  };

  const removeCompetencyRequirement = (competencyId: number) => {
    setSelectedCompetencies(selectedCompetencies.filter(c => c.competencyId !== competencyId));
  };

  const updateCompetencyRequirement = (competencyId: number, field: string, value: any) => {
    setSelectedCompetencies(selectedCompetencies.map(c => 
      c.competencyId === competencyId ? { ...c, [field]: value } : c
    ));
  };

  // Handle week schedule creation
  const onWeekScheduleSubmit = async (data: WeekScheduleCreationForm) => {
    console.log('Week schedule form submission:', data);
    await createWeekScheduleMutation.mutateAsync(data);
  };

  // Handle individual shift creation
  const onShiftSubmit = async (data: ShiftCreationForm) => {
    console.log('Shift form submission:', data);
    await addShiftToScheduleMutation.mutateAsync(data);
  };

  // Handle clicking on a shift in the calendar to edit it
  const handleShiftClick = (shift: any) => {
    console.log('Shift clicked for editing:', shift);
    
    // Populate the form with the clicked shift's data
    shiftForm.reset({
      title: shift.title,
      daysOfWeek: [shift.dayOfWeek], // Convert single day back to array
      startTime: shift.startTime,
      endTime: shift.endTime,
      position: shift.position || '',
      description: shift.description || '',
      competencyRequirements: []
    });
    
    // Switch to the Basic Info tab to show the populated form
    setActiveTab('basic');
    
    // Show feedback to user
    toast({ description: `Editing "${shift.title}" shift` });
  };

  const handleBackToList = () => {
    navigate('/scheduler');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button 
            variant="outline" 
            onClick={handleBackToList}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Templates
          </Button>
          
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Create Week Schedule Template
          </h1>
          <p className="text-muted-foreground">
            Create reusable week schedules with multiple shifts and competency requirements
          </p>
        </div>
        
        {permissions.canViewDevelopment && (
          <Button variant="outline" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View Development Mode
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Week Schedule Creation or Shift Creation */}
        {!currentWeekSchedule ? (
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Week Schedule</CardTitle>
                <CardDescription>
                  Start by creating a week schedule template, then add individual shifts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...weekScheduleForm}>
                  <form onSubmit={weekScheduleForm.handleSubmit(onWeekScheduleSubmit)} className="space-y-6">
                    <FormField
                      control={weekScheduleForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Schedule Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Weekend Service Schedule" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={weekScheduleForm.control}
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
                              {(locations as Location[])?.map((location) => (
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
                      control={weekScheduleForm.control}
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

                    <Button type="submit" disabled={createWeekScheduleMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {createWeekScheduleMutation.isPending ? 'Creating...' : 'Create Week Schedule'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Shifts to "{currentWeekSchedule.name}"</CardTitle>
                <CardDescription>
                  Create individual shifts for this week schedule template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="requirements">Requirements</TabsTrigger>
                    <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <Form {...shiftForm}>
                      <form onSubmit={shiftForm.handleSubmit(onShiftSubmit)} className="space-y-4">
                        <FormField
                          control={shiftForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Shift Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Morning Server" {...field} />
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
                                <Input placeholder="e.g., Manager, Staff, Supervisor" {...field} />
                              </FormControl>
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
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                  <FormField
                                    key={day}
                                    control={shiftForm.control}
                                    name="daysOfWeek"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(day as any)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, day])
                                                : field.onChange(field.value?.filter((value) => value !== day))
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm capitalize">
                                          {day.slice(0, 3)}
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={shiftForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Additional details about this shift..."
                                  className="resize-none"
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button type="submit" disabled={addShiftToScheduleMutation.isPending}>
                          <Plus className="h-4 w-4 mr-2" />
                          {addShiftToScheduleMutation.isPending ? 'Adding Shifts...' : 'Add Shift(s)'}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="requirements" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Competency Requirements</h4>
                        <Select 
                          onValueChange={(value) => value && addCompetencyRequirement(parseInt(value))}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Add competency" />
                          </SelectTrigger>
                          <SelectContent>
                            {(competencies as Competency[])?.map((comp) => (
                              <SelectItem key={comp.id} value={comp.id.toString()}>
                                {comp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedCompetencies.map((requirement) => {
                        const competency = (competencies as Competency[])?.find(c => c.id === requirement.competencyId);
                        return (
                          <div key={requirement.competencyId} className="flex items-center gap-4 p-3 border rounded-lg">
                            <div className="flex-1">
                              <span className="font-medium">{competency?.name}</span>
                            </div>
                            <Input
                              type="number"
                              min="1"
                              className="w-20"
                              value={requirement.requiredCount}
                              onChange={(e) => updateCompetencyRequirement(
                                requirement.competencyId, 
                                'requiredCount', 
                                parseInt(e.target.value) || 1
                              )}
                            />
                            <Select 
                              value={requirement.priority}
                              onValueChange={(value) => updateCompetencyRequirement(
                                requirement.competencyId, 
                                'priority', 
                                value
                              )}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="required">Required</SelectItem>
                                <SelectItem value="preferred">Preferred</SelectItem>
                                <SelectItem value="optional">Optional</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeCompetencyRequirement(requirement.competencyId)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-4">
                    <div className="text-center text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>Schedule preview will be available after shifts are created</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Schedule Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentWeekSchedule && currentScheduleShifts ? (
                <WeeklyCalendarPreview 
                  shifts={currentScheduleShifts}
                  onShiftClick={handleShiftClick}
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Create a week schedule to see preview</p>
                </div>
              )}
            </CardContent>
          </Card>

          {currentWeekSchedule && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Schedule Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Name:</span>
                  <p className="text-sm text-muted-foreground">{currentWeekSchedule.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Location:</span>
                  <p className="text-sm text-muted-foreground">
                    {(locations as Location[])?.find(l => l.id === currentWeekSchedule.locationId)?.name || 'Unknown'}
                  </p>
                </div>
                {currentWeekSchedule.description && (
                  <div>
                    <span className="text-sm font-medium">Description:</span>
                    <p className="text-sm text-muted-foreground">{currentWeekSchedule.description}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={currentWeekSchedule.isActive ? "default" : "secondary"} className="ml-2">
                    {currentWeekSchedule.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Total Shifts:</span>
                  <p className="text-sm text-muted-foreground">{currentScheduleShifts?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}