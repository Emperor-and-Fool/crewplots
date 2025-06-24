import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';

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
import { ApplicationNotes } from '@/modules/users/components/applicants/ApplicationNotes';
import { ProfileCard } from '@/components/ui/profile-card';
import { ArrowLeft } from 'lucide-react';

function ApplicantDetail() {
  const [, params] = useRoute("/applicant/:id");
  const [, navigate] = useLocation();
  const applicantId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  // Fetch applicant data using profile-data endpoint
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['/api/profile-data'],
    queryFn: async () => {
      const response = await fetch('/api/profile-data', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }
      return response.json();
    },
    enabled: !!applicantId,
  });

  const applicant = profileData?.find((user: User) => user.id === applicantId);
  
  console.log('Applicant lookup debug:', { 
    applicantId, 
    profileDataLength: profileData?.length, 
    foundApplicant: !!applicant,
    allUserIds: profileData?.map(u => ({ id: u.id, role: u.role }))
  });

  // Get the status badge color
  const getStatusBadge = (status: string) => {
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
        return 'bg-purple-500 text-white';
      case 'rejected':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const queryClient = useQueryClient();

  const goBack = () => {
    navigate('/dashboard');
  };

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      console.log(`Updating applicant ${applicantId} status to: ${newStatus}`);
      
      const response = await fetch(`/api/applicants/${applicantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      console.log(`Response status: ${response.status}, ok: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Update failed: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Failed to update status: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Update successful, result:', result);
      return result;
    },
    onSuccess: (data, newStatus) => {
      console.log('Mutation success handler called with:', { data, newStatus });
      
      // Update the local cache
      queryClient.setQueryData(['/api/profile-data'], (old: any[]) => {
        if (!old) return old;
        return old.map(user => 
          user.id === applicantId 
            ? { ...user, status: newStatus }
            : user
        );
      });

      toast({
        title: 'Status updated',
        description: `Applicant status changed to ${newStatus}`,
      });
    },
    onError: (error: any) => {
      console.error('Mutation error handler called with:', error);
      toast({
        title: 'Failed to update status',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive',
      });
    },
  });

  const updateApplicantStatus = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  // Promotion mutation - changes role from applicant to crew_member
  const promotionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${applicantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          role: 'crew_member',
          status: 'hired'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to promote user: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      toast({
        title: "Success",
        description: `${applicant?.name} has been promoted to day production crew member with full dashboard access`,
      });
      
      // Navigate back to see updated user list
      navigate('/dashboard');
    },
    onError: (error) => {
      console.error('Error promoting applicant:', error);
      toast({
        title: "Error",
        description: "Failed to promote applicant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const promoteToCrewMember = () => {
    promotionMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Details</h1>
        <p>Loading...</p>
        <div className="mt-4 h-4 w-1/3 bg-gray-200 rounded overflow-hidden">
          <div className="h-full bg-primary animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Applicant not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Applicant Details</h1>
            <p className="text-gray-600">Read-only view</p>
          </div>
        </div>
        <Badge className={getStatusBadge(applicant.status || 'new')}>
          {applicant.status === 'short-listed' ? 'Short-listed' : (applicant.status || 'new')}
        </Badge>
      </div>

      {/* Profile Section - Read-only */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Applicant details and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700">Name</h3>
              <p className="text-gray-900">{applicant.name}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Username</h3>
              <p className="text-gray-900">{applicant.username}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Email</h3>
              <a 
                href={`mailto:${applicant.email}`}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {applicant.email}
              </a>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Phone</h3>
              {applicant.phone ? (
                <a 
                  href={`tel:${applicant.phone}`}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {applicant.phone}
                </a>
              ) : (
                <p className="text-gray-500">Not provided</p>
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Date of Birth</h3>
              <p className="text-gray-900">{applicant.dateOfBirth || 'Not provided'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Address</h3>
              <p className="text-gray-900">{applicant.address || 'Not provided'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messaging system - Read-only mode */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle>Their Documents & Motivation</CardTitle>
          <CardDescription>Read-only view of applicant's notes and documents</CardDescription>
        </CardHeader>
        <CardContent>
          <MessagingSystem
            userId={applicant.id}
            mode="note"
            title="Why they want to be part of our crew"
            placeholder="No notes provided yet..."
            showPriority={false}
            showPrivateToggle={false}
            compactMode={true}
            workflow="application"
            readOnlyMode={true}
          />
        </CardContent>
      </Card>

      {/* Status Update Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Update Application Status</CardTitle>
          <CardDescription>Change the status of this applicant's application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => updateApplicantStatus('short-listed')}
              variant={applicant.status === 'short-listed' ? 'default' : 'outline'}
              className={applicant.status === 'short-listed' ? 'bg-green-600 hover:bg-green-700' : 'border-green-600 text-green-600 hover:bg-green-50'}
              disabled={updateStatusMutation.isPending}
            >
              Short-list
            </Button>
            <Button 
              onClick={() => updateApplicantStatus('contacted')}
              variant={applicant.status === 'contacted' ? 'default' : 'outline'}
              className={applicant.status === 'contacted' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}
              disabled={updateStatusMutation.isPending}
            >
              Re-evaluate
            </Button>
            <Button 
              onClick={() => updateApplicantStatus('rejected')}
              variant={applicant.status === 'rejected' ? 'default' : 'outline'}
              className={applicant.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'border-red-600 text-red-600 hover:bg-red-50'}
              disabled={updateStatusMutation.isPending}
            >
              Reject
            </Button>
            <Button 
              onClick={() => promoteToCrewMember()}
              variant={applicant.status === 'hired' ? 'default' : 'outline'}
              className={applicant.status === 'hired' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-600 text-purple-600 hover:bg-purple-50'}
              disabled={updateStatusMutation.isPending}
            >
              Promote to Crew
            </Button>
          </div>
          {updateStatusMutation.isPending && (
            <p className="text-sm text-gray-500 mt-2">Updating status...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ApplicantDetail;