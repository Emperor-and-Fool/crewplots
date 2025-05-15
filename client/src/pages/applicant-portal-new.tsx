import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// Import UI components
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Define types for API responses
type ApplicantProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  positionApplied: string;
  status: "new" | "contacted" | "interviewed" | "hired" | "rejected";
  resumeUrl: string | null;
  notes: string | null;
  extraMessage: string | null;
  userId: number | null;
  locationId: number | null;
  createdAt: string;
};

function ApplicantPortalNew() {
  const { user, isLoading: authLoading } = useAuth();
  const [requestTimeoutId, setRequestTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isSessionHanging, setIsSessionHanging] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Redirect if not authenticated or not an applicant
  const isAuthenticated = !!user;
  const isApplicant = user?.role === 'applicant';

  // Function to clear session and redirect to login
  const clearSessionAndRedirect = async () => {
    try {
      setIsSessionHanging(true);
      toast({
        title: "Session Issue Detected",
        description: "Clearing session data and redirecting to login...",
        variant: "destructive"
      });
      
      // Attempt to clear the session via API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // As a fallback, try to clear with a GET request too
      await fetch('/api/auth/logout', {
        credentials: 'include',
      });
      
      // Clear any local session data
      localStorage.removeItem('auth_timestamp');
      sessionStorage.clear();
      
      // Redirect to login
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      console.error("Error clearing session:", error);
      // Force redirect to login even if clearing failed
      window.location.href = '/login';
    }
  };

  // Effect to check for hung sessions
  React.useEffect(() => {
    if (authLoading) {
      // Start a timeout to detect hung sessions
      const timeoutId = setTimeout(() => {
        // If still loading after 8 seconds, assume session is hung
        if (authLoading) {
          clearSessionAndRedirect();
        }
      }, 8000);
      
      setRequestTimeoutId(timeoutId);
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    } else if (requestTimeoutId) {
      clearTimeout(requestTimeoutId);
      setRequestTimeoutId(null);
    }
  }, [authLoading]);

  // Redirect if not authenticated or not an applicant
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

  // Fetch applicant profile data
  const { 
    data: profile, 
    isLoading: profileLoading, 
    error: profileError 
  } = useQuery<ApplicantProfile>({
    queryKey: ['/api/applicant-portal/my-profile'],
    enabled: isAuthenticated && isApplicant,
  });

  if (authLoading || profileLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <p>Loading your profile information...</p>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <p className="text-red-500">Error loading your profile. Please try again later.</p>
      </div>
    );
  }

  // Get the applicant status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="secondary">New</Badge>;
      case 'contacted':
        return <Badge variant="outline">Contacted</Badge>;
      case 'interviewed':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Interviewed</Badge>;
      case 'hired':
        return <Badge className="bg-green-500 hover:bg-green-600">Hired</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Applicant Portal</h1>
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/api/logout'}
          className="flex items-center gap-2"
        >
          Logout
        </Button>
      </div>
      
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Your Application</CardTitle>
          <CardDescription>
            View your application details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-lg">{profile?.name || 'Loading...'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-lg">{profile?.email || 'Loading...'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-lg">{profile?.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Position Applied</p>
              <p className="text-lg">{profile?.positionApplied || 'Loading...'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Status</p>
              <div className="mt-1">
                {profile?.status ? getStatusBadge(profile.status) : 'Loading...'}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Application Date</p>
              <p className="text-lg">
                {profile?.createdAt ? 
                  new Date(profile.createdAt).toLocaleDateString() : 
                  'Loading...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ApplicantPortalNew;