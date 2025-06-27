import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Save, ArrowLeft, Plus, Star, Clock, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
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
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  daysOfWeek: z.array(z.string()).min(1, 'At least one day must be selected'),
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
  const [, navigate] = useLocation();
  const permissions = useSchedulerPermissions();
  const [currentWeekSchedule, setCurrentWeekSchedule] = useState<any>(null);

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

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

  // Mutation for creating week schedule
  const createWeekScheduleMutation = useMutation({
    mutationFn: (data: WeekScheduleCreationForm) => 
      apiRequest('POST', '/api/week-schedules', data),
    onSuccess: (scheduleData) => {
      console.log('Week schedule created, setting current:', scheduleData);
      toast({ description: 'Week schedule created successfully' });
      setCurrentWeekSchedule(scheduleData);
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

  // Permission gate
  if (!permissions.canCreateShifts) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Week Schedule Templates Access Required</CardTitle>
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

  // Handle week schedule creation
  const onWeekScheduleSubmit = async (data: WeekScheduleCreationForm) => {
    console.log('Week schedule form submission:', data);
    await createWeekScheduleMutation.mutateAsync(data);
  };

  const handleBackToList = () => {
    navigate('/scheduler');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
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

      {/* Simple Schedule Creation Form */}
      <div className="max-w-2xl mx-auto">
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
    </div>
  );
}