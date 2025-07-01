import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/modules/auth';
import { useSchedulerPermissions } from '../hooks/useSchedulerPermissions';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { insertScheduleBlockSchema, type InsertScheduleBlock } from '@shared/schema';
import type { Location } from '@shared/schema';

export default function SchedulerEditPage() {
  const params = useParams();
  const { scheduleId } = params;
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  const queryClient = useQueryClient();

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

  // Fetch schedule block data
  const { data: scheduleData, isLoading, error } = useQuery({
    queryKey: ['/api/scheduler/schedule-blocks', scheduleId],
    queryFn: async () => {
      const response = await fetch(`/api/scheduler/schedule-blocks/${scheduleId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch schedule data');
      }
      return response.json();
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
        isActive: scheduleData.isActive !== false
      });
    }
  }, [scheduleData, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: WeekScheduleUpdateForm) => {
      const response = await apiRequest('PUT', `/api/scheduler/schedule-blocks/${scheduleId}`, data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Schedule Updated",
        description: "Schedule details have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/scheduler/schedule-blocks'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (data: WeekScheduleUpdateForm) => {
    await updateMutation.mutateAsync(data);
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
        <h1 className="text-3xl font-bold">
          Edit Week Schedule: {scheduleData?.name || 'Loading...'}
        </h1>
        <p className="text-muted-foreground mt-2">
          Update the details for your weekly schedule template
        </p>
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
                          <FormLabel className="text-base">
                            Active Schedule
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable this schedule for use in shift planning
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
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
          <Card>
            <CardHeader>
              <CardTitle>Competency Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Configure competency requirements for this schedule.</p>
              {/* TODO: Add competency requirements management */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Manage shifts and timing for this schedule.</p>
              {/* TODO: Add shift management interface */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}