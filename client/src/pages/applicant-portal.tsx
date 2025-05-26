import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/contexts/profile-context';
import { MessagingSystem } from '@/components/ui/messaging-system';

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ApplicantPortal() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading, error: profileError } = useProfile();
  
  const isProfileError = !profile && !profileLoading && profileError;
  


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
      
      {/* Simple Message System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Communication Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Send a message to the recruiting team
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message here..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                Send
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Documents section removed - was causing API cascade issues */}
      
      {/* Debug section - only visible in development */}
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