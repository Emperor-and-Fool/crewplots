import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";
import { User } from "@shared/schema";
import { Link } from "wouter";
import { CrewMemberForm } from "@/modules/users/components/crew";

export default function CrewManagement() {
  const [showForm, setShowForm] = useState(false);
  
  // Fetch all users via ValidationEngine30
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ['/api/validation/v3/execute', 'userList', 'list'],
    queryFn: async () => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          operation: 'list',
          entityType: 'userList',
          data: {}
        })
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user list');
      }
      const result = await response.json();
      return result.data; // ValidationEngine30 returns data in .data field
    },
    staleTime: 2 * 60 * 1000,
  });

  // All non-applicant users are considered crew
  const crewMembers = users?.filter(user => user.role !== 'applicant') || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Crew Management</h1>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Assign Crew Member
        </Button>
      </div>
      
      {crewMembers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No crew members found.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {crewMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {member.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link 
                        href={`/crew/${member.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {member.name || "Unknown User"}
                      </Link>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{member.role}</Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {member.email || "No email"}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
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
                <TableCell>
                  <Badge variant={member.status === 'hired' ? 'default' : 'secondary'}>
                    {member.status || 'unknown'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Crew Member Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CrewMemberForm />
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}