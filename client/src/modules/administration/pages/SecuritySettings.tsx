import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Shield, Trash2, Mail, Clock, FileText, AlertTriangle } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

const securitySettingsSchema = z.object({
  locationDeletion: z.object({
    method: z.enum(['basic', 'email_verification']),
    confirmationSteps: z.number().min(1).max(5),
    notificationEmails: z.string(),
    tokenExpiration: z.number().min(1).max(168), // 1 hour to 7 days
    auditTrail: z.boolean(),
    requireReason: z.boolean(),
    reversibilityWindow: z.number().min(0).max(30) // 0 to 30 days
  })
});

type SecuritySettingsForm = z.infer<typeof securitySettingsSchema>;

export default function SecuritySettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SecuritySettingsForm>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      locationDeletion: {
        method: 'basic',
        confirmationSteps: 3,
        notificationEmails: '',
        tokenExpiration: 24,
        auditTrail: true,
        requireReason: true,
        reversibilityWindow: 7
      }
    }
  });

  // Load current settings
  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      const response = await fetch('/api/security/settings', {
        credentials: 'include'
      });

      if (response.ok) {
        const settings = await response.json();
        if (settings.locationDeletion) {
          form.reset({
            locationDeletion: {
              ...form.getValues().locationDeletion,
              ...settings.locationDeletion,
              notificationEmails: settings.locationDeletion.notificationEmails?.join(', ') || ''
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  };

  const onSubmit = async (data: SecuritySettingsForm) => {
    setIsLoading(true);
    try {
      // Parse email list
      const emailList = data.locationDeletion.notificationEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const payload = {
        locationDeletion: {
          ...data.locationDeletion,
          notificationEmails: emailList
        }
      };

      const response = await fetch('/api/security/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast({
          title: 'Security Settings Saved',
          description: 'Location deletion security settings have been updated successfully'
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save security settings',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deletionMethod = form.watch('locationDeletion.method');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-gray-600">Configure security policies and access controls</p>
        </div>
        <Badge variant="outline" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Administrator Only
        </Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Location Deletion Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Location Deletion Security
              </CardTitle>
              <CardDescription>
                Configure how location deletions are handled and secured
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Deletion Method */}
              <FormField
                control={form.control}
                name="locationDeletion.method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deletion Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select deletion method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="basic">Basic Confirmation</SelectItem>
                        <SelectItem value="email_verification">Email Verification Required</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Basic: Multi-step confirmation dialog. Email: Requires email verification link.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirmation Steps */}
              <FormField
                control={form.control}
                name="locationDeletion.confirmationSteps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmation Steps</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Step (Dangerous)</SelectItem>
                        <SelectItem value="2">2 Steps (Basic)</SelectItem>
                        <SelectItem value="3">3 Steps (Recommended)</SelectItem>
                        <SelectItem value="4">4 Steps (High Security)</SelectItem>
                        <SelectItem value="5">5 Steps (Maximum Security)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Number of confirmation dialogs before deletion proceeds
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email Verification Settings */}
              {deletionMethod === 'email_verification' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Verification Settings
                    </h4>

                    <FormField
                      control={form.control}
                      name="locationDeletion.notificationEmails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notification Emails</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="admin@example.com, manager@example.com"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Comma-separated list of emails that will receive deletion verification links
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="locationDeletion.tokenExpiration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token Expiration (hours)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 Hour</SelectItem>
                              <SelectItem value="6">6 Hours</SelectItem>
                              <SelectItem value="24">24 Hours (Recommended)</SelectItem>
                              <SelectItem value="48">48 Hours</SelectItem>
                              <SelectItem value="168">7 Days</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How long email verification links remain valid
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <Separator />

              {/* Additional Security Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Additional Security
                </h4>

                <FormField
                  control={form.control}
                  name="locationDeletion.requireReason"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Require Deletion Reason</FormLabel>
                        <FormDescription>
                          Users must provide a reason when deleting locations
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationDeletion.auditTrail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Audit Trail</FormLabel>
                        <FormDescription>
                          Log all deletion requests and actions for compliance
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationDeletion.reversibilityWindow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reversibility Window (days)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">No Recovery (Permanent)</SelectItem>
                          <SelectItem value="1">1 Day</SelectItem>
                          <SelectItem value="7">7 Days (Recommended)</SelectItem>
                          <SelectItem value="14">14 Days</SelectItem>
                          <SelectItem value="30">30 Days</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How long deleted locations can be recovered before permanent deletion
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Future Security Features Placeholder */}
          <Card className="bg-gray-50 border-dashed">
            <CardHeader>
              <CardTitle className="text-gray-600 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Future Security Features
              </CardTitle>
              <CardDescription>
                Additional security settings will be added here as the platform grows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500 space-y-1">
                <div>• Password Policy Configuration</div>
                <div>• Session Management Settings</div>
                <div>• Two-Factor Authentication</div>
                <div>• API Rate Limiting</div>
                <div>• Data Encryption Settings</div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Security Settings'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}