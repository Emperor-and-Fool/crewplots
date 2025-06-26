import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Clock, Users, MapPin, Plus, Save, Eye, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Competency, Location } from '@shared/schema';

// Schema for week schedule creation form
const weekScheduleCreationSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  description: z.string().optional(),
  locationId: z.number().min(1, 'Location is required')
});

// Schema for shift creation form with day-of-week
const shiftCreationSchema = z.object({
  title: z.string().min(1, 'Shift title is required'),
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  description: z.string().optional(),
  competencyRequirements: z.array(z.object({
    competencyId: z.number(),
    requiredCount: z.number(),
    priority: z.enum(['required', 'preferred', 'optional'])
  })).optional()
});

type WeekScheduleCreationForm = z.infer<typeof weekScheduleCreationSchema>;
type ShiftCreationForm = z.infer<typeof shiftCreationSchema>;

// Scheduler permissions helper
const useSchedulerPermissions = () => {
  const { user } = useAuth();
  
  const checkSchedulerPermission = () => {
    if (!user?.role) return false;
    return ['administrator', 'owner', 'app_manager'].includes(user.role);
  };

  return {
    canCreateShifts: checkSchedulerPermission(),
    canViewDevelopment: checkSchedulerPermission()
  };
};

export default function ShiftCreationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  const [currentWeekSchedule, setCurrentWeekSchedule] = useState<any>(null);
  const [shifts, setShifts] = useState<Array<ShiftCreationForm & { id?: number }>>([]);
  const [selectedCompetencies, setSelectedCompetencies] = useState<Array<{
    competencyId: number;
    requiredCount: number;
    priority: 'required' | 'preferred' | 'optional';
  }>>([]);

  // Week Schedule Form setup
  const weekScheduleForm = useForm<WeekScheduleCreationForm>({
    resolver: zodResolver(weekScheduleCreationSchema),
    defaultValues: {
      name: '',
      description: '',
      locationId: 0
    }
  });

  // Individual Shift Form setup
  const shiftForm = useForm<ShiftCreationForm>({
    resolver: zodResolver(shiftCreationSchema),
    defaultValues: {
      title: '',
      dayOfWeek: 'monday',
      startTime: '',
      endTime: '',
      description: '',
      competencyRequirements: []
    }
  });

  // Data queries
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/locations'],
    enabled: permissions.canCreateShifts
  });

  const { data: competencies = [] } = useQuery({
    queryKey: ['/api/competencies'],
    enabled: permissions.canCreateShifts
  });

  // Week schedules query 
  const { data: existingWeekSchedules = [] } = useQuery({
    queryKey: ['/api/week-schedules'],
    enabled: permissions.canCreateShifts
  });

  // Mutations
  const createWeekScheduleMutation = useMutation({
    mutationFn: (data: WeekScheduleCreationForm) => 
      apiRequest('POST', '/api/week-schedules', data),
    onSuccess: (data) => {
      toast({ description: 'Week schedule created successfully' });
      setCurrentWeekSchedule(data);
      queryClient.invalidateQueries({ queryKey: ['/api/week-schedules'] });
      weekScheduleForm.reset();
    },
    onError: () => {
      toast({ 
        description: 'Failed to create week schedule',
        variant: 'destructive'
      });
    }
  });

  const addShiftToScheduleMutation = useMutation({
    mutationFn: (data: ShiftCreationForm) => {
      if (!currentWeekSchedule) throw new Error('No week schedule selected');
      return apiRequest('POST', `/api/week-schedules/${currentWeekSchedule.id}/shifts`, {
        ...data,
        competencyRequirements: selectedCompetencies
      });
    },
    onSuccess: () => {
      toast({ description: 'Shift added successfully' });
      setShifts(prev => [...prev, { ...shiftForm.getValues(), id: Date.now() }]);
      shiftForm.reset();
      setSelectedCompetencies([]);
    },
    onError: () => {
      toast({ 
        description: 'Failed to add shift',
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
              Shift Creation Access Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You need crew planning workflow access to create shifts. Please contact your administrator.
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

  // Add competency requirement
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
    setSelectedCompetencies(prev => prev.filter(c => c.competencyId !== competencyId));
  };

  const updateCompetencyRequirement = (competencyId: number, field: string, value: any) => {
    setSelectedCompetencies(prev => prev.map(c => 
      c.competencyId === competencyId ? { ...c, [field]: value } : c
    ));
  };

  // Week schedule submission
  const onWeekScheduleSubmit = (data: WeekScheduleCreationForm) => {
    createWeekScheduleMutation.mutate(data);
  };

  // Individual shift submission
  const onShiftSubmit = (data: ShiftCreationForm) => {
    addShiftToScheduleMutation.mutate({
      ...data,
      competencyRequirements: selectedCompetencies
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Week Schedule Creator
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
        {/* Week Schedule Creation */}
        {!currentWeekSchedule ? (
          <div className="lg:col-span-2">
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
                            <Input placeholder="e.g., Regular Service Week, Holiday Schedule" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={weekScheduleForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe this week schedule template..."
                              className="min-h-[100px]"
                              {...field} 
                            />
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
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(locations as Location[]).map((location) => (
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
                      disabled={createWeekScheduleMutation.isPending}
                      className="w-full"
                    >
                      {createWeekScheduleMutation.isPending ? "Creating..." : "Create Week Schedule"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Shift Creation Form */
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Add Shifts to: {currentWeekSchedule.name}</CardTitle>
                <CardDescription>
                  Create individual shifts for each day of the week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...shiftForm}>
                  <form onSubmit={shiftForm.handleSubmit(onShiftSubmit)} className="space-y-6">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="competencies">Requirements</TabsTrigger>
                        <TabsTrigger value="scheduling">Schedule</TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic" className="space-y-4">
                        <FormField
                          control={shiftForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Shift Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Evening Service, Morning Prep" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={shiftForm.control}
                          name="dayOfWeek"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Day of Week</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select day" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="monday">Monday</SelectItem>
                                  <SelectItem value="tuesday">Tuesday</SelectItem>
                                  <SelectItem value="wednesday">Wednesday</SelectItem>
                                  <SelectItem value="thursday">Thursday</SelectItem>
                                  <SelectItem value="friday">Friday</SelectItem>
                                  <SelectItem value="saturday">Saturday</SelectItem>
                                  <SelectItem value="sunday">Sunday</SelectItem>
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
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Additional details about this shift..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>

                      <TabsContent value="competencies" className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Competency Requirements</h3>
                          <Select onValueChange={(value) => addCompetencyRequirement(parseInt(value))}>
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Add requirement" />
                            </SelectTrigger>
                            <SelectContent>
                              {(competencies as Competency[])
                                .filter(c => !selectedCompetencies.find(sc => sc.competencyId === c.id))
                                .map((competency) => (
                                <SelectItem key={competency.id} value={competency.id.toString()}>
                                  {competency.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedCompetencies.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No competency requirements added yet</p>
                            <p className="text-sm">Add requirements to specify what skills are needed for this shift</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedCompetencies.map((req) => {
                              const competency = (competencies as Competency[]).find((c) => c.id === req.competencyId);
                              return (
                                <Card key={req.competencyId} className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-medium">{competency?.name}</h4>
                                      <p className="text-sm text-muted-foreground">{competency?.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <label className="text-sm">Count:</label>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={req.requiredCount}
                                          onChange={(e) => updateCompetencyRequirement(
                                            req.competencyId, 
                                            'requiredCount', 
                                            parseInt(e.target.value)
                                          )}
                                          className="w-20"
                                        />
                                      </div>
                                      <Select
                                        value={req.priority}
                                        onValueChange={(value) => updateCompetencyRequirement(
                                          req.competencyId,
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
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeCompetencyRequirement(req.competencyId)}
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="scheduling" className="space-y-4">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Schedule Preview</h3>
                          <div className="border rounded-lg p-4">
                            <div className="text-sm text-muted-foreground mb-2">Week Schedule: {currentWeekSchedule.name}</div>
                            {shifts.length === 0 ? (
                              <p className="text-muted-foreground">No shifts added yet</p>
                            ) : (
                              <div className="space-y-2">
                                {shifts.map((shift, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                    <div>
                                      <div className="font-medium">{shift.title}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {shift.dayOfWeek} • {shift.startTime} - {shift.endTime}
                                      </div>
                                    </div>
                                    <Badge variant="outline">{shift.dayOfWeek}</Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex gap-4">
                      <Button 
                        type="submit" 
                        disabled={addShiftToScheduleMutation.isPending}
                        className="flex-1"
                      >
                        {addShiftToScheduleMutation.isPending ? "Adding..." : "Add Shift"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setCurrentWeekSchedule(null)}
                      >
                        Back to Schedule
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Week Schedules</span>
                <Badge variant="secondary">{(existingWeekSchedules as any[]).length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Locations</span>
                <Badge variant="secondary">{(locations as Location[]).length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Competencies</span>
                <Badge variant="secondary">{(competencies as Competency[]).length}</Badge>
              </div>
              {currentWeekSchedule && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Shifts in Schedule</span>
                  <Badge variant="secondary">{shifts.length}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Week Schedules */}
          {(existingWeekSchedules as any[]).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Schedules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(existingWeekSchedules as any[]).slice(0, 5).map((schedule: any) => (
                    <div key={schedule.id} className="p-2 border rounded-lg">
                      <div className="font-medium text-sm">{schedule.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {schedule.shifts?.length || 0} shifts • {schedule.location?.name}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}