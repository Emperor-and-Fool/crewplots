import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicantForm } from "@/components/applicants/applicant-form";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileText, Trash2, UserCheck, UserX, Mail, Phone, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Applicant, Location, Staff } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

export default function Applicants() {
  const [showForm, setShowForm] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user has management role
  const isManager = user?.role === "manager";
  const isFloorManager = user?.role === "floor_manager";

  // Fetch applicants
  const { data: applicants, isLoading } = useQuery<Applicant[]>({
    queryKey: ['/api/applicants'],
  });

  // Fetch locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  // Filter applicants based on selected location and status
  const filteredApplicants = applicants?.filter(applicant => {
    if (selectedLocation && applicant.locationId !== selectedLocation) {
      return false;
    }
    if (selectedStatus && applicant.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/applicants/${id}`, undefined);
    },
    onSuccess: async () => {
      // Invalidate applicants query
      await queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      
      toast({
        title: "Applicant Deleted",
        description: "The applicant has been deleted successfully",
      });
      
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error deleting applicant:', error);
      toast({
        title: "Error",
        description: "Failed to delete applicant. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Hire mutation (update status and create staff record)
  const hireMutation = useMutation({
    mutationFn: async ({ id, locationId }: { id: number, locationId: number }) => {
      // First update the applicant status
      await apiRequest('PUT', `/api/applicants/${id}`, {
        status: "hired"
      });
      
      // Then create a staff record
      // This is simplified - in a real app, you'd need more data
      const applicant = applicants?.find(a => a.id === id);
      if (!applicant) throw new Error("Applicant not found");
      
      return apiRequest('POST', '/api/staff', {
        userId: null, // Would need to find or create user
        locationId,
        position: applicant.positionApplied,
        wantedHours: 20 // Default
      });
    },
    onSuccess: async () => {
      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      
      toast({
        title: "Applicant Hired",
        description: "The applicant has been marked as hired and added to staff",
      });
      
      setHireDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error hiring applicant:', error);
      toast({
        title: "Error",
        description: "Failed to hire applicant. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle delete applicant
  const handleDelete = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setDeleteDialogOpen(true);
  };

  // Handle hire applicant
  const handleHire = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setHireDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedApplicant) {
      deleteMutation.mutate(selectedApplicant.id);
    }
  };

  // Confirm hire
  const confirmHire = (locationId: number) => {
    if (selectedApplicant) {
      hireMutation.mutate({ 
        id: selectedApplicant.id, 
        locationId 
      });
    }
  };



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

  // If not a manager or floor manager, redirect to dashboard
  if (!isLoading && !isManager && !isFloorManager) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for larger screens */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile navigation */}
        <MobileNavbar />
        
        {/* Top header with search and user */}
        <Header />
        
        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {showForm ? (
              // Show applicant form
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setSelectedApplicant(null);
                  }}
                  className="mb-4"
                >
                  Back to Applicants
                </Button>
                <ApplicantForm 
                  applicant={selectedApplicant || undefined} 
                  isEditing={!!selectedApplicant} 
                />
              </div>
            ) : (
              // Show applicants list
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage job applicants and hiring process
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex gap-2">
                    <Button onClick={() => setShowForm(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Applicant
                    </Button>
                  </div>
                </div>

                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                  <Card className="w-full sm:w-auto">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <label htmlFor="location-filter" className="text-sm font-medium text-gray-700">Filter by Location:</label>
                        <Select 
                          value={selectedLocation?.toString() || ""} 
                          onValueChange={(value) => setSelectedLocation(value ? parseInt(value) : null)}
                        >
                          <SelectTrigger id="location-filter" className="w-[200px]">
                            <SelectValue placeholder="All Locations" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Locations</SelectItem>
                            {locations?.map(location => (
                              <SelectItem key={location.id} value={location.id.toString()}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="w-full sm:w-auto">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">Filter by Status:</label>
                        <Select 
                          value={selectedStatus || ""} 
                          onValueChange={(value) => setSelectedStatus(value || null)}
                        >
                          <SelectTrigger id="status-filter" className="w-[200px]">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All Statuses</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="interviewed">Interviewed</SelectItem>
                            <SelectItem value="hired">Hired</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>All Applicants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-4">
                        <p>Loading applicants...</p>
                      </div>
                    ) : filteredApplicants && filteredApplicants.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Applied</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredApplicants.map((applicant) => {
                            const location = locations?.find(l => l.id === applicant.locationId);
                            
                            return (
                              <TableRow key={applicant.id}>
                                <TableCell className="font-medium">
                                  {applicant.name}
                                  {location && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Location: {location.name}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>{applicant.positionApplied}</TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex items-center">
                                      <Mail className="h-4 w-4 mr-1 text-gray-400" />
                                      <a href={`mailto:${applicant.email}`} className="text-sm text-primary-600 hover:underline">
                                        {applicant.email}
                                      </a>
                                    </div>
                                    {applicant.phone && (
                                      <div className="flex items-center">
                                        <Phone className="h-4 w-4 mr-1 text-gray-400" />
                                        <a href={`tel:${applicant.phone}`} className="text-sm">
                                          {applicant.phone}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(applicant.status)}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(applicant.createdAt), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedApplicant(applicant);
                                        setShowForm(true);
                                      }}
                                    >
                                      <FileText className="h-4 w-4" />
                                      <span className="sr-only">Edit</span>
                                    </Button>
                                    
                                    {applicant.status !== "hired" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-green-500 hover:text-green-600"
                                        onClick={() => handleHire(applicant)}
                                      >
                                        <UserCheck className="h-4 w-4" />
                                        <span className="sr-only">Hire</span>
                                      </Button>
                                    )}
                                    
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-500 hover:text-red-600"
                                      onClick={() => handleDelete(applicant)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                    
                                    {applicant.resumeUrl && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(applicant.resumeUrl!, '_blank')}
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                        <span className="sr-only">View Resume</span>
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-500">No applicants found</p>
                        <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowForm(true)}
                          >
                            Add applicant manually
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={handlePrintQR}
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Print application QR code
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Applicant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedApplicant?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Hire confirmation dialog */}
      <Dialog open={hireDialogOpen} onOpenChange={setHireDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hire Applicant</DialogTitle>
            <DialogDescription>
              You are about to hire "{selectedApplicant?.name}" for position "{selectedApplicant?.positionApplied}".
              Please select the location where this staff member will work.
            </DialogDescription>
          </DialogHeader>
          
          <Select onValueChange={(value) => {
            if (value) confirmHire(parseInt(value));
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {locations?.map(location => (
                <SelectItem key={location.id} value={location.id.toString()}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setHireDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
