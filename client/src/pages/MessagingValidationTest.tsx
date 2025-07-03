import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

export default function MessagingValidationTest() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testMessagingValidation = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('🧪 Testing messaging validation package integration...');
      
      const response = await apiRequest('POST', '/api/validation/v3/test-messaging', {});
      
      console.log('📥 Messaging validation test response:', response);
      
      // Transform ValidationEngine30 response to expected format
      const transformedResults = {
        success: response.overall?.isValid || false,
        message: response.overall?.isValid 
          ? 'ValidationEngine30 hybrid storage test successful!' 
          : `Validation failed: ${response.overall?.errors?.join(', ') || 'Unknown error'}`,
        user: response.user || null,
        testData: response.threads?.dataAssembly?.data || null,
        result: response // Include full ValidationEngine30 response for debugging
      };
      
      setResults(transformedResults);
    } catch (err) {
      console.error('🚨 Messaging validation test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Messaging Validation Package Test</CardTitle>
          <CardDescription>
            Plan 053: Testing ValidationEngine30 messaging package integration with hybrid storage capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testMessagingValidation}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Messaging Validation'}
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {results && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h3 className="text-green-800 font-medium mb-2">
                Test Results {results.success ? '✅' : '❌'}
              </h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Success:</strong> {results.success ? 'Yes' : 'No'}
                </div>
                {results.message && (
                  <div className="text-sm">
                    <strong>Message:</strong> {results.message}
                  </div>
                )}
                {results.user && (
                  <div className="text-sm">
                    <strong>User:</strong> {results.user.username} ({results.user.role})
                  </div>
                )}
                {results.testData && (
                  <div className="text-sm">
                    <strong>Test Data:</strong>
                    <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(results.testData, null, 2)}
                    </pre>
                  </div>
                )}
                {results.result && (
                  <div className="text-sm">
                    <strong>Validation Result:</strong>
                    <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(results.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-blue-800 font-medium">Plan 053 Implementation Status</h3>
            <ul className="text-blue-600 text-sm mt-2 space-y-1">
              <li>✅ Messaging validation package created with async interface</li>
              <li>✅ ValidationEngine30 enhanced with hybrid transaction handler</li>
              <li>✅ MongoDB integration for messaging operations</li>
              <li>🧪 Integration testing in progress</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}