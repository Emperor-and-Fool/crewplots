import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Staff, StaffCompetency, User, Competency } from "@shared/schema";

interface StaffOverviewProps {
  locationId: number;
}

interface StaffWithDetails extends Staff {
  user?: User;
  competencies?: Array<StaffCompetency & { competencyDetails?: Competency }>;
  totalScheduledHours?: number;
}

export function StaffOverview({ locationId }: StaffOverviewProps) {
  // Fetch staff members for the location
  const { data: staffMembers, isLoading: isLoadingStaff } = useQuery<Staff[]>({
    queryKey: ['/api/staff/location', locationId],
    enabled: !!locationId,
  });

  // Fetch users to get names
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!staffMembers,
  });

  // Fetch competencies
  const { data: competencies } = useQuery<Competency[]>({
    queryKey: ['/api/competencies/location', locationId],
    enabled: !!locationId,
  });

  // For each staff member, fetch their competencies
  const staffWithCompetencies = staffMembers?.map(staff => {
    // Get staff competencies
    const { data: staffCompetencies } = useQuery<StaffCompetency[]>({
      queryKey: ['/api/staff-competencies/staff', staff.id],
      enabled: !!staff.id,
    });

    // Get user details
    const user = users?.find(u => u.id === staff.userId);

    // Get competency details for each staff competency
    const competenciesWithDetails = staffCompetencies?.map(sc => ({
      ...sc,
      competencyDetails: competencies?.find(c => c.id === sc.competencyId)
    }));

    // Get scheduled hours (mocked for now, in a real app would fetch from shifts)
    // This would be calculated from actual shifts
    const totalScheduledHours = Math.floor(Math.random() * 25) + 15; // Random 15-40 for demo

    return {
      ...staff,
      user,
      competencies: competenciesWithDetails,
      totalScheduledHours
    };
  });

  // Get the competency badge type based on name
  const getCompetencyBadgeType = (competencyName?: string) => {
    if (!competencyName) return "bg-gray-100 text-gray-800";
    
    if (competencyName.toLowerCase().includes("bar")) {
      return "bg-primary-100 text-primary-800";
    } else if (competencyName.toLowerCase().includes("floor")) {
      return "bg-green-100 text-green-800";
    } else if (competencyName.toLowerCase().includes("cash")) {
      return "bg-amber-100 text-amber-800";
    }
    
    return "bg-gray-100 text-gray-800";
  };

  if (isLoadingStaff) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <p>Loading staff data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <CardTitle className="text-lg font-medium text-gray-900">
          Staff Overview
        </CardTitle>
        <p className="mt-1 text-sm text-gray-500">
          {locationId ? `Showing staff assigned to location #${locationId}` : 'No location selected'}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-gray-200">
          {staffWithCompetencies?.map((staff) => (
            <li key={staff.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={`https://ui-avatars.com/api/?name=${staff.user?.name || 'Staff Member'}`} 
                          alt={staff.user?.name || 'Staff Member'} 
                        />
                        <AvatarFallback>{staff.user?.name?.charAt(0) || 'S'}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {staff.user?.name || `Staff #${staff.id}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        {staff.position}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <div className="flex -space-x-1 mr-2">
                        {staff.competencies?.slice(0, 3).map((competency) => (
                          <Badge 
                            key={competency.id}
                            variant="outline"
                            className={`${getCompetencyBadgeType(competency.competencyDetails?.name)} inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium`}
                          >
                            {competency.competencyDetails?.name?.substring(0, 1)}
                            {competency.level}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">{staff.totalScheduledHours}</span> / <span className="text-gray-400">{staff.wantedHours}</span> hrs
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
          
          {(!staffWithCompetencies || staffWithCompetencies.length === 0) && (
            <li>
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No staff members assigned to this location yet
              </div>
            </li>
          )}
        </ul>
      </CardContent>
      <CardFooter className="bg-gray-50 px-4 py-3 sm:px-6">
        <nav className="flex items-center justify-between">
          <div className="flex-1 flex justify-between">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Link href="/staff-management">
              <Button variant="outline" size="sm">
                View All Staff
              </Button>
            </Link>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </nav>
      </CardFooter>
    </Card>
  );
}
