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
import { PlusCircle, Trash2, UserCheck, UserX, QrCode, MessageSquare, Paperclip } from "lucide-react";
import { printQRCode } from "@/lib/qr-code";
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

  // Auth hook
  const { user } = useAuth();

  // Since this component is already protected by RoleProtectedRoute in App.tsx,
  // we don't need additional access control here. The routing system already
  // ensures only managers and floor_managers can access this page.

  // Fetch applicants
  const { data: applicants, isLoading } = useQuery({
    queryKey: ['/api/applicants'],
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['/api/locations'],
  });

  // Filter applicants by location
  const filteredApplicants = applicants?.filter(applicant => 
    !selectedLocation || applicant.locationId === selectedLocation
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/applicants/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      toast({
        title: "Applicant Deleted",
        description: "The applicant has been successfully deleted",
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
      const applicant = applicants?.find(a => a.id === id);
      if (!applicant) throw new Error("Applicant not found");
      
      return apiRequest('POST', '/api/staff', {
        userId: null, // Would need to find or create user
        locationId,
        position: "General", // Default position
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

  // Generate and print QR code
  const handlePrintQR = async () => {
    try {
      await printQRCode();
      toast({
        title: "QR Code Generated",
        description: "The application QR code has been sent to your printer",
      });
    } catch (error) {
      console.error('Error printing QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header />
          
          {/* Mobile navbar */}
          <MobileNavbar />
          
          {/* Page content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            {showForm ? (
              // Show form
              <div>
                <div className="mb-6">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false);
                      setSelectedApplicant(null);
                    }}
                    className="mb-4"
                  >
                    ← Back to Applicants
                  </Button>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedApplicant ? 'Edit Applicant' : 'Add New Applicant'}
                  </h1>
                </div>
                <ApplicantForm 
                  applicant={selectedApplicant || undefined} 
                  onSuccess={() => {
                    setShowForm(false);
                    setSelectedApplicant(null);
                  }}
                  isEditing={!!selectedApplicant} 
                />
              </div>
            ) : (
              // Show four-section applicants view
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage job applicants and hiring process
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={handlePrintQR}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Print QR Code
                    </Button>
                    <Button onClick={() => setShowForm(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Applicant
                    </Button>
                  </div>
                </div>

                {/* Filter by Location */}
                <div className="mb-6">
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
                </div>

                {/* Four-section applicant view */}
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <p>Loading applicants...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Not Reviewed Yet */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Not Reviewed Yet</h3>
                      <div className="space-y-3">
                        {filteredApplicants?.filter(app => app.status === 'new').map((applicant) => {
                            const location = locations?.find(l => l.id === applicant.locationId);
                            
                            return (
                              <div key={applicant.id} className="bg-white p-4 rounded-lg shadow-sm border">
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-medium text-gray-900">{applicant.name}</h4>
                                  <div className="flex gap-1">
                                    {applicant.extraMessage && (
                                      <MessageSquare className="h-4 w-4 text-blue-500" />
                                    )}
                                    {applicant.resumeUrl && (
                                      <Paperclip className="h-4 w-4 text-green-500" />
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{applicant.email}</p>
                                {applicant.phone && (
                                  <p className="text-sm text-gray-600 mb-2">{applicant.phone}</p>
                                )}
                                {location && (
                                  <p className="text-xs text-gray-500 mb-3">{location.name}</p>
                                )}
                                <p className="text-xs text-gray-400">{format(new Date(applicant.createdAt), "MMM d, yyyy")}</p>
                                <div className="flex gap-2 mt-3">
                                  <Button size="sm" variant="outline" onClick={() => handleHire(applicant)}>
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Hire
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDelete(applicant)}>
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            );
                        })}
                        {filteredApplicants?.filter(app => app.status === 'new').length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <p>No new applicants</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Short-listed */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Short-listed</h3>
                      <div className="space-y-3">
                        {filteredApplicants?.filter(app => app.status === 'contacted' || app.status === 'interviewed').map((applicant) => {
                            const location = locations?.find(l => l.id === applicant.locationId);
                            
                            return (
                              <div key={applicant.id} className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-medium text-gray-900">{applicant.name}</h4>
                                  <div className="flex gap-1">
                                    {applicant.extraMessage && (
                                      <MessageSquare className="h-4 w-4 text-blue-500" />
                                    )}
                                    {applicant.resumeUrl && (
                                      <Paperclip className="h-4 w-4 text-green-500" />
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2 mb-2">
                                  {applicant.status === 'contacted' && (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Contacted</Badge>
                                  )}
                                  {applicant.status === 'interviewed' && (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Interviewed</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{applicant.email}</p>
                                {applicant.phone && (
                                  <p className="text-sm text-gray-600 mb-2">{applicant.phone}</p>
                                )}
                                {location && (
                                  <p className="text-xs text-gray-500 mb-3">{location.name}</p>
                                )}
                                <p className="text-xs text-gray-400">{format(new Date(applicant.createdAt), "MMM d, yyyy")}</p>
                                <div className="flex gap-2 mt-3">
                                  <Button size="sm" variant="outline" onClick={() => handleHire(applicant)}>
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Hire
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDelete(applicant)}>
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            );
                        })}
                        {filteredApplicants?.filter(app => app.status === 'contacted' || app.status === 'interviewed').length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <p>No short-listed applicants</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Look Again */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Look Again</h3>
                      <div className="space-y-3">
                        {filteredApplicants?.filter(app => app.status === 'hired').map((applicant) => {
                            const location = locations?.find(l => l.id === applicant.locationId);
                            
                            return (
                              <div key={applicant.id} className="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-200">
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-medium text-gray-900">{applicant.name}</h4>
                                  <div className="flex gap-1">
                                    {applicant.extraMessage && (
                                      <MessageSquare className="h-4 w-4 text-blue-500" />
                                    )}
                                    {applicant.resumeUrl && (
                                      <Paperclip className="h-4 w-4 text-green-500" />
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 mb-2">Review Later</Badge>
                                <p className="text-sm text-gray-600 mb-2">{applicant.email}</p>
                                {applicant.phone && (
                                  <p className="text-sm text-gray-600 mb-2">{applicant.phone}</p>
                                )}
                                {location && (
                                  <p className="text-xs text-gray-500 mb-3">{location.name}</p>
                                )}
                                <p className="text-xs text-gray-400">{format(new Date(applicant.createdAt), "MMM d, yyyy")}</p>
                                <div className="flex gap-2 mt-3">
                                  <Button size="sm" variant="outline" onClick={() => handleHire(applicant)}>
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Hire
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDelete(applicant)}>
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            );
                        })}
                        {filteredApplicants?.filter(app => app.status === 'hired').length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <p>No applicants to review later</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rejected */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-500">Rejected</h3>
                      <div className="space-y-3">
                        {filteredApplicants?.filter(app => app.status === 'rejected').map((applicant) => {
                            const location = locations?.find(l => l.id === applicant.locationId);
                            
                            return (
                              <div key={applicant.id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 opacity-60">
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-medium text-gray-500">{applicant.name}</h4>
                                  <div className="flex gap-1">
                                    {applicant.extraMessage && (
                                      <MessageSquare className="h-4 w-4 text-gray-400" />
                                    )}
                                    {applicant.resumeUrl && (
                                      <Paperclip className="h-4 w-4 text-gray-400" />
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 mb-2">Rejected</Badge>
                                <p className="text-sm text-gray-500 mb-2">{applicant.email}</p>
                                {applicant.phone && (
                                  <p className="text-sm text-gray-500 mb-2">{applicant.phone}</p>
                                )}
                                {location && (
                                  <p className="text-xs text-gray-400 mb-3">{location.name}</p>
                                )}
                                <p className="text-xs text-gray-400">{format(new Date(applicant.createdAt), "MMM d, yyyy")}</p>
                                <div className="flex gap-2 mt-3">
                                  <Button size="sm" variant="outline" disabled className="opacity-50">
                                    <UserX className="h-3 w-3 mr-1" />
                                    Rejected
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDelete(applicant)}>
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            );
                        })}
                        {filteredApplicants?.filter(app => app.status === 'rejected').length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <p>No rejected applicants</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Applicant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedApplicant?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hire Dialog */}
      <Dialog open={hireDialogOpen} onOpenChange={setHireDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hire Applicant</DialogTitle>
            <DialogDescription>
              Select a location to hire {selectedApplicant?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select onValueChange={(value) => setSelectedLocation(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map(location => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHireDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedLocation && confirmHire(selectedLocation)}
              disabled={hireMutation.isPending || !selectedLocation}
            >
              {hireMutation.isPending ? "Hiring..." : "Hire"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}