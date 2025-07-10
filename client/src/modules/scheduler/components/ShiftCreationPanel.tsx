import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Clock, Users, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useCreateShift } from '../hooks/useSchedulerData';
import { useToast } from '@/hooks/use-toast';
import type { ShiftFormData, WeekScheduleWithShifts } from '../types/scheduler.types';

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

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' }
] as const;

const POSITION_TEMPLATES = [
  'Manager',
  'Staff',
  'Supervisor', 
  'Floor Staff',
  'Kitchen Staff',
  'Bar Staff',
  'Service Staff'
];

interface ShiftCreationPanelProps {
  weekSchedule: WeekScheduleWithShifts | null;
  onShiftCreated?: () => void;
}

export default function ShiftCreationPanel({ weekSchedule, onShiftCreated }: ShiftCreationPanelProps) {
  const { toast } = useToast();
  const createShift = useCreateShift();
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedCompetencies, setSelectedCompetencies] = useState<Array<{
    competencyId: number;
    requiredCount: number;
    priority: 'required' | 'preferred' | 'optional';
  }>>([]);

  // Fetch competencies for requirements
  const { data: competencies } = useQuery({
    queryKey: ['/api/competencies'],
    queryFn: async () => {
      const response = await fetch('/api/competencies', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch competencies');
      return response.json();
    }
  });

  const form = useForm<ShiftFormData>({
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

  const onSubmit = async (data: ShiftFormData) => {
    if (!weekSchedule?.id) {
      toast({
        title: "No week schedule",
        description: "Please select or create a week schedule first.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createShift.mutateAsync({
        ...data,
        weekScheduleId: weekSchedule.id,
        competencyRequirements: selectedCompetencies
      });

      toast({
        title: "Shifts created",
        description: `Created ${data.daysOfWeek.length} shift(s) for ${weekSchedule.name}`,
      });

      // Reset form
      form.reset();
      setSelectedCompetencies([]);
      onShiftCreated?.();
    } catch (error) {
      console.error('Failed to create shift:', error);
      toast({
        title: "Failed to create shifts",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const addCompetencyRequirement = () => {
    if (competencies && competencies.length > 0) {
      setSelectedCompetencies(prev => [...prev, {
        competencyId: competencies[0].id,
        requiredCount: 1,
        priority: 'required' as const
      }]);
    }
  };

  const removeCompetencyRequirement = (index: number) => {
    setSelectedCompetencies(prev => prev.filter((_, i) => i !== index));
  };

  const updateCompetencyRequirement = (index: number, field: string, value: any) => {
    setSelectedCompetencies(prev => prev.map((req, i) => 
      i === index ? { ...req, [field]: value } : req
    ));
  };

  if (!weekSchedule) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            Select or create a week schedule to add shifts
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Shifts to: {weekSchedule.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="competencies">Requirements</TabsTrigger>
                <TabsTrigger value="scheduling">Schedule</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Evening Service" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select position" />
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
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Optional shift description"
                          className="resize-none"
                          rows={3}
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
                  <div>
                    <h4 className="text-sm font-medium">Competency Requirements</h4>
                    <p className="text-sm text-muted-foreground">
                      Define skills needed for this shift
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCompetencyRequirement}
                    disabled={!competencies || competencies.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Requirement
                  </Button>
                </div>

                {selectedCompetencies.map((requirement, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                          <label className="text-sm font-medium">Competency</label>
                          <Select
                            value={requirement.competencyId.toString()}
                            onValueChange={(value) => updateCompetencyRequirement(index, 'competencyId', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {competencies?.map((comp: any) => (
                                <SelectItem key={comp.id} value={comp.id.toString()}>
                                  {comp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Required Count</label>
                          <Input
                            type="number"
                            min="1"
                            value={requirement.requiredCount}
                            onChange={(e) => updateCompetencyRequirement(index, 'requiredCount', parseInt(e.target.value) || 1)}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">Priority</label>
                          <Select
                            value={requirement.priority}
                            onValueChange={(value) => updateCompetencyRequirement(index, 'priority', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="required">Required</SelectItem>
                              <SelectItem value="preferred">Preferred</SelectItem>
                              <SelectItem value="optional">Optional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCompetencyRequirement(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {selectedCompetencies.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No competency requirements added yet
                  </div>
                )}
              </TabsContent>

              <TabsContent value="scheduling" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                    control={form.control}
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
                  control={form.control}
                  name="daysOfWeek"
                  render={() => (
                    <FormItem>
                      <FormLabel>Days of Week</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {DAYS_OF_WEEK.map((day) => (
                          <FormField
                            key={day.id}
                            control={form.control}
                            name="daysOfWeek"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day.id as any)}
                                    onCheckedChange={(checked) => {
                                      const updatedDays = checked
                                        ? [...(field.value || []), day.id]
                                        : field.value?.filter((d) => d !== day.id) || [];
                                      field.onChange(updatedDays);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {day.label}
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
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={createShift.isPending}
                className="min-w-[120px]"
              >
                {createShift.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Shifts
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}