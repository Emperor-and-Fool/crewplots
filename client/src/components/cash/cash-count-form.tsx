import { useState } from "react";
import { useNavigate } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertCashCountSchema, type InsertCashCount, type CashCount, type Location } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface CashCountFormProps {
  cashCount?: CashCount;
  isEditing?: boolean;
}

export function CashCountForm({ cashCount, isEditing = false }: CashCountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Format date for display
  const formatDate = (date: Date | string) => {
    return date instanceof Date 
      ? format(date, "PPP") 
      : format(new Date(date), "PPP");
  };

  // Fetch locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  // Calculate discrepancy
  const calculateDiscrepancy = (formValues: any) => {
    const cashAmount = parseFloat(formValues.cashAmount || "0");
    const cardAmount = parseFloat(formValues.cardAmount || "0");
    const expectedAmount = parseFloat(formValues.expectedAmount || "0");
    
    if (!expectedAmount) return;
    
    const total = cashAmount + cardAmount;
    const discrepancy = total - expectedAmount;
    
    return discrepancy.toFixed(2);
  };

  // Form definition
  const form = useForm<InsertCashCount>({
    resolver: zodResolver(insertCashCountSchema),
    defaultValues: {
      locationId: cashCount?.locationId || (user?.locationId || 0),
      countType: cashCount?.countType || "opening",
      countDate: cashCount?.countDate || new Date(),
      cashAmount: cashCount?.cashAmount?.toString() || "0.00",
      cardAmount: cashCount?.cardAmount?.toString() || "0.00",
      floatAmount: cashCount?.floatAmount?.toString() || "500.00",
      expectedAmount: cashCount?.expectedAmount?.toString() || "0.00",
      discrepancy: cashCount?.discrepancy?.toString() || "0.00",
      notes: cashCount?.notes || "",
      verifiedBy: cashCount?.verifiedBy || null,
      createdBy: cashCount?.createdBy || user?.id || 0,
    },
  });

  // Watch form values for discrepancy calculation
  const watchedValues = form.watch();
  
  // Update discrepancy whenever relevant fields change
  useState(() => {
    const discrepancy = calculateDiscrepancy(watchedValues);
    if (discrepancy !== undefined) {
      form.setValue("discrepancy", discrepancy);
    }
  });

  // Mutation for creating/updating a cash count
  const mutation = useMutation({
    mutationFn: async (data: InsertCashCount) => {
      if (isEditing && cashCount) {
        return apiRequest('PUT', `/api/cash-counts/${cashCount.id}`, data);
      } else {
        return apiRequest('POST', '/api/cash-counts', data);
      }
    },
    onSuccess: async () => {
      // Invalidate queries to refetch the data
      await queryClient.invalidateQueries({ queryKey: ['/api/cash-counts'] });
      
      // Show success message
      toast({
        title: `Cash count ${isEditing ? 'updated' : 'created'} successfully`,
        description: `The cash count has been ${isEditing ? 'updated' : 'created'}.`,
        variant: "default",
      });
      
      // Redirect to cash management page
      navigate("/cash-management");
    },
    onError: (error) => {
      console.error('Error saving cash count:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} cash count. Please try again.`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  const onSubmit = async (data: InsertCashCount) => {
    setIsSubmitting(true);
    
    // Ensure all monetary values are valid
    const formattedData = {
      ...data,
      cashAmount: parseFloat(data.cashAmount.toString()).toFixed(2),
      cardAmount: parseFloat(data.cardAmount.toString()).toFixed(2),
      floatAmount: parseFloat(data.floatAmount.toString()).toFixed(2),
      expectedAmount: data.expectedAmount 
        ? parseFloat(data.expectedAmount.toString()).toFixed(2) 
        : null,
      discrepancy: data.discrepancy 
        ? parseFloat(data.discrepancy.toString()).toFixed(2) 
        : null,
    };
    
    mutation.mutate(formattedData as unknown as InsertCashCount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Cash Count' : 'New Cash Count'}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value?.toString()}
                        disabled={user?.role === "floor_manager" && user?.locationId !== null}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Count Type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select count type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="opening">Opening</SelectItem>
                          <SelectItem value="midday">Midday</SelectItem>
                          <SelectItem value="closing">Closing</SelectItem>
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
              name="countDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Count Date</FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cashAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-7"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            const discrepancy = calculateDiscrepancy({
                              ...watchedValues,
                              cashAmount: e.target.value
                            });
                            if (discrepancy !== undefined) {
                              form.setValue("discrepancy", discrepancy);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Total cash in register
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cardAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-7"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            const discrepancy = calculateDiscrepancy({
                              ...watchedValues,
                              cardAmount: e.target.value
                            });
                            if (discrepancy !== undefined) {
                              form.setValue("discrepancy", discrepancy);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Total card transactions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floatAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Float Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-7"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Starting cash float
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expectedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Amount (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-7"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(e.target.value || null);
                            const discrepancy = calculateDiscrepancy({
                              ...watchedValues,
                              expectedAmount: e.target.value
                            });
                            if (discrepancy !== undefined) {
                              form.setValue("discrepancy", discrepancy);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Expected total based on POS
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discrepancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discrepancy</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          {...field}
                          disabled
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Difference between actual and expected
                    </FormDescription>
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
                      placeholder="Any additional notes about this cash count..." 
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
              onClick={() => navigate("/cash-management")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Cash Count' : 'Submit Cash Count'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
