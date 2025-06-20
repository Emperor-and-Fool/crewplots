import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  insertCompetencySchema, insertStaffCompetencySchema,
  type InsertCompetency, type InsertStaffCompetency, 
  type Competency, type Location, type Staff, type StaffCompetency 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

interface CompetencyFormProps {
  competency?: Competency;
  staffCompetency?: StaffCompetency;
  isEditing?: boolean;
  type?: 'competency' | 'staffCompetency';
}

export function CompetencyForm({ 
  competency, 
  staffCompetency, 
  isEditing = false, 
  type = 'competency' 
}: CompetencyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch locations for competency creation
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
    enabled: type === 'competency',
  });

  // Fetch staff members for staff competency assignment
  const { data: staffMembers } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
    enabled: type === 'staffCompetency',
  });

  // Fetch competencies for staff competency assignment
  const { data: competencies } = useQuery<Competency[]>({
    queryKey: ['/api/competencies'],
    enabled: type === 'staffCompetency',
  });

  // Form for creating/editing a competency
  const competencyForm = useForm<InsertCompetency>({
    resolver: zodResolver(insertCompetencySchema),
    defaultValues: {
      name: competency?.name || "",
      description: competency?.description || "",
      locationId: competency?.locationId || 0,
    },
  });

  // Form for assigning a competency to a staff member
  const staffCompetencyForm = useForm<InsertStaffCompetency>({
    resolver: zodResolver(insertStaffCompetencySchema),
    defaultValues: {
      staffId: staffCompetency?.staffId || 0,
      competencyId: staffCompetency?.competencyId || 0,
      level: staffCompetency?.level || 3,
    },
  });

  // Mutation for creating/updating a competency
  const competencyMutation = useMutation({
    mutationFn: async (data: InsertCompetency) => {
      if (isEditing && competency) {
        return apiRequest('PUT', `/api/competencies/${competency.id}`, data);
      } else {
        return apiRequest('POST', '/api/competencies', data);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/competencies'] });
      
      toast({
        title: `Competency ${isEditing ? 'updated' : 'created'} successfully`,
        description: `The competency has been ${isEditing ? 'updated' : 'created'}.`,
        variant: "default",
      });
      
      navigate("/staff-management/competencies");
    },
    onError: (error) => {
      console.error('Error saving competency:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} competency. Please try again.`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Mutation for assigning/updating a staff competency
  const staffCompetencyMutation = useMutation({
    mutationFn: async (data: InsertStaffCompetency) => {
      if (isEditing && staffCompetency) {
        return apiRequest('PUT', `/api/staff-competencies/${staffCompetency.id}`, data);
      } else {
        return apiRequest('POST', '/api/staff-competencies', data);
      }
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/staff-competencies/staff', variables.staffId] });
      
      toast({
        title: `Staff competency ${isEditing ? 'updated' : 'assigned'} successfully`,
        description: `The competency has been ${isEditing ? 'updated' : 'assigned to the staff member'}.`,
        variant: "default",
      });
      
      navigate("/staff-management");
    },
    onError: (error) => {
      console.error('Error saving staff competency:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'assign'} staff competency. Please try again.`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handlers
  const onSubmitCompetency = async (data: InsertCompetency) => {
    setIsSubmitting(true);
    competencyMutation.mutate(data);
  };

  const onSubmitStaffCompetency = async (data: InsertStaffCompetency) => {
    setIsSubmitting(true);
    staffCompetencyMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === 'competency' 
            ? (isEditing ? 'Edit Competency' : 'Create New Competency')
            : (isEditing ? 'Edit Staff Competency' : 'Assign Competency to Staff')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {type === 'competency' ? (
          <Form {...competencyForm}>
            <form onSubmit={competencyForm.handleSubmit(onSubmitCompetency)} className="space-y-4">
              <FormField
                control={competencyForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competency Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Bar Service" {...field} />
                    </FormControl>
                    <FormDescription>
                      Name of the skill or competency
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={competencyForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this competency entails..." 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Detailed description of what this competency involves
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={competencyForm.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value ? field.value.toString() : undefined}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations?.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Which location is this competency for?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/staff-management/competencies")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : isEditing ? 'Update Competency' : 'Create Competency'}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...staffCompetencyForm}>
            <form onSubmit={staffCompetencyForm.handleSubmit(onSubmitStaffCompetency)} className="space-y-4">
              <FormField
                control={staffCompetencyForm.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value ? field.value.toString() : undefined}
                        disabled={isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffMembers?.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              Staff #{staff.id} - {staff.position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={staffCompetencyForm.control}
                name="competencyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competency</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value ? field.value.toString() : undefined}
                        disabled={isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a competency" />
                        </SelectTrigger>
                        <SelectContent>
                          {competencies?.map((comp) => (
                            <SelectItem key={comp.id} value={comp.id.toString()}>
                              {comp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={staffCompetencyForm.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competency Level (0-5)</FormLabel>
                    <div className="pt-2 pb-4">
                      <Tabs defaultValue={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                        <TabsList className="grid grid-cols-6">
                          {[0, 1, 2, 3, 4, 5].map((level) => (
                            <TabsTrigger key={level} value={level.toString()}>
                              {level}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                    <FormControl>
                      <Slider
                        min={0}
                        max={5}
                        step={1}
                        value={[field.value]}
                        onValueChange={(values) => field.onChange(values[0])}
                      />
                    </FormControl>
                    <FormDescription>
                      <span className="block mt-2">
                        Level 0: No experience
                      </span>
                      <span className="block">
                        Level 5: Expert level
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/staff-management")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : isEditing ? 'Update Staff Competency' : 'Assign Competency'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
