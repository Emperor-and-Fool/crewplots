import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth";
import { useLocationContext } from "@/contexts/location-context";
import { useWorkflowPermissions } from "@/hooks/use-workflow-permissions";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  Filter, 
  Search, 
  Users, 
  Mail, 
  Phone, 
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicantForm } from "@/modules/users/components/workflows";
import { Badge } from "@/components/ui/badge";
import LocationHeader from "@/modules/locations/components/LocationHeader";

interface Applicant {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  appliedAt: string;
  position: string;
  experience: string;
  availability: string;
  locationIds?: number[];
}

export default function Applicants() {
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { user } = useAuth();
  const { selectedLocationId, isAllLocations } = useLocationContext();
  const { hasWorkflowAccess } = useWorkflowPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [showNewApplicantForm, setShowNewApplicantForm] = useState(false);

  // Load applicants using ValidationEngine30
  const { data: applicants, isLoading, error } = useQuery({
    queryKey: ['/api/validation/v3/execute', 'userList', selectedLocationId],
    queryFn: async () => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: 'userList',
          operation: 'list',
          data: {
            filters: {
              role: 'applicant',
              locationId: selectedLocationId || undefined
            }
          }
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch applicants');
      }
      
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Filter applicants based on search and filters
  const filteredApplicants = (applicants || []).filter((applicant: any) => {
    const matchesSearch = !searchTerm || 
      applicant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicant.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || applicant.status === statusFilter;
    
    const matchesPosition = positionFilter === 'all' || applicant.position === positionFilter;
    
    const matchesLocation = isAllLocations || !selectedLocationId || 
      applicant.locationIds?.includes(selectedLocationId);
    
    return matchesSearch && matchesStatus && matchesPosition && matchesLocation;
  });

  // Get unique positions for filter
  const positions = [...new Set((applicants || []).map((a: any) => a.position).filter(Boolean))];

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ applicantId, status }: { applicantId: number; status: string }) => {
      const response = await fetch('/api/validation/v3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: 'userSingle',
          operation: 'update',
          data: {
            id: applicantId,
            status
          }
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update applicant status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'userList'] });
      toast({
        title: "Status Updated",
        description: "Applicant status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update applicant status. Please try again.",
        variant: "destructive",
      });
    }
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'reviewing': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      case 'reviewing': return Clock;
      default: return Clock;
    }
  };

  if (error) {
    return (
      <div className="flex h-screen bg-background">
        <div className="lg:flex hidden">
          <Sidebar />
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="lg:hidden">
            <MobileNavbar />
          </div>
          
          <Header />
          
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
            <div className="container mx-auto">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Error Loading Applicants</h3>
                    <p className="text-muted-foreground mb-4">
                      Unable to load applicant data. Please try again.
                    </p>
                    <Button onClick={() => window.location.reload()}>
                      Reload Page
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="lg:flex hidden">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden">
          <MobileNavbar />
        </div>
        
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <div className="container mx-auto space-y-6">
            <LocationHeader />
            
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Applicants</h1>
                <p className="text-muted-foreground">
                  Manage job applications and candidate reviews
                </p>
              </div>
              {hasWorkflowAccess('applicant_management') && (
                <Button 
                  onClick={() => setShowNewApplicantForm(!showNewApplicantForm)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  New Application
                </Button>
              )}
            </div>

            {/* New Applicant Form */}
            {showNewApplicantForm && (
              <Card>
                <CardHeader>
                  <CardTitle>New Application</CardTitle>
                  <CardDescription>
                    Add a new job application to the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ApplicantForm 
                    onSuccess={() => {
                      setShowNewApplicantForm(false);
                      queryClient.invalidateQueries({ queryKey: ['/api/validation/v3/execute', 'userList'] });
                    }}
                    onCancel={() => setShowNewApplicantForm(false)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search applicants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {positions.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Applicants List */}
            {isLoading ? (
              <div className="grid gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-muted rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/4"></div>
                          <div className="h-3 bg-muted rounded w-1/3"></div>
                        </div>
                        <div className="h-6 w-20 bg-muted rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredApplicants.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Applicants Found</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm || statusFilter !== 'all' || positionFilter !== 'all'
                        ? "No applicants match your current filters."
                        : "No applications have been submitted yet."}
                    </p>
                    {hasWorkflowAccess('applicant_management') && (
                      <Button onClick={() => setShowNewApplicantForm(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add First Application
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredApplicants.map((applicant: any) => {
                  const StatusIcon = getStatusIcon(applicant.status || 'pending');
                  
                  return (
                    <Card key={applicant.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1" onClick={() => navigate(`/applicant/${applicant.id}`)}>
                            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="h-6 w-6 text-primary" />
                            </div>
                            
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{applicant.name || 'Unnamed Applicant'}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                {applicant.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span>{applicant.email}</span>
                                  </div>
                                )}
                                {applicant.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    <a 
                                      href={`tel:${applicant.phone}`} 
                                      className="hover:text-primary transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {applicant.phone}
                                    </a>
                                  </div>
                                )}
                                {applicant.appliedAt && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(applicant.appliedAt).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                              
                              {applicant.position && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {applicant.position}
                                  </Badge>
                                  {applicant.experience && (
                                    <Badge variant="secondary" className="text-xs">
                                      {applicant.experience} experience
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={getStatusBadgeVariant(applicant.status || 'pending')}
                              className="flex items-center gap-1"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {(applicant.status || 'pending').charAt(0).toUpperCase() + (applicant.status || 'pending').slice(1)}
                            </Badge>
                            
                            {hasWorkflowAccess('applicant_management') && applicant.status !== 'approved' && applicant.status !== 'rejected' && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatusMutation.mutate({ applicantId: applicant.id, status: 'approved' });
                                  }}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatusMutation.mutate({ applicantId: applicant.id, status: 'rejected' });
                                  }}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Summary Stats */}
            {filteredApplicants.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{filteredApplicants.length}</div>
                      <div className="text-sm text-muted-foreground">Total Applications</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {filteredApplicants.filter((a: any) => a.status === 'pending' || !a.status).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Pending Review</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {filteredApplicants.filter((a: any) => a.status === 'approved').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Approved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {filteredApplicants.filter((a: any) => a.status === 'rejected').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Rejected</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}