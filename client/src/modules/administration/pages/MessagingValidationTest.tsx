import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  MessageSquare,
  Database,
  Shield,
  Zap
} from "lucide-react";

interface ValidationTestResult {
  isValid: boolean;
  message: string;
  executionTime?: number;
  threads?: {
    assembly?: { status: string; data?: any };
    schema?: { status: string; errors?: string[] };
    permission?: { status: string; permissions?: string[] };
    business?: { status: string; rules?: string[] };
    transaction?: { status: string; data?: any };
  };
}

export default function MessagingValidationTest() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Record<string, ValidationTestResult>>({});

  // Messaging Read Test
  const messagingReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: 'messaging',
          operation: 'read',
          data: {
            userId: 1,
            operation: 'read'
          }
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute messaging read test');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setTestResults(prev => ({ ...prev, messagingRead: data }));
      toast({
        title: "Messaging Read Test Complete",
        description: data.isValid ? "Test passed successfully" : "Test failed - check results",
        variant: data.isValid ? "default" : "destructive",
      });
    },
    onError: (error) => {
      setTestResults(prev => ({ 
        ...prev, 
        messagingRead: { 
          isValid: false, 
          message: error.message || "Test execution failed" 
        } 
      }));
      toast({
        title: "Test Failed",
        description: "Failed to execute messaging read test",
        variant: "destructive",
      });
    }
  });

  // Email System Test
  const emailTestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: 'emailTest',
          operation: 'validate',
          data: {
            recipientEmail: 'test@example.com',
            templateType: 'validation',
            testMode: true
          }
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute email validation test');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setTestResults(prev => ({ ...prev, emailValidation: data }));
      toast({
        title: "Email Validation Test Complete",
        description: data.isValid ? "Email system validation passed" : "Email validation failed",
        variant: data.isValid ? "default" : "destructive",
      });
    },
    onError: (error) => {
      setTestResults(prev => ({ 
        ...prev, 
        emailValidation: { 
          isValid: false, 
          message: error.message || "Email test execution failed" 
        } 
      }));
      toast({
        title: "Email Test Failed",
        description: "Failed to execute email validation test",
        variant: "destructive",
      });
    }
  });

  // User Management Test
  const userManagementMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: 'userManagement',
          operation: 'validate',
          data: {
            operation: 'read',
            userId: 1
          }
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute user management test');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setTestResults(prev => ({ ...prev, userManagement: data }));
      toast({
        title: "User Management Test Complete",
        description: data.isValid ? "User management validation passed" : "User management validation failed",
        variant: data.isValid ? "default" : "destructive",
      });
    },
    onError: (error) => {
      setTestResults(prev => ({ 
        ...prev, 
        userManagement: { 
          isValid: false, 
          message: error.message || "User management test execution failed" 
        } 
      }));
      toast({
        title: "User Management Test Failed",
        description: "Failed to execute user management test",
        variant: "destructive",
      });
    }
  });

  const runAllTests = () => {
    setTestResults({});
    messagingReadMutation.mutate();
    setTimeout(() => emailTestMutation.mutate(), 500);
    setTimeout(() => userManagementMutation.mutate(), 1000);
  };

  const getStatusIcon = (result?: ValidationTestResult) => {
    if (!result) return Clock;
    return result.isValid ? CheckCircle : XCircle;
  };

  const getStatusColor = (result?: ValidationTestResult) => {
    if (!result) return "text-muted-foreground";
    return result.isValid ? "text-green-600" : "text-red-600";
  };

  const getTestStatus = (result?: ValidationTestResult) => {
    if (!result) return "Not Run";
    return result.isValid ? "Passed" : "Failed";
  };

  const renderThreadDetails = (threads?: ValidationTestResult['threads']) => {
    if (!threads) return null;

    return (
      <div className="space-y-2 mt-3">
        <div className="text-sm font-medium">Validation Threads:</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {threads.assembly && (
            <div className="flex justify-between">
              <span>Assembly:</span>
              <Badge variant={threads.assembly.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                {threads.assembly.status}
              </Badge>
            </div>
          )}
          {threads.schema && (
            <div className="flex justify-between">
              <span>Schema:</span>
              <Badge variant={threads.schema.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                {threads.schema.status}
              </Badge>
            </div>
          )}
          {threads.permission && (
            <div className="flex justify-between">
              <span>Permission:</span>
              <Badge variant={threads.permission.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                {threads.permission.status}
              </Badge>
            </div>
          )}
          {threads.business && (
            <div className="flex justify-between">
              <span>Business:</span>
              <Badge variant={threads.business.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                {threads.business.status}
              </Badge>
            </div>
          )}
          {threads.transaction && (
            <div className="flex justify-between">
              <span>Transaction:</span>
              <Badge variant={threads.transaction.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                {threads.transaction.status}
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  };

  const isAnyTestRunning = messagingReadMutation.isPending || emailTestMutation.isPending || userManagementMutation.isPending;

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
                <h1 className="text-3xl font-bold tracking-tight">ValidationEngine30 Testing</h1>
                <p className="text-muted-foreground">
                  Test and validate the ValidationEngine30 system components
                </p>
              </div>
              <Badge variant="outline" className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Development Tool
              </Badge>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This page is for testing ValidationEngine30 integration. Administrator access required.
              </AlertDescription>
            </Alert>

            {/* Test Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Test Controls
                </CardTitle>
                <CardDescription>
                  Execute validation tests for different system components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button
                    onClick={() => messagingReadMutation.mutate()}
                    disabled={messagingReadMutation.isPending}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {messagingReadMutation.isPending ? "Testing..." : "Test Messaging"}
                  </Button>

                  <Button
                    onClick={() => emailTestMutation.mutate()}
                    disabled={emailTestMutation.isPending}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Database className="h-4 w-4" />
                    {emailTestMutation.isPending ? "Testing..." : "Test Email"}
                  </Button>

                  <Button
                    onClick={() => userManagementMutation.mutate()}
                    disabled={userManagementMutation.isPending}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    {userManagementMutation.isPending ? "Testing..." : "Test User Management"}
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  <Button
                    onClick={runAllTests}
                    disabled={isAnyTestRunning}
                    className="flex items-center gap-2"
                  >
                    <TestTube className="h-4 w-4" />
                    {isAnyTestRunning ? "Running Tests..." : "Run All Tests"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {/* Messaging Test Result */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Messaging System Test
                    </span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const StatusIcon = getStatusIcon(testResults.messagingRead);
                        return <StatusIcon className={`h-5 w-5 ${getStatusColor(testResults.messagingRead)}`} />;
                      })()}
                      <Badge variant={testResults.messagingRead?.isValid ? 'default' : 'destructive'}>
                        {getTestStatus(testResults.messagingRead)}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.messagingRead ? (
                    <div className="space-y-3">
                      <div className="text-sm">
                        <strong>Message:</strong> {testResults.messagingRead.message}
                      </div>
                      {testResults.messagingRead.executionTime && (
                        <div className="text-sm">
                          <strong>Execution Time:</strong> {testResults.messagingRead.executionTime}ms
                        </div>
                      )}
                      {renderThreadDetails(testResults.messagingRead.threads)}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      No test results yet. Click "Test Messaging" to run the validation.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Email Test Result */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Email System Test
                    </span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const StatusIcon = getStatusIcon(testResults.emailValidation);
                        return <StatusIcon className={`h-5 w-5 ${getStatusColor(testResults.emailValidation)}`} />;
                      })()}
                      <Badge variant={testResults.emailValidation?.isValid ? 'default' : 'destructive'}>
                        {getTestStatus(testResults.emailValidation)}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.emailValidation ? (
                    <div className="space-y-3">
                      <div className="text-sm">
                        <strong>Message:</strong> {testResults.emailValidation.message}
                      </div>
                      {testResults.emailValidation.executionTime && (
                        <div className="text-sm">
                          <strong>Execution Time:</strong> {testResults.emailValidation.executionTime}ms
                        </div>
                      )}
                      {renderThreadDetails(testResults.emailValidation.threads)}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      No test results yet. Click "Test Email" to run the validation.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* User Management Test Result */}
              <Card className="md:col-span-1 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      User Management Test
                    </span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const StatusIcon = getStatusIcon(testResults.userManagement);
                        return <StatusIcon className={`h-5 w-5 ${getStatusColor(testResults.userManagement)}`} />;
                      })()}
                      <Badge variant={testResults.userManagement?.isValid ? 'default' : 'destructive'}>
                        {getTestStatus(testResults.userManagement)}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.userManagement ? (
                    <div className="space-y-3">
                      <div className="text-sm">
                        <strong>Message:</strong> {testResults.userManagement.message}
                      </div>
                      {testResults.userManagement.executionTime && (
                        <div className="text-sm">
                          <strong>Execution Time:</strong> {testResults.userManagement.executionTime}ms
                        </div>
                      )}
                      {renderThreadDetails(testResults.userManagement.threads)}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      No test results yet. Click "Test User Management" to run the validation.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* System Status Summary */}
            {Object.keys(testResults).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>System Status Summary</CardTitle>
                  <CardDescription>
                    Overall validation status across all tested components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Object.values(testResults).filter(r => r.isValid).length}
                      </div>
                      <div className="text-sm text-green-600">Tests Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Object.values(testResults).filter(r => !r.isValid).length}
                      </div>
                      <div className="text-sm text-red-600">Tests Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Object.keys(testResults).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Tests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Object.values(testResults).reduce((avg, r) => 
                          avg + (r.executionTime || 0), 0) / Object.values(testResults).length}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Response</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}