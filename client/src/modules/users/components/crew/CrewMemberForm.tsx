import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Location, UserLocation, InsertUserLocation, insertUserLocationSchema } from "@shared/schema";

interface CrewMemberFormProps {
  userLocation?: UserLocation;
  isEditing?: boolean;
}

export function CrewMemberForm({ userLocation, isEditing = false }: CrewMemberFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available users from profile data
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/profile-data'],
    staleTime: 2 * 60 * 1000,
  });

  // Fetch locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  // Form definition
  const form = useForm<InsertUserLocation>({
    resolver: zodResolver(insertUserLocationSchema),
    defaultValues: {
      userId: userLocation?.userId || 0,
      locationId: userLocation?.locationId || 0,
      roleAtLocation: userLocation?.roleAtLocation || "crew_member",
      position: userLocation?.position || "",
      wantedHours: userLocation?.wantedHours || 20,
    },
  });

  // Mutation for creating/updating a crew member assignment
  const mutation = useMutation({
    mutationFn: async (data: InsertUserLocation) => {
      if (isEditing && userLocation) {
        return apiRequest('PUT', `/api/user-locations/${userLocation.id}`, data);
      } else {
        return apiRequest('POST', '/api/user-locations', data);
      }
    },
    onSuccess: async () => {
      // Invalidate queries to refetch the data
      await queryClient.invalidateQueries({ queryKey: ['/api/user-locations'] });
      
      // Show success message
      toast({
        title: `Crew member ${isEditing ? 'updated' : 'assigned'} successfully`,
        description: `The crew member has been ${isEditing ? 'updated' : 'assigned to location'}.`,
        variant: "default",
      });
      
      // Redirect to crew list
      navigate("/crew-management");
    },
    onError: (error) => {
      console.error('Error saving crew member:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'assign'} crew member. Please try again.`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  const onSubmit = async (data: InsertUserLocation) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Crew Member Assignment' : 'Assign Crew Member to Location'}</CardTitle>
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
                    Select a user account to assign as crew member
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
              name="roleAtLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role at Location</FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crew_member">Crew Member</SelectItem>
                        <SelectItem value="crew_chief">Crew Chief</SelectItem>
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
                    Target weekly hours for this crew member
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
              onClick={() => navigate("/crew-management")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Crew Assignment' : 'Assign Crew Member'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}