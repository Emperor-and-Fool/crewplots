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
import { User, Location } from "@shared/schema";

interface StaffOverviewProps {
  locationId: number;
}

export const StaffOverview = ({ locationId }: StaffOverviewProps) => {
  // Fetch users assigned to this location with crew roles
  const { data: crewMembers, isLoading } = useQuery<User[]>({
    queryKey: ['/api/user-locations', locationId, 'crew'],
    queryFn: async () => {
      const response = await fetch(`/api/user-locations?locationId=${locationId}&roles=crew_member,crew_chief`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch crew members');
      }
      return response.json();
    },
    enabled: !!locationId,
  });

  // Fetch location details
  const { data: location } = useQuery<Location>({
    queryKey: ['/api/locations', locationId],
    queryFn: async () => {
      const response = await fetch(`/api/locations/${locationId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch location');
      }
      return response.json();
    },
    enabled: !!locationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">Loading crew members...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Overview</CardTitle>
        {location && (
          <p className="text-sm text-muted-foreground">
            {location.name} - {crewMembers?.length || 0} crew members
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {crewMembers && crewMembers.length > 0 ? (
            crewMembers.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatarUrl || undefined} />
                  <AvatarFallback>
                    {(member.firstName?.charAt(0) || member.name?.charAt(0) || member.username?.charAt(0) || '?').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {member.firstName && member.lastName 
                      ? `${member.firstName} ${member.lastName}`
                      : member.name || member.username
                    }
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {member.role?.replace('_', ' ') || 'crew member'}
                    </Badge>
                    {member.phone && (
                      <a 
                        href={`tel:${member.phone}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {member.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No crew members assigned to this location
            </div>
          )}
        </div>
      </CardContent>
      {crewMembers && crewMembers.length > 5 && (
        <CardFooter>
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/staff-management">
              View All {crewMembers.length} Crew Members
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};