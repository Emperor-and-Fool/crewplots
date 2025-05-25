import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define interfaces for strong typing
interface ApplicantProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  resumeUrl: string | null;
  notes: string | null;
  extraMessage: string | null;
  userId: number;
  locationId: number | null;
  createdAt: string;
}

interface ApplicantDocument {
  id: number;
  applicantId: number;
  documentName: string;
  documentUrl: string;
  fileType: string;
  uploadedAt: string;
}

function ApplicantPortal() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, error: profileError, refetchProfile } = useProfile();
  const [, navigate] = useLocation();
  const { toast } = useToast();

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

  // Set up more sophisticated timeout and keep-alive handling
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);
  const [timeoutReason, setTimeoutReason] = React.useState<string>('');
  
  // Removed redundant refresh mechanism since ProfileProvider handles data persistence
  
  // Retry function simplified - only ProfileProvider refresh needed
  const handleRetry = () => {
    setLoadingTimeout(false);
    setTimeoutReason('');
    
    // ProfileProvider handles profile refetch
    refetchProfile();
    
    toast({
      title: "Retrying",
      description: "Attempting to load your profile data...",
      duration: 3000,
    });
  };

  // Auto-retry mechanism removed - ProfileProvider handles data persistence reliably
  
  // Set up timeout detection for loading states
  React.useEffect(() => {
    // Set different timeouts for different loading states
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (authLoading) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
        setTimeoutReason('Authentication is taking longer than expected. This could be due to session issues.');
      }, 10000); // 10 seconds for auth timeout - extended from 7s
    } else if (profileLoading) {
      timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
        setTimeoutReason('Loading your profile data is taking longer than expected. This may be due to database connectivity issues.');
      }, 10000); // 10 seconds for profile timeout - extended from 7s
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [authLoading, profileLoading]);

  // Simplified debug logging - only profile
  React.useEffect(() => {
    if (isProfileError) {
      console.error("Error loading profile:", profileError);
    }
    if (profile) {
      console.log("Profile data loaded:", profile);
    }
  }, [profile, isProfileError, profileError]);
  
  // Timeout reached - show user-friendly message with specific reason
  if (loadingTimeout) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex flex-col">
            <div className="text-yellow-700">
              <p className="font-bold text-lg">Loading is taking longer than expected</p>
              
              {timeoutReason ? (
                <p className="mt-2">{timeoutReason}</p>
              ) : (
                <p className="mt-2">This could be due to network issues or server delays.</p>
              )}
              
              <p className="mt-4 font-medium">You can try:</p>
              <ul className="list-disc ml-5 mt-2">
                <li>Wait a bit longer</li>
                <li>Try refreshing your data</li>
                <li>Check your internet connection</li>
                <li>Log out and log back in if the issue persists</li>
              </ul>
              
              <div className="mt-6 space-x-3">
                <Button 
                  onClick={handleRetry}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Retry Loading Data
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/api/auth/logout'}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            </div>
          ) : (
            <div className="py-4">
              <p className="text-gray-500">Loading application details...</p>
            </div>
          )}
        </CardContent>
      </Card>
      
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