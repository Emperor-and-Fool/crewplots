import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import { Shield, Lock, Key, AlertTriangle, Settings, Users, Database } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const securityConfigSchema = z.object({
  sessionTimeout: z.number().min(5).max(1440, "Session timeout must be between 5 and 1440 minutes"),
  maxLoginAttempts: z.number().min(3).max(10, "Max login attempts must be between 3 and 10"),
  passwordMinLength: z.number().min(6).max(32, "Password length must be between 6 and 32 characters"),
  requirePasswordComplexity: z.boolean(),
  enableTwoFactor: z.boolean(),
  forcePasswordChange: z.number().min(0).max(365, "Password change period must be between 0 and 365 days"),
  enableAccountLockout: z.boolean(),
  lockoutDuration: z.number().min(5).max(120, "Lockout duration must be between 5 and 120 minutes"),
  enableAuditLogging: z.boolean(),
  logRetentionDays: z.number().min(7).max(365, "Log retention must be between 7 and 365 days")
});

type SecurityConfig = z.infer<typeof securityConfigSchema>;

export default function SecuritySettings() {
  const { toast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<SecurityConfig>({
    resolver: zodResolver(securityConfigSchema),
    defaultValues: {
      sessionTimeout: 60,
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requirePasswordComplexity: true,
      enableTwoFactor: false,
      forcePasswordChange: 90,
      enableAccountLockout: true,
      lockoutDuration: 15,
      enableAuditLogging: true,
      logRetentionDays: 30
    }
  });

  // Load current security settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['/api/security/settings'],
    queryFn: async () => {
      const response = await fetch('/api/security/settings', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch security settings');
      }
      return response.json();
    },
  });

  // Security configuration save mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: SecurityConfig) => {
      const response = await fetch('/api/security/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to save security configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Security Settings Saved",
        description: "Security configuration has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save security configuration. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Session management mutations
  const clearSessionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/security/clear-sessions', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear sessions');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sessions Cleared",
        description: "All user sessions have been cleared successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to clear sessions. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: SecurityConfig) => {
    saveConfigMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="lg:flex hidden">
          <Sidebar />
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="lg:hidden">
            <MobileNavbar />
          </div>
          
          <Header />
          
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
            <div className="container mx-auto max-w-4xl">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-muted rounded w-1/4"></div>
                <div className="h-64 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="lg:flex hidden">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden">
          <MobileNavbar />
        </div>
        
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <div className="container mx-auto max-w-4xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
                <p className="text-muted-foreground">
                  Configure authentication, authorization, and security policies
                </p>
              </div>
              <Badge variant="destructive" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Administrator Only
              </Badge>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Security configuration changes affect all users. Review settings carefully before saving.
              </AlertDescription>
            </Alert>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Authentication Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Authentication Settings
                    </CardTitle>
                    <CardDescription>
                      Configure user authentication and session policies
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sessionTimeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Session Timeout (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                placeholder="60"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Automatically log out inactive users
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxLoginAttempts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Login Attempts</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                placeholder="5"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Failed attempts before account lockout
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="enableTwoFactor"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Two-Factor Authentication
                            </FormLabel>
                            <FormDescription>
                              Require additional verification for login (Coming Soon)
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={true}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Password Policy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Password Policy
                    </CardTitle>
                    <CardDescription>
                      Set password requirements and security rules
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="passwordMinLength"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Password Length</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                placeholder="8"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="forcePasswordChange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Force Password Change (days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                placeholder="90"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              0 = Never force change
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="requirePasswordComplexity"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Require Password Complexity
                            </FormLabel>
                            <FormDescription>
                              Passwords must contain uppercase, lowercase, numbers, and symbols
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
                  </CardContent>
                </Card>

                {/* Account Security */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Account Security
                    </CardTitle>
                    <CardDescription>
                      Configure account lockout and monitoring settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="enableAccountLockout"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Enable Account Lockout
                            </FormLabel>
                            <FormDescription>
                              Temporarily lock accounts after failed login attempts
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

                    {form.watch('enableAccountLockout') && (
                      <FormField
                        control={form.control}
                        name="lockoutDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lockout Duration (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                placeholder="15"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              How long to lock accounts after max attempts reached
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Audit & Logging */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Audit & Logging
                    </CardTitle>
                    <CardDescription>
                      Configure security logging and audit trail settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="enableAuditLogging"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Enable Audit Logging
                            </FormLabel>
                            <FormDescription>
                              Track user actions and security events
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

                    {form.watch('enableAuditLogging') && (
                      <FormField
                        control={form.control}
                        name="logRetentionDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Log Retention Period (days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                placeholder="30"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              How long to keep audit logs before automatic deletion
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                <Separator />

                {/* Emergency Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Emergency Actions
                    </CardTitle>
                    <CardDescription>
                      Emergency security actions for administrators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          These actions immediately affect all users. Use only in emergency situations.
                        </AlertDescription>
                      </Alert>

                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => clearSessionsMutation.mutate()}
                        disabled={clearSessionsMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Users className="h-4 w-4" />
                        {clearSessionsMutation.isPending ? "Clearing..." : "Clear All User Sessions"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Save Configuration */}
                <div className="flex justify-end gap-4">
                  <Button
                    type="submit"
                    disabled={saveConfigMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    {saveConfigMutation.isPending ? "Saving..." : "Save Security Settings"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </main>
      </div>
    </div>
  );
}