import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Mail, Server, Shield, TestTube, Eye } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const emailConfigSchema = z.object({
  host: z.string().min(1, 'SMTP Host is required'),
  port: z.number().min(1).max(65535, 'Port must be between 1 and 65535'),
  secure: z.boolean(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  fromEmail: z.string().email('Invalid email address'),
  fromName: z.string().min(1, 'From name is required'),
  testMode: z.boolean()
});

type EmailConfigForm = z.infer<typeof emailConfigSchema>;

interface SentEmail {
  id: string;
  to: string | string[];
  subject: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'failed';
}

export default function EmailSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [showSentEmails, setShowSentEmails] = useState(false);

  const form = useForm<EmailConfigForm>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      username: '',
      password: '',
      fromEmail: 'noreply@crewplots.com',
      fromName: 'CrewPlots',
      testMode: true
    }
  });

  // Load current configuration
  useEffect(() => {
    loadCurrentConfig();
    loadSentEmails();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'emailConfig',
          operation: 'read',
          data: {}
        })
      });
      if (response.ok) {
        const result = await response.json();
        const config = result.threads?.transaction?.data;
        if (config) {
          form.reset({
            host: config.host || 'smtp.office365.com',
            port: config.port || 587,
            secure: config.secure || false,
            username: config.auth?.user || '',
            password: '', // Never show password
            fromEmail: config.from?.match(/<(.+)>$/)?.[1] || config.from || 'noreply@crewplots.com',
            fromName: config.from?.match(/^(.+)\s<.+>$/)?.[1] || 'CrewPlots',
            testMode: config.testMode !== false
          });
        }
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
    }
  };

  const loadSentEmails = async () => {
    try {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'emailSent',
          operation: 'read',
          data: {}
        })
      });
      if (response.ok) {
        const result = await response.json();
        const emails = result.threads?.transaction?.data || [];
        setSentEmails(emails);
      }
    } catch (error) {
      console.error('Failed to load sent emails:', error);
    }
  };

  const onSubmit = async (data: EmailConfigForm) => {
    setIsLoading(true);
    try {
      const config = {
        host: data.host,
        port: data.port,
        secure: data.secure,
        auth: {
          user: data.username,
          pass: data.password
        },
        from: `${data.fromName} <${data.fromEmail}>`,
        testMode: data.testMode
      };

      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entityType: 'emailConfig',
          operation: 'update',
          data: config
        })
      });

      if (response.ok) {
        toast({
          title: 'Email Configuration Saved',
          description: `Email service configured in ${data.testMode ? 'test' : 'production'} mode`
        });
        setConnectionStatus('unknown');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      toast({
        title: 'Configuration Error',
        description: 'Failed to save email configuration',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'emailTest',
          operation: 'create',
          data: {}
        })
      });

      if (response.ok) {
        const result = await response.json();
        const testData = result.threads?.transaction?.data;
        
        if (testData?.success) {
          setConnectionStatus('connected');
          toast({
            title: 'Connection Successful',
            description: testData.message
          });
        } else {
          setConnectionStatus('failed');
          toast({
            title: 'Connection Failed',
            description: testData?.message || 'Failed to connect to email server',
            variant: 'destructive'
          });
        }
      } else {
        throw new Error('Test request failed');
      }
    } catch (error) {
      setConnectionStatus('failed');
      toast({
        title: 'Connection Error',
        description: 'Failed to test email connection',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestEmail = async () => {
    try {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'emailTest',
          operation: 'send',
          data: {
            recipientEmail: 'test@example.com',
            templateType: 'test',
            testMode: true
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const testData = result.threads?.transaction?.data;
        
        if (testData?.success) {
          toast({
            title: 'Test Email Sent',
            description: testData.message || 'Test email sent successfully'
          });
          // Refresh sent emails to show the new test email
          loadSentEmails();
        } else {
          toast({
            title: 'Test Email Failed',
            description: testData?.message || 'Failed to send test email',
            variant: 'destructive'
          });
        }
      } else {
        throw new Error('Test email request failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test email',
        variant: 'destructive'
      });
    }
  };

  const clearSentEmails = async () => {
    try {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'emailSent',
          operation: 'delete',
          data: {}
        })
      });

      if (response.ok) {
        setSentEmails([]);
        toast({
          title: 'Email History Cleared',
          description: 'All test emails have been removed'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear email history',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Email Settings</h1>
          <p className="text-gray-600">Configure SMTP settings for sending emails</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          Test Mode Active
        </Badge>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Set up SMTP server settings for sending notifications and communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Test Mode Toggle */}
              <FormField
                control={form.control}
                name="testMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <TestTube className="h-4 w-4" />
                        Test Mode
                      </FormLabel>
                      <div className="text-sm text-gray-500">
                        Capture emails locally instead of sending them
                      </div>
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

              {/* SMTP Server Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <Label className="text-base font-medium">SMTP Server</Label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Host</FormLabel>
                        <FormControl>
                          <Input placeholder="smtp.office365.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="587"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 587)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secure"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">
                            <Shield className="h-3 w-3 inline mr-1" />
                            SSL/TLS
                          </FormLabel>
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
                </div>
              </div>

              {/* Authentication */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Authentication</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="admin@crewplots.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Enter password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* From Address */}
              <div className="space-y-4">
                <Label className="text-base font-medium">From Address</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Name</FormLabel>
                        <FormControl>
                          <Input placeholder="CrewPlots" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fromEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Email</FormLabel>
                        <FormControl>
                          <Input placeholder="noreply@crewplots.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Configuration'}
                </Button>
                
                <Button type="button" variant="outline" onClick={testConnection} disabled={isLoading}>
                  Test Connection
                </Button>

                <Button type="button" variant="outline" onClick={sendTestEmail} disabled={isLoading}>
                  Send Test Email
                </Button>

                {connectionStatus !== 'unknown' && (
                  <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
                    {connectionStatus === 'connected' ? 'Connected' : 'Failed'}
                  </Badge>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Test Email Viewer */}
      {form.watch('testMode') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Test Email History
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowSentEmails(!showSentEmails)}
                >
                  {showSentEmails ? 'Hide' : 'View'} Emails ({sentEmails.length})
                </Button>
                {sentEmails.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearSentEmails}>
                    Clear History
                  </Button>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              View emails captured in test mode
            </CardDescription>
          </CardHeader>
          
          {showSentEmails && (
            <CardContent>
              {sentEmails.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No test emails captured yet</p>
              ) : (
                <div className="space-y-3">
                  {sentEmails.map((email) => (
                    <div key={email.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{email.subject}</p>
                          <p className="text-sm text-gray-600">To: {Array.isArray(email.to) ? email.to.join(', ') : email.to}</p>
                        </div>
                        <Badge variant={email.status === 'sent' ? 'default' : 'destructive'}>
                          {email.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">{new Date(email.timestamp).toLocaleString()}</p>
                      <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: email.content }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}