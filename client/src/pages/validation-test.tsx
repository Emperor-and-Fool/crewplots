import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function ValidationTestPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runValidationTest = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/validation/test/test', {
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
      
      const response = await fetch('/api/validation/execute', {
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
            <CardTitle>Execute Test</CardTitle>
            <CardDescription>Test full validation and execution pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runExecuteTest} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Executing...' : 'Run Execute Test'}
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
              
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Raw Response</summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}