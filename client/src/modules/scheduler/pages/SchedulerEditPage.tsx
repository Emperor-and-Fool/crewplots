import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
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
import { useAutoSave } from '@/hooks/useAutoSave';
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator';
import { apiRequest } from '@/lib/queryClient';
import { insertScheduleBlockSchema, type InsertScheduleBlock } from '@shared/schema';
import type { Location } from '@shared/schema';
import CompetencySelector from '../components/CompetencySelector';
import ShiftManagementInterface from '../components/ShiftManagementInterface';
import { useDeleteShift, useWeekScheduleShifts } from '../hooks/useSchedulerData';

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
  const { data: weekSchedules } = useWeekScheduleShifts(parseInt(scheduleId));

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
    queryKey: ['/api/validation/v3/execute', 'scheduleBlock', 'read', scheduleId],
    queryFn: async () => {
      console.log('🔍 SCHEDULER EDIT: Loading schedule ID:', scheduleId);
      const response = await apiRequest('POST', '/api/validation/v3/execute', {
        operation: 'read',
        entityType: 'scheduleBlock',
        data: { id: parseInt(scheduleId) },
        context: {}
      });
      
      // Parse Response object to JSON (matching SchedulerListPage pattern)
      const result = await response.json();
      console.log('🔍 SCHEDULER EDIT: Parsed ValidationEngine30 result:', result);
      
      // Extract data from ValidationEngine30 response structure
      if (result && result.threads && result.threads.transaction && result.threads.transaction.data) {
        const scheduleData = result.threads.transaction.data;
        console.log('🔍 SCHEDULER EDIT: Extracted schedule data:', scheduleData);
        return scheduleData;
      }
      
      console.log('🔍 SCHEDULER EDIT: No data found in response structure');
      return null;
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
        title: "Schedule Updated",
        description: "Schedule details have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'scheduleBlock'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-save configuration using validation engine
  const formValues = form.watch();
  const autoSave = useAutoSave(formValues, {
    endpoint: `/api/validation/execute`,
    method: 'POST',
    debounceMs: 2000,
    minContentLength: 1,
    enabled: permissions.canEditSchedules && !!scheduleData,
    validateData: (data) => {
      // Only auto-save if data is valid and has changed from initial values
      return !!(data.name && data.name.trim().length > 0);
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
          isActive: data.isActive !== false
        }
      };
    },
    onSaveSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'scheduleBlock'] });
    },
    onSaveError: (error) => {
      console.error('Auto-save failed:', error);
    }
  });

  const handleSave = async (data: InsertScheduleBlock) => {
    await updateMutation.mutateAsync(data);
  };

  const handleShiftEdit = (shift: any) => {
    toast({
      title: "Edit Mode",
      description: `Selected ${shift.title} for editing`
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
            <h1 className="text-3xl font-bold">
              Edit Week Schedule: {scheduleData?.name || 'Loading...'}
            </h1>
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
          <CompetencySelector 
            scheduleBlockId={parseInt(scheduleId)} 
            locationId={scheduleData?.locationId || 1}
          />
        </TabsContent>

        <TabsContent value="schedule">
          <ShiftManagementInterface
            scheduleBlockId={parseInt(scheduleId)}
            scheduleBlockName={scheduleData?.name || 'Schedule'}
            weekSchedules={weekSchedules || []}
            onShiftClick={handleShiftEdit}
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
    </div>
  );
}