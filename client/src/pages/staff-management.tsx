import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { StaffForm } from "@/components/staff/staff-form";
import { CompetencyForm } from "@/components/staff/competency-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, Pencil, Trash2, UserPlus, Award, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Staff, User, StaffCompetency, Competency, Location } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function StaffManagement() {
  const [activeTab, setActiveTab] = useState("staff");
  const [showForm, setShowForm] = useState(false);
  const [showCompetencyForm, setShowCompetencyForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<number | null>(user?.locationId || null);

  // Check if user has management role
  const isManager = user?.role === "manager";
  const isFloorManager = user?.role === "floor_manager";

  // Fetch staff members
  const { data: staffMembers, isLoading: isLoadingStaff } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
  });

  // Fetch users to get names
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!staffMembers,
  });

  // Fetch competencies
  const { data: competencies, isLoading: isLoadingCompetencies } = useQuery<Competency[]>({
    queryKey: ['/api/competencies'],
  });

  // Fetch locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  // For each staff member, fetch their competencies
  const staffWithCompetencies = staffMembers?.map(staff => {
    // Filter by location if needed
    if (selectedLocation && staff.locationId !== selectedLocation) {
      return null;
    }

    // Get staff competencies
    const { data: staffCompetencies } = useQuery<StaffCompetency[]>({
      queryKey: ['/api/staff-competencies/staff', staff.id],
      enabled: !!staff.id,
    });

    // Get user details
    const user = users?.find(u => u.id === staff.userId);

    // Get location details
    const location = locations?.find(l => l.id === staff.locationId);

    // Get competency details for each staff competency
    const competenciesWithDetails = staffCompetencies?.map(sc => ({
      ...sc,
      competencyDetails: competencies?.find(c => c.id === sc.competencyId)
    }));

    return {
      ...staff,
      user,
      location,
      competencies: competenciesWithDetails,
    };
  }).filter(Boolean);

  // Delete mutation for staff
  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/staff/${id}`, undefined);
    },
    onSuccess: async () => {
      // Invalidate staff query
      await queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      
      toast({
        title: "Staff Deleted",
        description: "The staff member has been deleted successfully",
      });
      
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error deleting staff:', error);
      toast({
        title: "Error",
        description: "Failed to delete staff member. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation for competency
  const deleteCompetencyMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/competencies/${id}`, undefined);
    },
    onSuccess: async () => {
      // Invalidate competencies query
      await queryClient.invalidateQueries({ queryKey: ['/api/competencies'] });
      
      toast({
        title: "Competency Deleted",
        description: "The competency has been deleted successfully",
      });
      
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error deleting competency:', error);
      toast({
        title: "Error",
        description: "Failed to delete competency. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle edit staff
  const handleEditStaff = (staff: Staff) => {
    setSelectedStaff(staff);
    setShowForm(true);
  };

  // Handle delete staff
  const handleDeleteStaff = (staff: Staff) => {
    setSelectedStaff(staff);
    setDeleteDialogOpen(true);
  };

  // Handle edit competency
  const handleEditCompetency = (competency: Competency) => {
    setSelectedCompetency(competency);
    setShowCompetencyForm(true);
  };

  // Handle delete competency
  const handleDeleteCompetency = (competency: Competency) => {
    setSelectedCompetency(competency);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (activeTab === "staff" && selectedStaff) {
      deleteStaffMutation.mutate(selectedStaff.id);
    } else if (activeTab === "competencies" && selectedCompetency) {
      deleteCompetencyMutation.mutate(selectedCompetency.id);
    }
  };

  // Handle location filter change
  const handleLocationChange = (locationId: number) => {
    setSelectedLocation(locationId);
  };

  // If not a manager or floor manager, redirect to dashboard
  if (!isLoadingStaff && !isManager && !isFloorManager) {
    navigate("/dashboard");
    return null;
  }

  // Format competency badge style based on level
  const getCompetencyBadgeStyle = (level: number) => {
    switch (level) {
      case 5: return "bg-green-100 text-green-800 border-green-200";
      case 4: return "bg-blue-100 text-blue-800 border-blue-200";
      case 3: return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case 2: return "bg-amber-100 text-amber-800 border-amber-200";
      case 1: return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for larger screens */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile navigation */}
        <MobileNavbar />
        
        {/* Top header with search and user */}
        <Header onLocationChange={handleLocationChange} />
        
        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {showForm ? (
              // Show staff form
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setSelectedStaff(null);
                  }}
                  className="mb-4"
                >
                  Back to Staff Management
                </Button>
                <StaffForm 
                  staff={selectedStaff || undefined} 
                  isEditing={!!selectedStaff} 
                />
              </div>
            ) : showCompetencyForm ? (
              // Show competency form
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCompetencyForm(false);
                    setSelectedCompetency(null);
                  }}
                  className="mb-4"
                >
                  Back to Competencies
                </Button>
                <CompetencyForm
                  competency={selectedCompetency || undefined}
                  isEditing={!!selectedCompetency}
                  type="competency"
                />
              </div>
            ) : (
              // Show staff/competencies management
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage staff members and competencies
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex gap-2">
                    {activeTab === "staff" && (
                      <Button onClick={() => setShowForm(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Staff
                      </Button>
                    )}
                    {activeTab === "competencies" && (
                      <Button onClick={() => setShowCompetencyForm(true)}>
                        <Award className="h-4 w-4 mr-2" />
                        Add Competency
                      </Button>
                    )}
                  </div>
                </div>

                <Tabs defaultValue="staff" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="staff">Staff Members</TabsTrigger>
                    <TabsTrigger value="competencies">Competencies</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="staff">
                    <Card>
                      <CardHeader>
                        <CardTitle>Staff List</CardTitle>
                        <CardDescription>
                          {selectedLocation 
                            ? `Showing staff for location #${selectedLocation}` 
                            : "Showing all staff members"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingStaff ? (
                          <div className="flex justify-center py-4">
                            <p>Loading staff members...</p>
                          </div>
                        ) : staffWithCompetencies && staffWithCompetencies.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Competencies</TableHead>
                                <TableHead>Hours</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {staffWithCompetencies.map((staff) => (
                                <TableRow key={staff.id}>
                                  <TableCell>
                                    <div className="flex items-center">
                                      <Avatar className="h-8 w-8 mr-2">
                                        <AvatarImage src={`https://ui-avatars.com/api/?name=${staff.user?.name || 'Staff Member'}`} />
                                        <AvatarFallback>{staff.user?.name?.charAt(0) || 'S'}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <div className="font-medium">{staff.user?.name || `Staff #${staff.id}`}</div>
                                        <div className="text-sm text-gray-500">{staff.user?.email}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{staff.position}</TableCell>
                                  <TableCell>{staff.location?.name || `Location #${staff.locationId}`}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {staff.competencies?.map(sc => (
                                        <Badge 
                                          key={sc.id}
                                          variant="outline"
                                          className={getCompetencyBadgeStyle(sc.level)}
                                        >
                                          {sc.competencyDetails?.name || "Competency"} {sc.level}
                                        </Badge>
                                      ))}
                                      {(!staff.competencies || staff.competencies.length === 0) && (
                                        <span className="text-sm text-gray-500">No competencies assigned</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                                      <span className="text-sm">{staff.wantedHours} hrs/week</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditStaff(staff)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                      </Button>
                                      {isManager && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-red-500 hover:text-red-600"
                                          onClick={() => handleDeleteStaff(staff)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Delete</span>
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate(`/staff-management/competencies/assign/${staff.id}`)}
                                      >
                                        <Award className="h-4 w-4" />
                                        <span className="sr-only">Assign Competency</span>
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-gray-500">No staff members found</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => setShowForm(true)}
                            >
                              Add your first staff member
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="competencies">
                    <Card>
                      <CardHeader>
                        <CardTitle>Competencies List</CardTitle>
                        <CardDescription>
                          Manage skill competencies that can be assigned to staff
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingCompetencies ? (
                          <div className="flex justify-center py-4">
                            <p>Loading competencies...</p>
                          </div>
                        ) : competencies && competencies.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {competencies.map((competency) => {
                                // If floor manager, only show competencies for their location
                                if (isFloorManager && !isManager && user?.locationId && 
                                    competency.locationId !== user.locationId) {
                                  return null;
                                }
                                
                                const location = locations?.find(l => l.id === competency.locationId);
                                
                                return (
                                  <TableRow key={competency.id}>
                                    <TableCell className="font-medium">
                                      <div className="flex items-center">
                                        <Award className="h-4 w-4 mr-2 text-primary-500" />
                                        {competency.name}
                                      </div>
                                    </TableCell>
                                    <TableCell>{competency.description}</TableCell>
                                    <TableCell>{location?.name || `Location #${competency.locationId}`}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditCompetency(competency)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                        {isManager && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDeleteCompetency(competency)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete</span>
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
                            <p className="text-gray-500">No competencies found</p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => setShowCompetencyForm(true)}
                            >
                              Add your first competency
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </main>
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {activeTab === "staff" ? "Staff Member" : "Competency"}
            </DialogTitle>
            <DialogDescription>
              {activeTab === "staff" 
                ? `Are you sure you want to delete staff #${selectedStaff?.id}?` 
                : `Are you sure you want to delete "${selectedCompetency?.name}"?`}
              This action cannot be undone.
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
    </div>
  );
}
