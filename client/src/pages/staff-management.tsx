import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";
import { CrewMemberForm } from "@/modules/users/components/crew";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function StaffManagement() {
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<number | null>(user?.locationId || null);

  // Fetch crew members (users with crew roles)
  const { data: crewMembers, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users/role/crew'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const users = await response.json();
      // Filter for crew members
      return users.filter((user: User) => 
        ['crew_member', 'crew_manager', 'floor_manager'].includes(user.role)
      );
    },
  });

  // Fetch user-location assignments
  const { data: userLocations } = useQuery({
    queryKey: ['/api/user-locations'],
    queryFn: async () => {
      const response = await fetch('/api/user-locations', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user-location assignments');
      }
      return response.json();
    },
  });

  const handleLocationChange = (locationId: number | null) => {
    setSelectedLocation(locationId);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <MobileNavbar />
          <Header onLocationChange={handleLocationChange} />
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div>Loading crew members...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNavbar />
        <Header onLocationChange={handleLocationChange} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {showForm ? (
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                  className="mb-4"
                >
                  Back to Crew Management
                </Button>
                <CrewMemberForm 
                  isEditing={false}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-semibold text-gray-900">Crew Management</h1>
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">Crew Members</CardTitle>
                    <Button onClick={() => setShowForm(true)} size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Crew Member
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {crewMembers && crewMembers.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Crew Member</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {crewMembers.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <Avatar>
                                    <AvatarImage src={member.profileImage || undefined} />
                                    <AvatarFallback>
                                      {member.name
                                        ?.split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase() || "??"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">
                                      {member.name || "Unknown User"}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{member.role}</Badge>
                              </TableCell>
                              <TableCell>
                                {member.email || "No email"}
                              </TableCell>
                              <TableCell>
                                {member.phoneNumber ? (
                                  <a 
                                    href={`tel:${member.phoneNumber}`}
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    {member.phoneNumber}
                                  </a>
                                ) : (
                                  "No phone"
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground">No crew members assigned yet.</p>
                        <Button onClick={() => setShowForm(true)} className="mt-2" variant="outline">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign First Crew Member
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}