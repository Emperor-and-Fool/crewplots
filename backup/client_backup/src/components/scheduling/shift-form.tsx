import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertShiftSchema, type InsertShift, type Shift, type Staff, type User, type Competency, type WeeklySchedule } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { parse, format } from "date-fns";

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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

interface ShiftFormProps {
  shift?: Shift;
  isEditing?: boolean;
}

// Parse query params
const parseQueryParams = () => {
  if (typeof window === "undefined") return {};
  
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const date = params.get("date");
  const timeSlot = params.get("timeSlot");
  
  return { date, timeSlot };
};

export function ShiftForm({ shift, isEditing = false }: ShiftFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse query params for pre-filling form
  const { date: queryDate, timeSlot: queryTimeSlot } = parseQueryParams();
  
  // Parse time slot if provided
  const [defaultStartTime, defaultEndTime] = queryTimeSlot 
    ? queryTimeSlot.split(" - ") 
    : ["", ""];

  // Format date for display
  const formatDate = (date: Date | string) => {
    return date instanceof Date 
      ? format(date, "PPP") 
      : format(new Date(date), "PPP");
  };

  // Fetch active weekly schedule
  const { data: weeklySchedules } = useQuery<WeeklySchedule[]>({
    queryKey: ['/api/weekly-schedules'],
  });

  // Use the most recent schedule
  const activeSchedule = weeklySchedules
    ? [...weeklySchedules].sort((a, b) => {
        return new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime();
      })[0]
    : undefined;

  // Fetch staff members
  const { data: staffMembers } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
  });

  // Fetch users to get names
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!staffMembers,
  });

  // Fetch competencies
  const { data: competencies } = useQuery<Competency[]>({
    queryKey: ['/api/competencies'],
  });

  // Prepare staff options with names
  const staffOptions = staffMembers?.map(staff => {
    const user = users?.find(u => u.id === staff.userId);
    return {
      id: staff.id,
      name: user?.name || `Staff #${staff.id}`,
      position: staff.position
    };
  });

  // Form definition
  const form = useForm<InsertShift>({
    resolver: zodResolver(insertShiftSchema),
    defaultValues: {
      scheduleId: shift?.scheduleId || activeSchedule?.id || 0,
      staffId: shift?.staffId || null,
      date: shift?.date || (queryDate ? new Date(queryDate) : new Date()),
      startTime: shift?.startTime || defaultStartTime || "9:00 AM",
      endTime: shift?.endTime || defaultEndTime || "2:00 PM",
      role: shift?.role || "Bar",
      requiredCompetencyLevel: shift?.requiredCompetencyLevel || null,
      competencyId: shift?.competencyId || null,
      notes: shift?.notes || "",
    },
  });

  // Mutation for creating/updating a shift
  const mutation = useMutation({
    mutationFn: async (data: InsertShift) => {
      if (isEditing && shift) {
        return apiRequest('PUT', `/api/shifts/${shift.id}`, data);
      } else {
        return apiRequest('POST', '/api/shifts', data);
      }
    },
    onSuccess: async () => {
      // Invalidate the shifts query to refetch the data
      await queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      
      // Show success message
      toast({
        title: `Shift ${isEditing ? 'updated' : 'created'} successfully`,
        description: `The shift has been ${isEditing ? 'updated' : 'created'}.`,
        variant: "default",
      });
      
      // Redirect to scheduling page
      navigate("/scheduling");
    },
    onError: (error) => {
      console.error('Error saving shift:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} shift. Please try again.`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  const onSubmit = async (data: InsertShift) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Shift' : 'Create New Shift'}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Shift Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className="w-full pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            formatDate(field.value)
                          ) : (
                            <span className="text-muted-foreground">Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value instanceof Date ? field.value : new Date(field.value)}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The date when this shift will occur
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input placeholder="9:00 AM" {...field} />
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
                      <Input placeholder="5:00 PM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Staff (Optional)</FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                      defaultValue={field.value?.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a staff member (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {staffOptions?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.name} - {staff.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Leave unassigned to create an open shift
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bar">Bar</SelectItem>
                        <SelectItem value="Floor">Floor</SelectItem>
                        <SelectItem value="Bar Manager">Bar Manager</SelectItem>
                        <SelectItem value="Floor Manager">Floor Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="competencyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Competency (Optional)</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                        defaultValue={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a competency (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
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
                control={form.control}
                name="requiredCompetencyLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Level (Optional)</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                        defaultValue={field.value?.toString()}
                        disabled={!form.watch("competencyId")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select level (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {[1, 2, 3, 4, 5].map((level) => (
                            <SelectItem key={level} value={level.toString()}>
                              Level {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional information about this shift..." 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/scheduling")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Shift' : 'Create Shift'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
