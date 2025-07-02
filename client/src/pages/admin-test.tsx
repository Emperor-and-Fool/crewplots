import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ValidationResponse {
  isValid: boolean;
  errors: string[];
  permissions: string[];
  user: {
    id: number;
    username: string;
    role: string;
    permissions: string[];
    workflowPermissions: any;
  };
  validationResult?: any;
  executionResult?: any;
}

export default function AdminTestPage() {
  const [lastResponse, setLastResponse] = useState<ValidationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const testValidationEngine = async (testType: string) => {
    setIsLoading(true);
    try {
      const testData = {
        operation: 'create',
        entityType: 'scheduleBlock',
        data: {
          name: `Test Schedule Block ${Date.now()}`,
          description: 'ValidationEngine test from admin-test page',
          locationId: 1,
          isActive: true
        }
      };

      console.log('🚀 Testing ValidationEngine with:', testData);
      
      const response = await apiRequest('POST', '/api/validation/execute', testData);
      console.log('✅ ValidationEngine Response:', response);
      
      // Parse ValidationEngine response structure
      const parsedResponse = {
        isValid: response.overall?.isValid || false,
        errors: response.overall?.errors || [],
        warnings: response.overall?.warnings || [],
        user: {
          id: response.context?.userId,
          username: response.context?.username,
          role: response.context?.role,
          permissions: response.context?.permissions || []
        },
        permissions: response.threads?.permission?.permissions || [],
        metadata: response.overall?.metadata || {},
        rawResponse: response
      };
      
      setLastResponse(parsedResponse);
      
      toast({
        title: "ValidationEngine Test Complete",
        description: `Test ${testType} executed successfully`,
        duration: 3000,
      });
      
    } catch (error: any) {
      console.error('❌ ValidationEngine Error:', error);
      toast({
        title: "ValidationEngine Test Failed",
        description: error.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ValidationEngine Admin Test</h1>
          <p className="text-muted-foreground mt-2">
            Test page to demonstrate ValidationEngine data reception and processing
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>ValidationEngine Test Controls</CardTitle>
            <CardDescription>
              Execute ValidationEngine operations to see data flow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => testValidationEngine('schedule-creation')}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Testing ValidationEngine...' : 'Test Schedule Block Creation'}
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <strong>Test Data:</strong>
              <pre className="mt-2 p-2 bg-muted rounded text-xs">
{`{
  operation: 'create',
  entityType: 'scheduleBlock',
  data: {
    name: 'Test Schedule Block [timestamp]',
    description: 'ValidationEngine test',
    locationId: 1,
    isActive: true
  }
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Response Data */}
        <Card>
          <CardHeader>
            <CardTitle>ValidationEngine Response Data</CardTitle>
            <CardDescription>
              Live data received from ValidationEngine
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastResponse ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={lastResponse.isValid ? "default" : "destructive"}>
                    {lastResponse.isValid ? "Valid" : "Invalid"}
                  </Badge>
                  {lastResponse.errors && lastResponse.errors.length > 0 && (
                    <Badge variant="secondary">{lastResponse.errors.length} errors</Badge>
                  )}
                </div>

                {/* User Data */}
                <div>
                  <h4 className="font-semibold mb-2">User Data Received:</h4>
                  <div className="bg-muted p-3 rounded text-sm space-y-1">
                    <div><strong>ID:</strong> {lastResponse.user?.id}</div>
                    <div><strong>Username:</strong> {lastResponse.user?.username}</div>
                    <div><strong>Role:</strong> {lastResponse.user?.role}</div>
                    <div><strong>Permissions:</strong> {lastResponse.user?.permissions?.length || 0} permissions</div>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <h4 className="font-semibold mb-2">Mapped Permissions:</h4>
                  <div className="flex flex-wrap gap-1">
                    {(lastResponse.permissions || []).map((perm, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Errors */}
                {lastResponse.errors && lastResponse.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Validation Errors:</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {lastResponse.errors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Raw Response */}
                <details className="mt-4">
                  <summary className="cursor-pointer font-semibold">Raw Response Data</summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(lastResponse, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No ValidationEngine response yet.</p>
                <p className="text-sm mt-1">Run a test to see data reception.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Verification</CardTitle>
          <CardDescription>
            Endpoint and authentication details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm">
            <div>
              <strong>Endpoint:</strong> <code>POST /api/validation/execute</code>
            </div>
            <div>
              <strong>Authentication:</strong> Uses <code>authenticateUser</code> middleware
            </div>
            <div>
              <strong>Expected req.user data:</strong> Full user object with id, username, role, permissions, workflowPermissions
            </div>
            <div>
              <strong>Permission mapping:</strong> Converts workflow permissions to validation permissions
            </div>
            <div>
              <strong>Validation flow:</strong> Schema validation → Permission check → Business rules → Database transaction
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}