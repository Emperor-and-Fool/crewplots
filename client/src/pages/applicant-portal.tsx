import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ApplicantPortal() {
  const { user, isLoading: authLoading } = useAuth();
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

  // Fetch applicant portal data with improved error handling
  const { 
    data: profile, 
    isLoading: profileLoading,
    error: profileError,
    isError: isProfileError 
  } = useQuery({
    queryKey: ['/api/applicant-portal/my-profile'],
    enabled: isAuthenticated && isApplicant,
    staleTime: 60000, // 1 minute
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    gcTime: 300000 // 5 minutes
  });

  // Fetch applicant documents
  const { 
    data: documents, 
    isLoading: docsLoading,
    error: docsError,
    isError: isDocsError 
  } = useQuery({
    queryKey: ['/api/applicant-portal/documents'],
    enabled: isAuthenticated && isApplicant,
    staleTime: 60000, // 1 minute
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    gcTime: 300000 // 5 minutes
  });
  
  // Fetch all applicants for comparison (for debugging only)
  const { 
    data: applicants, 
    isLoading: applicantsLoading,
    error: applicantsError,
    isError: isApplicantsError
  } = useQuery({
    queryKey: ['/api/applicants'],
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    gcTime: 300000 // 5 minutes
  });

  // Set a timeout to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);
  
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (authLoading || applicantsLoading) {
        setLoadingTimeout(true);
      }
    }, 8000); // 8 seconds timeout
    
    return () => clearTimeout(timeoutId);
  }, [authLoading, applicantsLoading]);

  if (loadingTimeout) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex items-center">
            <div className="text-yellow-700">
              <p className="font-bold">Loading is taking longer than expected</p>
              <p>This could be due to network issues or server delays. You can:</p>
              <ul className="list-disc ml-5 mt-2">
                <li>Wait a bit longer</li>
                <li>Try refreshing the page</li>
                <li>Check your internet connection</li>
              </ul>
              <div className="mt-4">
                <Button onClick={() => window.location.reload()}>Refresh Page</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isApplicantsError) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex items-center">
            <div className="text-red-700">
              <p className="font-bold">Error loading data</p>
              <p>There was a problem fetching your information: {applicantsError?.message || 'Unknown error'}</p>
              <div className="mt-4">
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || applicantsLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <p>Loading application data...</p>
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
        <h1 className="text-3xl font-bold">Applicant Portal - Test Page</h1>
        <div>
          <p className="text-sm mb-2">Logged in as: <strong>{user?.username}</strong> (ID: {user?.id})</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/api/auth/dev-logout'}
          >
            Logout
          </Button>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Your account details from the database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Username</p>
                <p className="text-lg">{user?.username}</p>
              </div>
              <div>
                <p className="text-sm font-medium">User ID</p>
                <p className="text-lg">{user?.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-lg">{user?.firstName} {user?.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-lg">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Role</p>
                <p className="text-lg">{user?.role}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-lg">{user?.phoneNumber || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Unique Code</p>
                <p className="text-lg">{user?.uniqueCode || 'Not available'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Created At</p>
                <p className="text-lg">{user?.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Test: Applicants Table</CardTitle>
          <CardDescription>Direct view of the applicants table from the database</CardDescription>
        </CardHeader>
        <CardContent>
          {applicants && applicants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicants.map((applicant: any) => (
                  <TableRow key={applicant.id}>
                    <TableCell>{applicant.id}</TableCell>
                    <TableCell>{applicant.name}</TableCell>
                    <TableCell>{applicant.email}</TableCell>
                    <TableCell>{applicant.phone}</TableCell>
                    <TableCell>{applicant.positionApplied}</TableCell>
                    <TableCell>{getStatusBadge(applicant.status)}</TableCell>
                    <TableCell>{applicant.userId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500">No applicant records found in the database.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ApplicantPortal;