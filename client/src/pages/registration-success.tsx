import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import Footer from '@/components/ui/footer';

export default function RegistrationSuccess() {
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(10);
  
  // Get query parameters from URL
  const url = new URL(window.location.href);
  const email = url.searchParams.get('email');
  const username = url.searchParams.get('username');
  
  // Countdown and redirect to login
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100 py-10">
      <div className="container flex-grow flex items-center justify-center">
        <Card className="mx-auto max-w-md w-full border-blue-100 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Registration Complete!
            </CardTitle>
            <CardDescription className="text-gray-600">
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
            <Button 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
            <p className="text-xs text-center text-gray-500">
              Redirecting to login in {countdown} seconds...
            </p>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>
  );
}