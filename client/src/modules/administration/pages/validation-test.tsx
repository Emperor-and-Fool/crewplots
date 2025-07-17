import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ValidationTestPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const runValidationTest = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/validation/v3/test', {
        method: 'GET',
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Validation test failed');
      }
      
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const runWeekScheduleTest = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      const testData = {
        operation: 'create',
        entityType: 'weekSchedule',
        data: {
          name: 'Test Week Schedule',
          description: 'Testing week schedule validation',
          scheduleBlockId: 1,
          weekNumber: 1,
          year: 2025,
          isActive: true,
          createdBy: 1
        }
      };
      
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(testData),
      });
      
      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Week schedule test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const runShiftTest = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      const testData = {
        operation: 'create',
        entityType: 'shift',
        data: {
          title: 'Test Shift',
          position: 'Test Staff',
          weekScheduleId: 1,
          daysOfWeek: ['monday', 'tuesday'],
          startTime: '09:00',
          endTime: '17:00',
          maxSlots: 2,
          subscriptionDeadline: '2025-07-05T12:00:00Z',
          competencyRequirements: [
            { competencyId: 1, priorityLevel: 'required' }
          ],
          createdBy: 1
        }
      };
      
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(testData),
      });
      
      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shift test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const runExecuteTest = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      const testData = {
        operation: 'create',
        entityType: 'scheduleBlock',
        data: {
          name: 'Browser Test Schedule Block',
          description: 'Testing unified validation engine from browser',
          locationId: 1,
          isActive: true,
          createdBy: 1 // Add required field - will be set properly by backend context
        }
      };
      
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(testData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Validation execution failed');
      }
      
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Validation Engine Test</h1>
        <p className="text-gray-600">Test the unified validation engine with extracted packages</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Simple Test</CardTitle>
            <CardDescription>Test basic validation engine functionality</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runValidationTest} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Testing...' : 'Run Simple Test'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule Block Test</CardTitle>
            <CardDescription>Test schedule block validation package</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runExecuteTest} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Executing...' : 'Test Schedule Block'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Week Schedule Test</CardTitle>
            <CardDescription>Test week schedule validation package</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runWeekScheduleTest} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Executing...' : 'Test Week Schedule'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Test</CardTitle>
            <CardDescription>Test shift validation package</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runShiftTest} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Executing...' : 'Test Shift'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Test Results
              <Badge variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? 'Success' : 'Failed'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Message</h4>
                <p className="text-sm text-gray-600">{testResult.message}</p>
              </div>
              
              {testResult.result && (
                <div>
                  <h4 className="font-semibold">Validation Result</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Valid:</span>
                      <Badge variant={testResult.result.isValid ? "default" : "destructive"}>
                        {testResult.result.isValid ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Validation Time:</span>
                      <span>{testResult.result.validationTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Package ID:</span>
                      <span className="font-mono text-xs">{testResult.result.packageId}</span>
                    </div>
                    {testResult.result.context && (
                      <div className="flex justify-between">
                        <span>User Role:</span>
                        <span>{testResult.result.context.role}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {testResult.result?.errors?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600">Errors</h4>
                  <ul className="list-disc list-inside text-sm text-red-600">
                    {testResult.result.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {testResult.result?.warnings?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-600">Warnings</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-600">
                    {testResult.result.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Raw Response</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
                        setCopied(true);
                        toast({
                          title: "Copied!",
                          description: "Raw response copied to clipboard",
                        });
                        setTimeout(() => setCopied(false), 2000);
                      } catch (err) {
                        toast({
                          title: "Copy failed",
                          description: "Could not copy to clipboard",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}