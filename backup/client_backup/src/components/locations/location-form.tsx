import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertLocationSchema, type InsertLocation, type Location } from "@shared/schema";
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

interface LocationFormProps {
  location?: Location;
  isEditing?: boolean;
}

export function LocationForm({ location, isEditing = false }: LocationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form definition
  const form = useForm<InsertLocation>({
    resolver: zodResolver(insertLocationSchema),
    defaultValues: {
      name: location?.name || "",
      address: location?.address || "",
      contactPerson: location?.contactPerson || "",
      contactEmail: location?.contactEmail || "",
      contactPhone: location?.contactPhone || "",
    },
  });

  // Mutation for creating/updating a location
  const mutation = useMutation({
    mutationFn: async (data: InsertLocation) => {
      if (isEditing && location) {
        return apiRequest('PUT', `/api/locations/${location.id}`, data);
      } else {
        return apiRequest('POST', '/api/locations', data);
      }
    },
    onSuccess: async () => {
      // Invalidate the locations query to refetch the data
      await queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      
      // Show success message
      toast({
        title: `Location ${isEditing ? 'updated' : 'created'} successfully`,
        description: `The location has been ${isEditing ? 'updated' : 'created'}.`,
        variant: "default",
      });
      
      // Redirect to locations list
      navigate("/locations");
    },
    onError: (error) => {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} location. Please try again.`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  const onSubmit = async (data: InsertLocation) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Location' : 'Create New Location'}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Café de Tulp" {...field} />
                  </FormControl>
                  <FormDescription>
                    The name of the bar or restaurant
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="123 Main Street, City, State, ZIP" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="Pieter de Jong" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="p.dejong@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="612345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/locations")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Location' : 'Create Location'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
