import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
// CrewMemberForm will be implemented later
// import { CrewMemberForm } from "@/modules/users/components/crew";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function CrewManagement() {
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<number | null>(user?.locationId || null);

  // Fetch crew members (users with crew roles) with caching
  const { data: crewMembers, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users/role/crew'],
    staleTime: 2 * 60 * 1000, // 2 minutes cache for crew list
    cacheTime: 10 * 60 * 1000, // 10 minutes in memory
  });

  const filteredCrewMembers = crewMembers?.filter(member => 
    ['crew_member', 'crew_manager', 'floor_manager', 'manager'].includes(member.role)
  ) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <Card><CardContent className="h-32 bg-gray-100 rounded" /></Card>
          <Card><CardContent className="h-64 bg-gray-100 rounded" /></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Crew Management</h1>
          <p className="text-gray-600 mt-1">
            Manage crew members, roles, and location assignments
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Assign Crew Member
        </Button>
      </div>

      {/* Crew Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Crew Members</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCrewMembers.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No crew members found</h3>
              <p className="text-gray-600 mb-4">Get started by assigning your first crew member.</p>
              <Button onClick={() => setShowForm(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Crew Member
              </Button>
            </div>
          ) : (
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
                {filteredCrewMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profileImage || ''} />
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
                            <Link 
                              href={`/crew/${member.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {member.name || "Unknown User"}
                            </Link>
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
          )}
        </CardContent>
      </Card>

      {/* Crew Member Form Dialog - TODO: Implement CrewMemberForm */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Assign Crew Member</h3>
            <p className="text-gray-600 mb-4">Crew member assignment form will be implemented here.</p>
            <Button onClick={() => setShowForm(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}