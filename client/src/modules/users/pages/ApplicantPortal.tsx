import React from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/modules/auth';
import { useLogout } from '../hooks/useLogout';

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
import { MessagingSystem } from '@/modules/messaging';
import { ProfileCard } from '@/modules/users/components/profiles';
import { LogOut } from 'lucide-react';

function ApplicantPortal() {
  const { user, isLoading: authLoading } = useAuth();
  const { logout } = useLogout();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    console.log('🔴 LOGOUT DEBUG: ApplicantPortal logout button clicked');
    console.log('🔴 LOGOUT DEBUG: Current user state:', user);
    
    try {
      console.log('🔴 LOGOUT DEBUG: Calling auth context logout()...');
      await logout();
      console.log('🔴 LOGOUT DEBUG: Auth context logout() completed successfully');
      
      console.log('🔴 LOGOUT DEBUG: Navigating to home page...');
      navigate('/');
      console.log('🔴 LOGOUT DEBUG: Navigation completed');
    } catch (error) {
      console.error('🔴 LOGOUT DEBUG: Logout failed with error:', error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive"
      });
    }
  };

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applicant Portal</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.firstName || user.username}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>
                Your application profile and current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileCard userId={user.id} />
            </CardContent>
          </Card>

          {/* Application Status */}
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>
                Track the progress of your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Status:</span>
                <Badge className={getStatusBadge(user.status || 'new')}>
                  {(user.status || 'new').charAt(0).toUpperCase() + (user.status || 'new').slice(1)}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {user.status === 'new' && "Your application has been received and is being reviewed."}
                  {user.status === 'contacted' && "We've reached out to you! Please check your email and respond promptly."}
                  {user.status === 'interviewed' && "Thank you for completing your interview. We'll be in touch soon with next steps."}
                  {user.status === 'hired' && "Congratulations! You've been hired. Check your messages for onboarding information."}
                  {user.status === 'rejected' && "Thank you for your interest. While we won't be moving forward at this time, we encourage you to apply for future opportunities."}
                  {user.status === 'short-listed' && "Great news! You've been short-listed. We'll be contacting you soon for the next steps."}
                  {!user.status && "Your application has been received and is being reviewed."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Messages and Communication */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Motivation</CardTitle>
              <CardDescription>
                Communicate with the hiring team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessagingSystem 
                userId={user.id}
                mode="note"
                workflow="application"
                title="Why I want to be part of your Crew:"
                placeholder="Add notes about your application, motivation, and why you want to join our team..."
                readOnlyMode={false}
                compactMode={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>


    </div>
  );
}

export default ApplicantPortal;