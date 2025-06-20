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
  DialogTrigger,
} from "@/components/ui/dialog";
import { LocationForm } from "@/components/locations/location-form";
import { PlusCircle, Pencil, Trash2, MapPin, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Location } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function Locations() {
  const [showForm, setShowForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user has manager role
  const isManager = user?.role === "manager";

  // Fetch locations
  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/locations/${id}`, undefined);
    },
    onSuccess: async () => {
      // Invalidate locations query
      await queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      
      toast({
        title: "Location Deleted",
        description: "The location has been deleted successfully",
      });
      
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: "Failed to delete location. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle edit location
  const handleEdit = (location: Location) => {
    setSelectedLocation(location);
    setShowForm(true);
  };

  // Handle delete location
  const handleDelete = (location: Location) => {
    setSelectedLocation(location);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedLocation) {
      deleteMutation.mutate(selectedLocation.id);
    }
  };

  // If not a manager, redirect to dashboard
  if (!isLoading && !isManager) {
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
              // Show location form
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setSelectedLocation(null);
                  }}
                  className="mb-4"
                >
                  Back to Locations
                </Button>
                <LocationForm 
                  location={selectedLocation || undefined} 
                  isEditing={!!selectedLocation} 
                />
              </div>
            ) : (
              // Show locations list
              <>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage all your bar and restaurant locations
                    </p>
                  </div>
                  <Button onClick={() => setShowForm(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Location
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>All Locations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-4">
                        <p>Loading locations...</p>
                      </div>
                    ) : locations && locations.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {locations.map((location) => (
                            <TableRow key={location.id}>
                              <TableCell className="font-medium">{location.name}</TableCell>
                              <TableCell>
                                <div className="flex items-start">
                                  <MapPin className="h-4 w-4 mr-1 mt-1 flex-shrink-0 text-gray-400" />
                                  <span>{location.address || 'No address provided'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center">
                                    <Mail className="h-4 w-4 mr-1 text-gray-400" />
                                    <span className="text-sm">{location.contactEmail || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Phone className="h-4 w-4 mr-1 text-gray-400" />
                                    <span className="text-sm">{location.contactPhone || 'N/A'}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(location)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600"
                                    onClick={() => handleDelete(location)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-500">No locations found</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => setShowForm(true)}
                        >
                          Add your first location
                        </Button>
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
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedLocation?.name}"? This action cannot be undone.
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
