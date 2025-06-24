import React from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessagingSystem } from '@/components/ui/messaging-system';
import { ProfileCard } from '@/modules/users/components/profiles';

function ApplicantPortal() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Apply the recommended pattern: guard conditions without effects
  if (authLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <p>Loading...</p>
        <div className="mt-4 h-4 w-1/3 bg-gray-200 rounded overflow-hidden">
          <div className="h-full bg-primary animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Redirect logic without useEffect to prevent infinite loops
  if (!user || user.role !== 'applicant') {
    toast({
      title: "Access Denied", 
      description: "You must be logged in as an applicant to view this page.",
      variant: "destructive"
    });
    navigate('/login');
    return null;
  }

  // Get the applicant status badge color
  // Function to get the class name for status badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-slate-200 text-slate-800';
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'interviewed':
        return 'bg-blue-500 text-white';
      case 'hired':
        return 'bg-green-500 text-white';
      case 'rejected':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Applicant Portal</h1>
        <div>
          <p className="text-sm mb-2">Logged in as: <strong>{user?.username}</strong></p>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/api/auth/logout'}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Profile Section - Component Isolated */}
      <ProfileCard userId={user?.id || 0} className="mb-8" />

      {/* Messaging system - Always show when authenticated */}
      {user && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle>Your Documents & Motivation here</CardTitle>
          </CardHeader>
          <CardContent>
            <MessagingSystem
              userId={user.id}
              mode="note"
              title="Why you want to be part of our crew"
              placeholder="Type your note about your application..."
              showPriority={false}
              showPrivateToggle={false}
              compactMode={true}
              workflow="application"
              documentStorage={true}
              onMessageSent={(message) => {
                toast({
                  title: "Note saved successfully!",
                  description: "Your note has been recorded and will be reviewed.",
                });
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ApplicantPortal;