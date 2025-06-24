import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@shared/schema";

interface ApplicantsSummaryProps {
  locationId?: number;
  limit?: number;
}

// Helper to format date relative to current time
const formatRelativeTime = (date: string | Date) => {
  const now = new Date();
  const applicantDate = new Date(date);
  const diffMs = now.getTime() - applicantDate.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
  } else if (diffHours > 0) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else {
    return 'Just now';
  }
};

export function ApplicantsSummary({ locationId, limit = 4 }: ApplicantsSummaryProps) {
  // Use existing profile-data endpoint and filter for applicants
  const { data: profileData, isLoading } = useQuery<User[]>({
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
    enabled: true,
  });

  // Filter for applicants only
  const applicants = profileData?.filter(user => user.role === 'applicant') || [];

  // Filter by location if specified
  const filteredApplicants = locationId 
    ? applicants.filter(applicant => applicant.locationId === locationId)
    : applicants;

  // Get only the most recent applicants up to the limit
  const recentApplicants = [...filteredApplicants]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, limit);

  const totalApplicants = filteredApplicants.length;
  const newApplicants = filteredApplicants.filter(a => a.status === 'new').length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Applicants</CardTitle>
          <Skeleton className="h-4 w-28 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="bg-gray-50 px-4 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-20 ml-auto" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <CardTitle className="text-lg font-medium text-gray-900">
          Recent Applicants
        </CardTitle>
        <p className="mt-1 text-sm text-gray-500">
          {newApplicants} new applications {locationId ? `for this location` : 'across all locations'}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200">
          {recentApplicants.map((applicant) => (
            <div key={applicant.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {applicant.name}
                    </h4>
                    <div className="ml-2 flex-shrink-0">
                      <span className="text-xs text-gray-500">
                        {applicant.createdAt ? formatRelativeTime(applicant.createdAt) : 'Recently'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600 truncate">
                      {applicant.email}
                    </div>
                    {applicant.phoneNumber && (
                      <div className="text-sm">
                        <a 
                          href={`tel:${applicant.phoneNumber}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {applicant.phoneNumber}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="ml-4 flex-shrink-0">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
          
          {recentApplicants.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No applicants found
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {recentApplicants.length} of {totalApplicants} applicants
          </div>
          <div>
            <Link href="/applicants">
              <Button variant="outline" size="sm" className="text-primary-700 bg-primary-100 hover:bg-primary-200">
                View all
              </Button>
            </Link>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}