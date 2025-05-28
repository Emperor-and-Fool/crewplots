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
import { useDashboard } from "@/contexts/dashboard-context";

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
  // Use unified dashboard context instead of separate API call
  const { data: dashboardData, isLoading } = useDashboard();
  
  // Filter applicants by location if provided, otherwise use all
  const applicants = dashboardData?.applicants || [];
  const filteredApplicants = locationId 
    ? applicants.filter(a => a.locationId === locationId)
    : applicants;

  // Get only the most recent applicants up to the limit
  const recentApplicants = [...filteredApplicants]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
          <ul className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <div className="flex items-center">
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-5 ml-3" />
                </div>
              </li>
            ))}
          </ul>
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
        <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto scrollbar-hide">
          {recentApplicants.map((applicant) => (
            <li key={applicant.id}>
              <div className="px-4 py-4 flex items-center sm:px-6">
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-primary-600 truncate">
                      {applicant.name}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {applicant.email}
                    </div>
                  </div>
                  <div className="mt-4 flex-shrink-0 sm:mt-0">
                    <div className="text-xs text-gray-500">
                      {formatRelativeTime(applicant.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="ml-5 flex-shrink-0">
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </li>
          ))}
          
          {recentApplicants.length === 0 && (
            <li>
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No applicants found
              </div>
            </li>
          )}
        </ul>
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
