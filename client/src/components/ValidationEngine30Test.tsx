//VALIDATION ENGINE30TEST IS DEVELOPMENT TESTING INFRASTRUCTURE
//PURPOSE:
//Development tool for testing ValidationEngine30 backend validation service
//Not production feature - used during development and debugging
//Located in Dashboard for admin accessibility during development

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Direct ValidationEngine30 Test Component
 * Bypasses authentication to test VE30 user data retrieval
 */
export function ValidationEngine30Test() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuthProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'read',
          entityType: 'authProfile',
          data: { userId: 5 }, // Test with finn.visser user
          context: {
            userId: 5,
            userRole: 'applicant',
            permissions: ['user.read']
          }
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>ValidationEngine30 Direct Test</CardTitle>
        <CardDescription>
          Test VE30 user data retrieval without authentication dependencies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testAuthProfile} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test AuthProfile Read (User ID: 5)'}
        </Button>

        {result && (
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">ValidationEngine30 Result:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}