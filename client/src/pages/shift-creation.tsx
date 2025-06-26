import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Clock, Users, MapPin, Plus, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/modules/auth';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { ShiftRequirement, Competency, Location } from '@shared/schema';

// Schema for shift creation form
const shiftCreationSchema = z.object({
  title: z.string().min(1, 'Shift title is required'),
  locationId: z.number().min(1, 'Location is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.enum(['daily', 'weekly', 'monthly']).optional(),
  competencyRequirements: z.array(z.object({
    competencyId: z.number(),
    requiredCount: z.number().min(1),
    priority: z.enum(['required', 'preferred', 'optional']).default('required')
  })).default([])
});

type ShiftCreationForm = z.infer<typeof shiftCreationSchema>;

// Permission checking hook for scheduler features
const useSchedulerPermissions = () => {
  const { user } = useAuth();
  
  const checkSchedulerPermission = (subPermission?: string) => {
    const hasRole = ['administrator', 'owner', 'app_manager'].includes(user?.role || '');
    const hasBase = user?.permissions?.includes('scheduler_development');
    
    if (!hasRole || !hasBase) return false;
    
    if (!subPermission) return true; // Base access only
    
    return user?.permissions?.includes(`scheduler_development.${subPermission}`);
  };
  
  const hasCrewPlanning = user?.permissions?.includes('crew_planning');
  const hasAuthorizedRole = ['administrator', 'owner', 'app_manager'].includes(user?.role || '');
  
  return {
    canCreateShifts: hasAuthorizedRole && hasCrewPlanning,
    canViewDevelopment: checkSchedulerPermission('read'),
    canProposePlans: checkSchedulerPermission('write'),
    canPromoteTemplates: checkSchedulerPermission('execute'),
    canAccessScheduler: checkSchedulerPermission()
  };
};

export default function ShiftCreationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const permissions = useSchedulerPermissions();
  const [selectedCompetencies, setSelectedCompetencies] = useState<Array<{
    competencyId: number;
    requiredCount: number;
    priority: 'required' | 'preferred' | 'optional';
  }>>([]);

  // Form setup
  const form = useForm<ShiftCreationForm>({
    resolver: zodResolver(shiftCreationSchema),
    defaultValues: {
      title: '',
      locationId: 0,
      startTime: '',
      endTime: '',
      date: '',
      description: '',
      isRecurring: false,
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

  const { data: existingShifts = [] } = useQuery({
    queryKey: ['/api/shift-requirements'],
    enabled: permissions.canCreateShifts
  });

  // Mutations
  const createShiftMutation = useMutation({
    mutationFn: (data: ShiftCreationForm) => 
      apiRequest('/api/shift-requirements', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          createdBy: user?.id,
          status: 'draft'
        })
      }),
    onSuccess: () => {
      toast({ description: 'Shift created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/shift-requirements'] });
      form.reset();
      setSelectedCompetencies([]);
    },
    onError: () => {
      toast({ 
        description: 'Failed to create shift',
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
  const addCompetencyRequirement = () => {
    const competencyId = parseInt(form.watch('competencyRequirements.0.competencyId')?.toString() || '0');
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

  const onSubmit = (data: ShiftCreationForm) => {
    const formData = {
      ...data,
      competencyRequirements: selectedCompetencies
    };
    createShiftMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Create New Shift
          </h1>
          <p className="text-muted-foreground">
            Design shifts with competency requirements and scheduling details
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
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Shift Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="competencies">Requirements</TabsTrigger>
                      <TabsTrigger value="scheduling">Schedule</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4">
                      <FormField
                        control={form.control}
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
                        control={form.control}
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
                                {locations.map((location: Location) => (
                                  <SelectItem key={location.id} value={location.id.toString()}>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      {location.name}
                                    </div>
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCompetencyRequirement}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Requirement
                        </Button>
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
                            const competency = competencies.find((c: Competency) => c.id === req.competencyId);
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
                                      Remove
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
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
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
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button type="button" variant="outline">
                      Save as Draft
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createShiftMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {createShiftMutation.isPending ? 'Creating...' : 'Create Shift'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Shifts</span>
                <Badge variant="secondary">{existingShifts.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Locations</span>
                <Badge variant="secondary">{locations.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Competencies</span>
                <Badge variant="secondary">{competencies.length}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Shifts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              {existingShifts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No shifts created yet
                </p>
              ) : (
                <div className="space-y-3">
                  {existingShifts.slice(0, 5).map((shift: ShiftRequirement) => (
                    <div key={shift.id} className="p-3 rounded-lg border">
                      <div className="font-medium text-sm">{shift.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {shift.startTime} - {shift.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}