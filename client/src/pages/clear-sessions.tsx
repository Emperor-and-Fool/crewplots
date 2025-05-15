import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';

function ClearSessions() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isClearing, setIsClearing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearAllSessions = async () => {
    try {
      setIsClearing(true);
      setError(null);
      
      const response = await fetch('/api/auth/clear-all-sessions', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clear sessions');
      }
      
      const data = await response.json();
      setIsSuccess(true);
      
      toast({
        title: "Success",
        description: data.message || "All sessions cleared successfully",
      });
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      console.error('Error clearing sessions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to clear sessions'
      });
    } finally {
      setIsClearing(false);
    }
  };
  
  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Clear All Sessions</CardTitle>
          <CardDescription>
            This will clear all active sessions from the database and log everyone out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 p-4 rounded-md mb-4 text-red-800 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
          
          {isSuccess && (
            <div className="bg-green-50 p-4 rounded-md mb-4 text-green-800">
              <p className="font-medium">Success!</p>
              <p className="text-sm">All sessions have been cleared. Redirecting to login page...</p>
            </div>
          )}
          
          <p className="text-gray-600 mb-4">
            Use this tool when you're experiencing issues with authentication or need to clean up all sessions. 
            Everyone will need to log in again after this action.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={clearAllSessions}
            disabled={isClearing || isSuccess}
            className="bg-red-600 hover:bg-red-700"
          >
            {isClearing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Clearing Sessions...
              </>
            ) : (
              'Clear All Sessions'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default ClearSessions;