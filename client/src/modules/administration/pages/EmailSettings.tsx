import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
import { Mail, Server, Shield, AlertCircle, CheckCircle, Send } from "lucide-react";

const emailConfigSchema = z.object({
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.number().min(1).max(65535, "Valid port range: 1-65535"),
  smtpUsername: z.string().min(1, "SMTP username is required"),
  smtpPassword: z.string().min(1, "SMTP password is required"),
  smtpSecure: z.boolean(),
  fromEmail: z.string().email("Valid email address required"),
  fromName: z.string().min(1, "From name is required"),
  enableEmail: z.boolean()
});

type EmailConfig = z.infer<typeof emailConfigSchema>;

export default function EmailSettings() {
  const { toast } = useToast();
  const [isTestMode, setIsTestMode] = useState(false);

  const form = useForm<EmailConfig>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpUsername: "",
      smtpPassword: "",
      smtpSecure: true,
      fromEmail: "",
      fromName: "CrewPlots Pro",
      enableEmail: false
    }
  });

  // Email configuration save mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: EmailConfig) => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: 'emailSettings',
          operation: 'update',
          data: data
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to save email configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Email settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save email configuration. Please check your settings.",
        variant: "destructive",
      });
    }
  });

  // Email test mutation
  const testEmailMutation = useMutation({
    mutationFn: async (data: { recipientEmail: string; testMode: boolean }) => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: 'emailTest',
          operation: 'send',
          data: {
            recipientEmail: data.recipientEmail,
            templateType: 'test',
            testMode: data.testMode
          }
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to send test email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "Test email has been sent successfully. Check your inbox.",
      });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: "Failed to send test email. Please check your configuration.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: EmailConfig) => {
    saveConfigMutation.mutate(data);
  };

  const handleTestEmail = () => {
    const recipientEmail = form.getValues('fromEmail');
    if (!recipientEmail) {
      toast({
        title: "Email Required",
        description: "Please enter a 'From Email' address to test.",
        variant: "destructive",
      });
      return;
    }

    testEmailMutation.mutate({
      recipientEmail,
      testMode: isTestMode
    });
  };

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
                <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
                <p className="text-muted-foreground">
                  Configure SMTP settings for outbound email notifications
                </p>
              </div>
              <Badge variant="outline" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Administrator Only
              </Badge>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Email configuration requires administrator privileges. Changes affect system-wide notifications.
              </AlertDescription>
            </Alert>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Email System Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Email System Status
                    </CardTitle>
                    <CardDescription>
                      Enable or disable the email notification system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="enableEmail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Enable Email System
                            </FormLabel>
                            <FormDescription>
                              Allow the system to send email notifications to users
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

                {/* SMTP Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      SMTP Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure your SMTP server settings for sending emails
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="smtpHost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Host</FormLabel>
                            <FormControl>
                              <Input placeholder="smtp.gmail.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smtpPort"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Port</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                placeholder="587"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="smtpUsername"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Username</FormLabel>
                            <FormControl>
                              <Input placeholder="your-email@gmail.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smtpPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="smtpSecure"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Secure Connection (TLS/SSL)
                            </FormLabel>
                            <FormDescription>
                              Use encrypted connection to SMTP server
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

                {/* Sender Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Sender Information
                    </CardTitle>
                    <CardDescription>
                      Configure the sender details for outgoing emails
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fromEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="noreply@yourcompany.com" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fromName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Name</FormLabel>
                            <FormControl>
                              <Input placeholder="CrewPlots Pro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                {/* Test Email Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      Test Email Configuration
                    </CardTitle>
                    <CardDescription>
                      Send a test email to verify your configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">Test Mode</div>
                        <div className="text-sm text-muted-foreground">
                          Enable test mode for validation testing
                        </div>
                      </div>
                      <Switch
                        checked={isTestMode}
                        onCheckedChange={setIsTestMode}
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestEmail}
                        disabled={testEmailMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                      </Button>

                      {isTestMode && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Test Mode Active
                        </Badge>
                      )}
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
                    {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
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