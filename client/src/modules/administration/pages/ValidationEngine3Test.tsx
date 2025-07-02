import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TestTube, Database, Zap, CheckCircle, XCircle, Clock } from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  responseTime?: number;
  error?: string;
}

export function ValidationEngine3Test() {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [aggregateResult, setAggregateResult] = useState<TestResult | null>(null);
  const [validationResult, setValidationResult] = useState<TestResult | null>(null);
  const [orchestrationResult, setOrchestrationResult] = useState<TestResult | null>(null);
  const [customTask, setCustomTask] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const testBasicEndpoint = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/validation/v3/test', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        setTestResult({
          success: true,
          message: 'ValidationEngine 3.0 operational',
          data,
          responseTime
        });
        toast({ description: 'Test endpoint successful' });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Test failed',
          error: data.error,
          responseTime
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  };

  const testAggregationEndpoint = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    const sampleTask = {
      entityType: 'user',
      entityId: 1,
      requiredData: {
        postgresql: ['user', 'permissions'],
        mongodb: ['notes'],
        redis: ['cache-keys']
      },
      compilationRules: {
        enhance: true,
        permissions: true,
        metadata: true
      },
      cacheStrategy: {
        category: 'test-profile',
        ttl: 300
      }
    };
    
    try {
      const response = await fetch('/api/validation/v3/aggregate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleTask)
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        setAggregateResult({
          success: true,
          message: 'Data aggregation successful',
          data,
          responseTime
        });
        toast({ description: 'Aggregation test successful' });
      } else {
        setAggregateResult({
          success: false,
          message: data.message || 'Aggregation failed',
          error: data.error,
          responseTime
        });
      }
    } catch (error) {
      setAggregateResult({
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  };

  const testDirectValidation = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    const validationRequest = {
      operation: 'create',
      entityType: 'testEntity',
      data: {
        title: 'Test Schedule Block',
        description: 'Testing direct validation pattern'
      },
      entityId: null
    };
    
    try {
      const response = await fetch('/api/validation/v3/validate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationRequest)
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        setValidationResult({
          success: true,
          message: 'ValidationEngine30 direct validation complete',
          data,
          responseTime
        });
        toast({ description: 'Direct validation test successful' });
      } else {
        setValidationResult({
          success: false,
          message: data.message || 'Direct validation failed',
          error: data.error,
          responseTime
        });
      }
    } catch (error) {
      setValidationResult({
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  };

  const testOrchestration = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    const orchestrationRequest = {
      operation: 'orchestrate',
      entityType: 'testEntity',
      data: {
        title: 'Test Schedule Block',
        description: 'Testing aggregate-then-validate pattern'
      },
      validationOperation: 'create',
      entityId: null
    };
    
    try {
      const response = await fetch('/api/validation/v3/orchestrate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orchestrationRequest)
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        setOrchestrationResult({
          success: true,
          message: 'DataOrchestrator3 orchestration complete',
          data,
          responseTime
        });
        toast({ description: 'Orchestration test successful' });
      } else {
        setOrchestrationResult({
          success: false,
          message: data.message || 'Orchestration failed',
          error: data.error,
          responseTime
        });
      }
    } catch (error) {
      setOrchestrationResult({
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  };

  const testCustomTask = async () => {
    if (!customTask.trim()) {
      toast({ description: 'Please enter a custom task', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const startTime = Date.now();
    
    try {
      const task = JSON.parse(customTask);
      const response = await fetch('/api/validation/v3/aggregate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      
      const data = await response.json();
      const responseTime = Date.now() - startTime;
      
      toast({ 
        description: response.ok ? 'Custom task successful' : 'Custom task failed',
        variant: response.ok ? 'default' : 'destructive'
      });
      
      // Store result in aggregateResult for display
      setAggregateResult({
        success: response.ok,
        message: response.ok ? 'Custom task executed successfully' : data.message || 'Custom task failed',
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data.error,
        responseTime
      });
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setAggregateResult({
        success: false,
        message: 'Invalid JSON or network error',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      });
      toast({ description: 'Invalid JSON format', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const ResultCard = ({ title, result, icon: Icon }: { title: string; result: TestResult | null; icon: any }) => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
          {result && (
            <Badge variant={result.success ? 'default' : 'destructive'} className="ml-auto">
              {result.success ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              {result.success ? 'Success' : 'Failed'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>Response time: {result.responseTime}ms</span>
            </div>
            
            <div>
              <strong>Message:</strong> {result.message}
            </div>
            
            {result.error && (
              <div className="text-red-600">
                <strong>Error:</strong> {result.error}
              </div>
            )}
            
            {result.data && (
              <div>
                <strong>Response Data:</strong>
                <pre className="mt-2 p-3 bg-gray-50 rounded-md overflow-auto max-h-40 text-xs">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No test results yet</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TestTube className="h-8 w-8" />
          ValidationEngine 3.0 Test Suite
        </h1>
        <p className="text-gray-600">
          Test ValidationEngine 3.0 with DataAggregationEngine, ValidationEngine30 direct validation, and DataOrchestrator3 orchestration patterns
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Button 
          onClick={testBasicEndpoint} 
          disabled={loading}
          className="h-12"
        >
          <Database className="h-4 w-4 mr-2" />
          Test Basic Endpoint
        </Button>
        
        <Button 
          onClick={testAggregationEndpoint} 
          disabled={loading}
          variant="outline"
          className="h-12"
        >
          <Zap className="h-4 w-4 mr-2" />
          Test Data Aggregation
        </Button>
        
        <Button 
          onClick={testDirectValidation} 
          disabled={loading}
          variant="default"
          className="h-12 bg-blue-600 hover:bg-blue-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Direct Validation
        </Button>
        
        <Button 
          onClick={testOrchestration} 
          disabled={loading}
          variant="default"
          className="h-12 bg-purple-600 hover:bg-purple-700"
        >
          <Zap className="h-4 w-4 mr-2" />
          Orchestration
        </Button>
        
        <Button 
          onClick={testCustomTask} 
          disabled={loading}
          variant="secondary"
          className="h-12"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Run Custom Task
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <ResultCard 
          title="Basic Test Results"
          result={testResult}
          icon={Database}
        />
        
        <ResultCard 
          title="Aggregation Test Results"
          result={aggregateResult}
          icon={Zap}
        />
        
        <ResultCard 
          title="Direct Validation (Engine30)"
          result={validationResult}
          icon={CheckCircle}
        />
        
        <ResultCard 
          title="Orchestration (DataOrchestrator3)"
          result={orchestrationResult}
          icon={Zap}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom DataAggregationTask</CardTitle>
          <CardDescription>
            Enter a custom JSON task configuration to test specific aggregation scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={`{
  "entityType": "user",
  "entityId": 1,
  "requiredData": {
    "postgresql": ["user"],
    "mongodb": ["notes"],
    "redis": ["cache-keys"]
  },
  "compilationRules": {
    "enhance": true,
    "permissions": true,
    "metadata": true
  },
  "cacheStrategy": {
    "category": "custom-test",
    "ttl": 600
  }
}`}
            value={customTask}
            onChange={(e) => setCustomTask(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}