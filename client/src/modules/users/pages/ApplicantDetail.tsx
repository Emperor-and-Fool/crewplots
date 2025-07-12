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
import { ApplicationNotes } from '@/modules/users/components/workflows';
import { ProfileCard } from '@/modules/users/components/profiles';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Location } from '@shared/schema';

function ApplicantDetail() {
  const [, params] = useRoute("/applicant/:id");
  const [, navigate] = useLocation();
  const applicantId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  // Fetch applicant data using ValidationEngine30
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['/api/validation/v3/execute', 'userList'],
    queryFn: async () => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          operation: 'read',
          entityType: 'userList',
          data: {
            operation: 'userList',
            filters: {}
          }
        })
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user list via ValidationEngine30');
      }
      const result = await response.json();
      return result.threads?.transaction?.data?.users || [];
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
      case 'hired':
        return 'bg-green-500 text-white';
      case 'rejected':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Fetch locations for assignment
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/validation/v3/execute', 'locationList'],
    queryFn: async () => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          operation: 'list',
          entityType: 'location',
          data: {}
        })
      });
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const result = await response.json();
      return result.data || [];
    },
  });

  // Fetch user locations (assignments)
  const { data: userLocations, refetch: refetchUserLocations } = useQuery({
    queryKey: ['/api/users/locations', applicantId],
    queryFn: async () => {
      const response = await fetch(`/api/users/locations?userId=${applicantId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user locations');
      }
      return response.json();
    },
    enabled: !!applicantId,
  });

  const queryClient = useQueryClient();

  // Location assignment mutation
  const locationMutation = useMutation({
    mutationFn: async ({ locationId, assign }: { locationId: number; assign: boolean }) => {
      const url = assign 
        ? '/api/users/locations'
        : `/api/users/locations/${locationId}`;
      
      const options: RequestInit = {
        method: assign ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      };

      if (assign) {
        options.body = JSON.stringify({
          userId: applicantId,
          locationId,
          roleAtLocation: 'crew_member'
        });
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`Failed to ${assign ? 'assign' : 'unassign'} location`);
      }

      return response.json();
    },
    onSuccess: () => {
      refetchUserLocations();
      toast({
        title: "Location Updated",
        description: "Location assignment has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update location assignment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const isLocationAssigned = (locationId: number) => {
    return userLocations?.some((ul: any) => ul.locationId === locationId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-4xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/applicants')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applicants
          </Button>
          
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Applicant Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The applicant you're looking for doesn't exist or you don't have permission to view them.
                </p>
                <Button onClick={() => navigate('/applicants')}>
                  Return to Applicants List
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/applicants')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applicants
          </Button>
          
          <Badge className={getStatusBadge(applicant.status || 'new')}>
            {(applicant.status || 'New').charAt(0).toUpperCase() + (applicant.status || 'new').slice(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Basic Info */}
          <div className="lg:col-span-1 space-y-6">
            <ProfileCard userId={applicant.id} />

            {/* Location Assignment Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Assignments
                </CardTitle>
                <CardDescription>
                  Assign this applicant to specific locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locations && locations.length > 0 ? (
                  <div className="space-y-3">
                    {locations.map((location: Location) => (
                      <div key={location.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`location-${location.id}`}
                          checked={isLocationAssigned(location.id)}
                          onCheckedChange={(checked) => {
                            locationMutation.mutate({
                              locationId: location.id,
                              assign: !!checked
                            });
                          }}
                          disabled={locationMutation.isPending}
                        />
                        <label
                          htmlFor={`location-${location.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {location.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No locations available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notes & Messages */}
          <div className="lg:col-span-2 space-y-6">
            <ApplicationNotes applicantId={applicant.id} />
            
            <Separator />
            
            <Card>
              <CardHeader>
                <CardTitle>Communication</CardTitle>
                <CardDescription>
                  Messages and communication history with {applicant.name || applicant.username}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessagingSystem userId={applicant.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApplicantDetail;