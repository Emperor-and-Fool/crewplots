import React from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/contexts/profile-context';

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
import { User, Mail, Phone, Calendar, Clock, AlertCircle, CheckCircle, FileText, LogOut, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import MessagingSystem from '@/components/ui/messaging-system';

// Interface already defined in profile-context.tsx - no need to duplicate

function ApplicantPortal() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, error: profileError, refetchProfile } = useProfile();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated or not an applicant
  const isAuthenticated = !!user;
  const isApplicant = user?.role === 'applicant';

  React.useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isApplicant)) {
      toast({
        title: "Access Denied",
        description: "You must be logged in as an applicant to view this page.",
        variant: "destructive"
      });
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, isApplicant, navigate, toast]);

  // Now using persistent profile context - no more null states!
  
  const isProfileError = !profile && !profileLoading && profileError;

  // Documents system removed - was causing API cascade failures
  // All applicants debug query removed - not needed for profile view
  // Timeout detection removed - ProfileProvider handles loading efficiently
  // Removed redundant refresh mechanism since ProfileProvider handles data persistence
  // Retry function removed - ProfileProvider handles loading efficiently
  // All ghost timeout detection completely removed
  // Simplified debug logging - only profile

  React.useEffect(() => {
    if (isProfileError) {
      console.error("Error loading profile:", profileError);
    }
    if (profile) {
      console.log("Profile data loaded:", profile);
    }
  }, [profile, isProfileError, profileError]);

  // Ghost timeout warning completely removed - ProfileProvider handles loading efficiently

  // Handle profile API errors only
  if (isProfileError) {
    const errorMessage = profileError?.message || 'Unknown error';

    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex items-center">
            <div className="text-red-700">
              <p className="font-bold">Error loading data</p>
              <p>There was a problem fetching your information: {errorMessage}</p>
              <div className="mt-4">
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state for profile loading only
  if (profileLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <p>Loading application data...</p>
        <div className="mt-4 h-4 w-1/3 bg-gray-200 rounded overflow-hidden">
          <div className="h-full bg-primary animate-pulse"></div>
        </div>
        {/* Debug info */}
        <div className="mt-8 text-xs text-gray-500">
          <p>Auth Loading: {authLoading ? 'Yes' : 'No'}</p>
          <p>Profile Loading: {profileLoading ? 'Yes' : 'No'}</p>
        </div>
      </div>
    );
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

      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle>Your Application</CardTitle>
          <CardDescription>Details of your job application</CardDescription>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-lg">{profile.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-lg">{profile.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-lg">{profile.phone}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-lg">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(profile.status)}`}>
                      {profile.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Application Date</p>
                  <p className="text-lg">{new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-500 mb-2">Additional Message</p>
                {profile.extraMessage ? (
                  <p className="text-gray-700">{profile.extraMessage}</p>
                ) : (
                  <p className="text-gray-400 italic">No additional message provided</p>
                )}
              </div>

              {/* Messaging system for applicants */}
              {user && profile && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-500 mb-2">Send a Message</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4">
              <p className="text-gray-500">Loading application details...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Center - no longer in use
      {user && profile && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Communication Center
            </CardTitle>
            <CardDescription>
              Send messages and communicate about your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MessagingSystem
              userId={user.id}
              applicantId={profile.id}
              title="Application Messages"
              placeholder="Type your message about your application..."
              showPriority={true}
              showPrivateToggle={false}
              maxHeight="300px"
              compactMode={false}
              onMessageSent={(message) => {
                toast({
                  title: "Message sent successfully!",
                  description: "Your message has been recorded and will be reviewed.",
                });
              }}
            />
          </CardContent>
        </Card>
      )}
      */}

      {/* Documents section removed - was causing API cascade issues */}

      {/* Debug section simplified - only profile data */}
      {process.env.NODE_ENV !== 'production' && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Profile debugging data (only visible in development)</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <h3 className="text-lg font-medium mb-2">Profile Data</h3>
              <pre className="bg-gray-100 p-3 rounded overflow-auto text-xs">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ApplicantPortal;