import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertStaffSchema, type InsertStaff, type Staff, type User, type Location } from "@shared/schema";
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StaffFormProps {
  staff?: Staff;
  isEditing?: boolean;
}

export function StaffForm({ staff, isEditing = false }: StaffFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available users (staff role)
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users/role/staff'],
  });

  // Fetch locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  // Form definition
  const form = useForm<InsertStaff>({
    resolver: zodResolver(insertStaffSchema),
    defaultValues: {
      userId: staff?.userId || 0,
      locationId: staff?.locationId || 0,
      position: staff?.position || "",
      wantedHours: staff?.wantedHours || 20,
    },
  });

  // Mutation for creating/updating a staff member
  const mutation = useMutation({
    mutationFn: async (data: InsertStaff) => {
      if (isEditing && staff) {
        return apiRequest('PUT', `/api/staff/${staff.id}`, data);
      } else {
        return apiRequest('POST', '/api/staff', data);
      }
    },
    onSuccess: async () => {
      // Invalidate queries to refetch the data
      await queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      
      // Show success message
      toast({
        title: `Staff member ${isEditing ? 'updated' : 'created'} successfully`,
        description: `The staff member has been ${isEditing ? 'updated' : 'created'}.`,
        variant: "default",
      });
      
      // Redirect to staff list
      navigate("/staff-management");
    },
    onError: (error) => {
      console.error('Error saving staff member:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} staff member. Please try again.`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  const onSubmit = async (data: InsertStaff) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Staff Member' : 'Create New Staff Member'}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Select a user account to assign as staff
                  </FormDescription>
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
                  <FormControl>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value.toString()}
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
                    Assign to a specific location
                  </FormDescription>
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
                  <FormControl>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bar">Bar</SelectItem>
                        <SelectItem value="Floor">Floor</SelectItem>
                        <SelectItem value="Bar / Floor">Bar / Floor</SelectItem>
                        <SelectItem value="Floor Manager">Floor Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wantedHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wanted Hours (per week)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="40" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))} 
                    />
                  </FormControl>
                  <FormDescription>
                    Target weekly hours for this staff member
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/staff-management")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Staff Member' : 'Create Staff Member'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
