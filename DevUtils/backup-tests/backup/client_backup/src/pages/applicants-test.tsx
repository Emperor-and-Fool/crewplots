import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Define the Applicant type for TypeScript
type Applicant = {
  id: number;
  name: string;
  email: string;
  phone: string;
  positionApplied: string;
  status: "new" | "contacted" | "interviewed" | "hired" | "rejected";
  createdAt: string;
  userId: number | null;
  locationId: number | null;
  extraMessage: string | null;
  notes: string | null;
  resumeUrl: string | null;
};

export default function ApplicantsTest() {
  // Fetch applicants
  const { data: applicants, isLoading, error } = useQuery<Applicant[]>({
    queryKey: ['/api/applicants'],
  });

  // Helper function to get status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>;
      case "contacted":
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-200">Contacted</Badge>;
      case "interviewed":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Interviewed</Badge>;
      case "hired":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Hired</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Applicants Test Page</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>All Applicants</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <p>Loading applicants...</p>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4">
              <p>Error loading applicants. Please try again.</p>
              <p className="text-sm">{String(error)}</p>
            </div>
          ) : applicants && applicants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicants.map((applicant) => (
                  <TableRow key={applicant.id}>
                    <TableCell>{applicant.id}</TableCell>
                    <TableCell className="font-medium">{applicant.name}</TableCell>
                    <TableCell>{applicant.email}</TableCell>
                    <TableCell>{applicant.phone || "N/A"}</TableCell>
                    <TableCell>{applicant.positionApplied}</TableCell>
                    <TableCell>{getStatusBadge(applicant.status)}</TableCell>
                    <TableCell>{formatDate(applicant.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>No applicants found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}