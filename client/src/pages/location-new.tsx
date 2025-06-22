import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Building2, Upload, Image, Search, MapPin } from 'lucide-react';
import { insertLocationSchema, type InsertLocation } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Sidebar } from '@/components/sidebar';

const locationFormSchema = insertLocationSchema.extend({
  timezone: insertLocationSchema.shape.timezone.optional(),
  status: insertLocationSchema.shape.status.optional(),
});

type LocationFormData = typeof locationFormSchema._type;

function NewLocationPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLookingUpAddress, setIsLookingUpAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: '',
      address: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      timezone: 'Europe/Amsterdam',
      status: 'active',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      // First create the location
      const locationResponse = await apiRequest('POST', '/api/locations', data);
      
      // If there's a logo file, upload it
      if (logoFile && locationResponse.id) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        
        const uploadResponse = await fetch(`/api/locations/${locationResponse.id}/logo`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload logo');
        }
      }
      
      return locationResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      toast({
        title: "Location created",
        description: "The new location has been successfully created.",
      });
      navigate('/locations');
    },
    onError: (error: any) => {
      toast({
        title: "Error creating location",
        description: error.message || "Failed to create location. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const lookupAddress = async (address: string) => {
    if (!address.trim()) return;
    
    setIsLookingUpAddress(true);
    try {
      const response = await fetch('/api/locations/lookup-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ address }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Address lookup result:', result);
        
        if (result.address && result.address !== address) {
          setAddressSuggestions([result.address]);
          toast({
            title: "Address found",
            description: `Found: ${result.city || ''} ${result.postalCode || ''}`.trim(),
          });
        }
        
        // Auto-fill postal code or city if found
        if (result.postalCode && result.city) {
          const updatedAddress = `${address}\n${result.city} ${result.postalCode}`;
          form.setValue('address', updatedAddress);
        }
      }
    } catch (error) {
      console.error('Address lookup failed:', error);
      toast({
        title: "Address lookup failed",
        description: "Could not validate the address. Please check manually.",
        variant: "destructive",
      });
    } finally {
      setIsLookingUpAddress(false);
    }
  };

  const onSubmit = (data: LocationFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/locations')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Locations
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Create New Location</h1>
                <p className="text-gray-600">Add a new hotel location or property</p>
              </div>
            </div>

            <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Location Details
          </CardTitle>
          <CardDescription>
            Enter the basic information for your new location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Logo Upload Section */}
              <div className="space-y-4">
                <FormLabel>Location Logo</FormLabel>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="w-16 h-16 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center border">
                      <Image className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload">
                      <Button type="button" variant="outline" className="cursor-pointer" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Choose Logo
                        </span>
                      </Button>
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      PNG, JPG up to 2MB. Recommended size: 200x200px
                    </p>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name *</FormLabel>
                    <FormControl>
          <Input placeholder="e.g., Grand Hotel Amsterdam" {...field} />
                    </FormControl>
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
                      <div className="space-y-2">
                        <Textarea 
                          placeholder="Full address including city and postal code" 
                          {...field} 
                          rows={3}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => lookupAddress(field.value)}
                          disabled={!field.value || isLookingUpAddress}
                          className="w-full"
                        >
                          {isLookingUpAddress ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                              Looking up address...
                            </>
                          ) : (
                            <>
                              <MapPin className="h-4 w-4 mr-2" />
                              Lookup Postal Code & Validate
                            </>
                          )}
                        </Button>
                        {addressSuggestions.length > 0 && (
                          <div className="p-3 bg-blue-50 rounded-md">
                            <p className="text-sm font-medium text-blue-800 mb-2">Suggestions:</p>
                            {addressSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                className="text-sm text-blue-600 hover:text-blue-800 underline block"
                                onClick={() => {
                                  form.setValue('address', suggestion);
                                  setAddressSuggestions([]);
                                }}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Manager name" {...field} />
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+31 6 12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="location@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Europe/Amsterdam">Europe/Amsterdam</SelectItem>
                          <SelectItem value="Europe/London">Europe/London</SelectItem>
                          <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                          <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                          <SelectItem value="America/New_York">America/New_York</SelectItem>
                          <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/locations')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                  className="flex-1"
                >
                  {mutation.isPending ? 'Creating...' : 'Create Location'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewLocationPage;