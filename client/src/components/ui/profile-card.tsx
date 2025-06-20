import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PortalProfileSkeleton } from './portal-profile-skeleton';

interface ApplicantProfile {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
  status?: string;
  resumeUrl: string | null;
  notes?: any;
  extraMessage?: string | null;
  createdAt: string;
}

interface ProfileCardProps {
  userId: number;
  className?: string;
}

export function ProfileCard({ userId, className = "" }: ProfileCardProps) {
  const { user } = useAuth();
  
  const { 
    data: profile, 
    isLoading, 
    error 
  } = useQuery<ApplicantProfile>({
    queryKey: ['/api/applicant-portal/my-profile'],
    queryFn: async () => {
      console.log('ProfileCard: Fetching profile data...');
      const response = await fetch('/api/applicant-portal/my-profile', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('ProfileCard: Profile data received:', data);
      return data;
    },
    enabled: true, // Always enabled - let the server handle auth validation
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0,
    retry: 1, // Reduce retries to prevent hanging
    retryDelay: 1000,
  });

  // Get the applicant status badge color
  const getStatusBadge = (status: string | undefined) => {
    if (!status) return 'bg-gray-200 text-gray-800';
    
    switch (status) {
      case 'new':
        return 'bg-slate-200 text-slate-800';
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'interviewed':
        return 'bg-blue-500 text-white';
      case 'short-listed':
        return 'bg-green-500 text-white';
      case 'hired':
        return 'bg-green-500 text-white';
      case 'rejected':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };


  console.log('ProfileCard render state:', { 
    isLoading, 
    hasProfile: !!profile, 
    error: error?.message,
    profileData: profile ? { name: profile.name, email: profile.email } : null
  });

  if (isLoading) {
    console.log('ProfileCard: Showing skeleton loader');
    return <PortalProfileSkeleton />;
  }

  if (error) {
    console.log('ProfileCard: Showing error state:', error);
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-red-600">Profile Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load profile data</p>
          <p className="text-sm text-gray-500 mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    console.log('ProfileCard: No profile data available');
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>No Profile Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No profile information available.</p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No profile data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{profile.name}</CardTitle>
            <CardDescription>{profile.email}</CardDescription>
          </div>
          {profile.status && (
            <Badge className={getStatusBadge(profile.status)}>
              {profile.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.phoneNumber && (
          <div>
            <p className="text-sm font-medium text-gray-600">Phone</p>
            <p>{profile.phoneNumber}</p>
          </div>
        )}
        
        {profile.resumeUrl && (
          <div>
            <p className="text-sm font-medium text-gray-600">Resume</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(profile.resumeUrl!, '_blank')}
            >
              View Resume
            </Button>
          </div>
        )}
        
        {profile.extraMessage && (
          <div>
            <p className="text-sm font-medium text-gray-600">Additional Message</p>
            <p className="text-sm">{profile.extraMessage}</p>
          </div>
        )}
        
        {profile.notes?.exists && (
          <div>
            <p className="text-sm font-medium text-gray-600">Motivation</p>
            <p className="text-sm">
              {profile.notes.wordCount} words • Last updated: {new Date(profile.notes.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        )}
        
        <div>
          <p className="text-sm font-medium text-gray-600">Application Date</p>
          <p className="text-sm">{new Date(profile.createdAt).toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}