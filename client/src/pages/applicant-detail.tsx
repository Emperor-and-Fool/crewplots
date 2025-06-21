import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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
import { MessagingSystem } from '@/components/ui/messaging-system';
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
    enabled: !!applicantId,
  });

  const applicant = profileData?.find((user: any) => user.id === applicantId && user.role === 'applicant');

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
        return 'bg-gray-200 text-gray-800';
    }
  };

  const goBack = () => {
    navigate('/dashboard');
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
          {applicant.status || 'new'}
        </Badge>
      </div>

      {/* Profile Card - matching applicant-portal structure */}
      <ProfileCard userId={applicant.id} className="mb-8" />

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
    </div>
  );
}

export default ApplicantDetail;