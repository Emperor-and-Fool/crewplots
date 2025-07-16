import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Footer from '@/components/ui/footer';

interface AuthPageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
}

export const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({ 
  title, 
  description, 
  children,
  footerContent
}) => {
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 flex-col relative">
      <div className="w-full max-w-md px-4 flex-grow flex items-center justify-center">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-md">
            <div className="flex justify-between items-center mb-2">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/home")}
                className="text-white hover:bg-white/20 text-sm p-2"
              >
                ← Back to Home
              </Button>
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              {title}
            </CardTitle>
            <CardDescription className="text-center text-white opacity-90">
              {description || "Sign in to your account to continue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
          {footerContent && (
            <CardFooter className="flex flex-col space-y-4">
              {footerContent}
            </CardFooter>
          )}
        </Card>
      </div>
      <Footer />
    </div>
  );
};