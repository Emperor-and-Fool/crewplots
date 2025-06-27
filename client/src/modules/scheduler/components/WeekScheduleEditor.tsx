import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useSchedulerActions } from '../hooks/useSchedulerActions';
import type { WeekScheduleWithShifts, WeekScheduleFormData } from '../types/scheduler.types';

const weekScheduleSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  description: z.string().optional(),
  locationId: z.number().min(1, 'Location is required'),
  isActive: z.boolean().default(true)
});

interface WeekScheduleEditorProps {
  initialData?: WeekScheduleWithShifts | null;
  onSave: (data: WeekScheduleFormData) => Promise<void>;
  onCancel: () => void;
  isCreating?: boolean;
  isLoading?: boolean;
}

export default function WeekScheduleEditor({ 
  initialData, 
  onSave, 
  onCancel, 
  isCreating = false, 
  isLoading = false 
}: WeekScheduleEditorProps) {

  // Fetch locations for dropdown
  const { data: locations } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

  const form = useForm<WeekScheduleFormData>({
    resolver: zodResolver(weekScheduleSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      locationId: initialData?.locationId || (locations?.[0]?.id || 1),
      isActive: initialData?.isActive ?? true
    }
  });

  // Update form when weekSchedule changes
  useEffect(() => {
    if (weekSchedule) {
      form.reset({
        name: weekSchedule.name,
        description: weekSchedule.description || '',
        locationId: weekSchedule.locationId,
        isActive: weekSchedule.isActive
      });
    }
  }, [weekSchedule, form]);

  // Watch form changes for auto-save
  const watchedValues = form.watch();
  useEffect(() => {
    if (weekSchedule?.id) {
      const changes: Partial<WeekScheduleFormData> = {};
      if (watchedValues.name !== weekSchedule.name) changes.name = watchedValues.name;
      if (watchedValues.description !== weekSchedule.description) changes.description = watchedValues.description;
      if (watchedValues.locationId !== weekSchedule.locationId) changes.locationId = watchedValues.locationId;
      if (watchedValues.isActive !== weekSchedule.isActive) changes.isActive = watchedValues.isActive;
      
      if (Object.keys(changes).length > 0) {
        handleFormChange(changes);
      }
    }
  }, [watchedValues, weekSchedule, handleFormChange]);

  const onSubmit = async (data: WeekScheduleFormData) => {
    try {
      await saveWeekSchedule(data);
    } catch (error) {
      // Error handling is done in useSchedulerActions
    }
  };

  const formatLastSaved = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-medium">
            {weekSchedule ? 'Edit Week Schedule' : 'Create Week Schedule'}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            {autoSaveState.isAutoSaving && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Auto-saving...
              </Badge>
            )}
            {autoSaveState.lastSaved && !autoSaveState.isAutoSaving && (
              <Badge variant="outline" className="text-xs">
                Last saved {formatLastSaved(autoSaveState.lastSaved)}
              </Badge>
            )}
            {autoSaveState.autoSaveError && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Auto-save failed
              </Badge>
            )}
          </div>
        </div>
        <Button 
          type="submit" 
          form="week-schedule-form"
          disabled={isLoading || !autoSaveState.hasUnsavedChanges}
          size="sm"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Now
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id="week-schedule-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
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
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations?.map((location: any) => (
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
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional description for this schedule template"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}