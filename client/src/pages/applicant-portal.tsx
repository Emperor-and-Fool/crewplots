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

// Define interfaces for strong typing
interface ApplicantProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  positionApplied: string;
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
  } = useQuery<ApplicantProfile>({
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
  } = useQuery<ApplicantDocument[]>({
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
  } = useQuery<ApplicantProfile[]>({
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
      if (authLoading || profileLoading || docsLoading || applicantsLoading) {
        setLoadingTimeout(true);
      }
    }, 8000); // 8 seconds timeout
    
    return () => clearTimeout(timeoutId);
  }, [authLoading, profileLoading, docsLoading, applicantsLoading]);

  // Log all errors and data for debugging
  React.useEffect(() => {
    if (isProfileError) {
      console.error("Error loading profile:", profileError);
    }
    if (isDocsError) {
      console.error("Error loading documents:", docsError);
    }
    if (isApplicantsError) {
      console.error("Error loading applicants:", applicantsError);
    }

    // Log data when it's available
    if (profile) {
      console.log("Profile data loaded:", profile);
    }
    if (documents) {
      console.log("Documents data loaded:", documents);
    }
    if (applicants) {
      console.log("All applicants loaded:", applicants);
    }
  }, [
    profile, documents, applicants,
    isProfileError, isDocsError, isApplicantsError,
    profileError, docsError, applicantsError
  ]);
  
  // Timeout reached - show user-friendly message
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

  // Handle specific API errors
  if (isProfileError || isDocsError || isApplicantsError) {
    const errorMessage = profileError?.message || docsError?.message || applicantsError?.message || 'Unknown error';
    
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

  // Show loading state
  if (authLoading || profileLoading || docsLoading || applicantsLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <p>Loading application data...</p>
        <div className="mt-4 h-4 w-1/3 bg-gray-200 rounded overflow-hidden">
          <div className="h-full bg-primary animate-pulse"></div>
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
                  <p className="text-sm font-medium text-gray-500">Position Applied</p>
                  <p className="text-lg">{profile.positionApplied}</p>
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
      
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle>Documents</CardTitle>
          <CardDescription>Documents you've submitted with your application</CardDescription>
        </CardHeader>
        <CardContent>
          {documents && Array.isArray(documents) ? (
            documents.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Date Uploaded</TableHead>
                      <TableHead>File Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <a 
                            href={doc.documentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {doc.documentName}
                          </a>
                        </TableCell>
                        <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                        <TableCell>{doc.fileType}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-4">
                <p className="text-gray-500">You haven't uploaded any documents yet.</p>
              </div>
            )
          ) : (
            <div className="py-4">
              <p className="text-gray-500">Loading documents...</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Debug Information - Only visible in development */}
      {process.env.NODE_ENV !== 'production' && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Application debugging data (only visible in development)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">User Account</h3>
                <pre className="bg-gray-100 p-3 rounded overflow-auto text-xs">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Applicants Table Data</h3>
                {Array.isArray(applicants) && applicants.length > 0 ? (
                  <Table className="border border-gray-200 rounded-md">
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
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
                          <TableCell>{applicant.positionApplied}</TableCell>
                          <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(applicant.status)}`}>
                            {applicant.status}
                          </span>
                        </TableCell>
                          <TableCell>{applicant.userId}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500">No applicant records found in the database.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ApplicantPortal;