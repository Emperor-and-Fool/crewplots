import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function RegistrationSuccess() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(10);
  
  // Get query parameters
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');
  const username = params.get('username');
  
  // Countdown and redirect to login
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [setLocation]);

  return (
    <div className="container flex items-center justify-center min-h-screen">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Registration Complete!</CardTitle>
          <CardDescription>
            Your account has been created successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">Registration details:</p>
            {email && <p className="font-medium">Email: {email}</p>}
            {username && <p className="font-medium">Username: {username}</p>}
          </div>
          <p className="text-sm text-gray-500">
            Your application will be reviewed by a manager. You'll receive further instructions once your application is processed.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button asChild className="w-full">
            <Link href="/login">Go to Login</Link>
          </Button>
          <p className="text-xs text-center text-gray-500">
            Redirecting to login in {countdown} seconds...
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}