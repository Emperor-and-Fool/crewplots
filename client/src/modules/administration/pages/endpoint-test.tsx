import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/modules/auth';

type AuthSyncStatus = 'synced' | 'mismatched' | 'unclear';

export default function EndpointTestPage() {
  const { user, isAuthenticated } = useAuth();
  const [endpoint, setEndpoint] = useState('');
  const [method, setMethod] = useState('GET');
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [authSyncStatus, setAuthSyncStatus] = useState<AuthSyncStatus>('unclear');
  const [backendAuthStatus, setBackendAuthStatus] = useState<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
  };

  // Check authentication sync status
  useEffect(() => {
    const checkAuthSync = async () => {
      if (!isAuthenticated || !user) {
        setAuthSyncStatus('unclear');
        setBackendAuthStatus(null);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const backendResponse = await response.json();
          setBackendAuthStatus(backendResponse);
          
          // Check if backend has proper authentication structure
          if (backendResponse.authenticated && backendResponse.user) {
            // Proper structure - compare actual user data
            if (backendResponse.user.id === user.id && 
                backendResponse.user.username === user.username && 
                backendResponse.user.role === user.role) {
              setAuthSyncStatus('synced');
            } else {
              setAuthSyncStatus('mismatched');
            }
          } else if (backendResponse.authenticated === true) {
            // Backend authenticated but response structure issue - sessions in sync but parsing fails
            setAuthSyncStatus('unclear');
          } else {
            // Backend not authenticated or unknown structure
            setAuthSyncStatus('mismatched');
          }
        } else {
          // Backend says not authenticated but frontend thinks we are
          setBackendAuthStatus({ error: response.status, message: 'Backend authentication failed' });
          setAuthSyncStatus('mismatched');
        }
      } catch (error) {
        // Network or other error - unclear state
        setBackendAuthStatus({ error: 'network', message: error instanceof Error ? error.message : 'Unknown error' });
        setAuthSyncStatus('unclear');
      }
    };

    checkAuthSync();
    // Re-check every 10 seconds to monitor sync status
    const interval = setInterval(checkAuthSync, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const getAuthSyncBadgeVariant = (): "default" | "destructive" | "secondary" => {
    switch (authSyncStatus) {
      case 'synced': return 'default'; // Will be styled green
      case 'mismatched': return 'destructive'; // Will be styled red
      case 'unclear': return 'secondary'; // Will be styled orange
      default: return 'secondary';
    }
  };

  const getAuthSyncText = (): string => {
    if (!isAuthenticated || !user) return 'Not authenticated';
    
    switch (authSyncStatus) {
      case 'synced': 
        return `✓ Authenticated as ${user.username} (${user.role})`;
      case 'mismatched': 
        return `⚠ Auth mismatch: ${user.username} (${user.role})`;
      case 'unclear': 
        return `? Auth unclear: ${user.username} (${user.role})`;
      default: 
        return `Authenticated as ${user.username} (${user.role})`;
    }
  };

  const testEndpoint = async () => {
    if (!endpoint.trim()) {
      addLog('❌ No endpoint specified');
      return;
    }

    setLoading(true);
    setResponse(null);
    
    addLog(`🚀 Testing ${method} ${endpoint}`);
    addLog(`👤 Authenticated as: ${user?.username} (${user?.role})`);

    try {
      const options: RequestInit = {
        method,
        credentials: 'include', // Important for session cookies
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (method !== 'GET' && requestBody.trim()) {
        try {
          JSON.parse(requestBody); // Validate JSON
          options.body = requestBody;
          addLog(`📤 Request body: ${requestBody}`);
        } catch (e) {
          addLog('❌ Invalid JSON in request body');
          setLoading(false);
          return;
        }
      }

      addLog('🔄 Sending request...');
      const res = await fetch(endpoint, options);
      
      addLog(`📊 Response status: ${res.status} ${res.statusText}`);
      addLog(`📋 Response headers: ${JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2)}`);

      let responseData;
      const contentType = res.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await res.json();
        addLog('✅ Response parsed as JSON');
      } else {
        responseData = await res.text();
        addLog('✅ Response parsed as text');
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data: responseData
      });

      addLog('✅ Request completed successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      addLog(`❌ Request failed: ${errorMessage}`);
      setResponse({
        error: errorMessage,
        stack: errorStack
      });
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setResponse(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You must be logged in to use the endpoint tester.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Endpoint Tester</h1>
          <Badge 
            variant={getAuthSyncBadgeVariant()}
            className={
              authSyncStatus === 'synced' 
                ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
                : authSyncStatus === 'unclear' 
                ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500'
                : undefined
            }
          >
            {getAuthSyncText()}
          </Badge>
        </div>

        {/* Authentication Sync Debug Info */}
        {authSyncStatus !== 'synced' && backendAuthStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Authentication Sync Debug</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Frontend:</strong> {user ? `${user.username} (${user.role})` : 'Not authenticated'}</div>
                <div><strong>Backend:</strong> {
                  backendAuthStatus.error ? 
                    `Error ${backendAuthStatus.error}: ${backendAuthStatus.message}` : 
                    backendAuthStatus.user ? 
                      `${backendAuthStatus.user.username} (${backendAuthStatus.user.role})` :
                      backendAuthStatus.authenticated ? 
                        'Authenticated but user data unavailable' :
                        'Not authenticated'
                }</div>
                <div><strong>Status:</strong> <span className={authSyncStatus === 'mismatched' ? 'text-red-600' : 'text-orange-600'}>{authSyncStatus}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <select 
                value={method} 
                onChange={(e) => setMethod(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
              
              <Input
                placeholder="Enter endpoint (e.g., /api/auth/me, /api/profile-data)"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="flex-1"
              />
              
              <Button onClick={testEndpoint} disabled={loading}>
                {loading ? 'Testing...' : 'Test'}
              </Button>
            </div>

            {method !== 'GET' && (
              <Textarea
                placeholder="Request body (JSON)"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="font-mono text-sm"
                rows={4}
              />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Request Logs</CardTitle>
              <Button variant="outline" size="sm" onClick={clearLogs}>
                Clear
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs yet...</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md h-96 overflow-y-auto">
                {response ? (
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                ) : (
                  <div className="text-gray-500">No response yet...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Test Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                '/api/auth/me',
                '/api/profile-data', 
                '/api/users',
                '/api/locations',
                '/me',
                '/api/scheduler/schedule-blocks',
                '/execute'
              ].map(ep => (
                <Button 
                  key={ep}
                  variant="outline" 
                  size="sm"
                  onClick={() => setEndpoint(ep)}
                >
                  {ep}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}