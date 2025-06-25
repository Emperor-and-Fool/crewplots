import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Phone, Mail, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/modules/auth';
import { apiRequest } from '@/lib/queryClient';
import type { User, Location } from '@shared/schema';

interface UserLocationAssignment {
  id: number;
  userId: number;
  locationId: number;
  assignedAt: string;
}

export default function CrewMemberProfile() {
  const { userId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();



  // Permission check - only administrators, managers, and floor_managers can edit roles
  const canEditRoles = currentUser?.role && ['administrator', 'manager', 'floor_manager'].includes(currentUser.role);

  // State for local changes
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [motivationNote, setMotivationNote] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch user profile with Redis caching
  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    cacheTime: 30 * 60 * 1000, // 30 minutes in memory
  });



  // Fetch all locations with caching
  const { data: allLocations = [] } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations');
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache for locations
    cacheTime: 60 * 60 * 1000, // 1 hour in memory
  });

  // Fetch user's location assignments with caching
  const { data: userLocations = [], isLoading: locationsLoading, error: locationsError } = useQuery<UserLocationAssignment[]>({
    queryKey: ['/api/user-locations', userId],
    queryFn: async () => {
      const response = await fetch(`/api/user-locations/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user locations');
      }
      return response.json();
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache for assignments
    cacheTime: 15 * 60 * 1000, // 15 minutes in memory
  });



  // Initialize state when data loads
  React.useEffect(() => {
    if (user && userLocations.length >= 0) {
      setSelectedRole(user.role || '');
      setSelectedLocations(userLocations.map(ul => ul.locationId));
      setMotivationNote(user.notes || '');
      setHasChanges(false);
    }
  }, [user, userLocations]);

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update role: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      toast({ title: "Role updated successfully" });
    },
    onError: (error) => {
      console.error('Role update error:', error);
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  });

  // Update locations mutation
  const updateLocationsMutation = useMutation({
    mutationFn: async (locationIds: number[]) => {
      // Remove existing assignments
      const removePromises = userLocations
        .filter(ul => !locationIds.includes(ul.locationId))
        .map(ul => fetch(`/api/user-locations/${userId}/${ul.locationId}`, { method: 'DELETE' }));

      // Add new assignments
      const addPromises = locationIds
        .filter(locationId => !userLocations.some(ul => ul.locationId === locationId))
        .map(locationId => fetch('/api/user-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: parseInt(userId!), 
            locationId,
            roleAtLocation: 'crew_member' // Required field with default value
          })
        }));

      const results = await Promise.all([...removePromises, ...addPromises]);
      
      // Check if any requests failed
      for (const response of results) {
        if (!response.ok) {
          throw new Error(`Failed to update locations: ${response.status}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-locations', userId] });
      toast({ title: "Location assignments updated successfully" });
    },
    onError: (error) => {
      console.error('Location update error:', error);
      toast({ title: "Failed to update location assignments", variant: "destructive" });
    }
  });

  // Update motivation note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: note })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update notes: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      toast({ title: "Motivation note updated successfully" });
    },
    onError: (error) => {
      console.error('Notes update error:', error);
      toast({ title: "Failed to update motivation note", variant: "destructive" });
    }
  });

  const handleSaveChanges = async () => {
    if (!user) return;

    try {
      if (selectedRole !== user.role) {
        await updateRoleMutation.mutateAsync(selectedRole);
      }
      
      const currentLocationIds = userLocations.map(ul => ul.locationId);
      if (JSON.stringify(selectedLocations.sort()) !== JSON.stringify(currentLocationIds.sort())) {
        await updateLocationsMutation.mutateAsync(selectedLocations);
      }

      if (motivationNote !== (user.notes || '')) {
        await updateNoteMutation.mutateAsync(motivationNote);
      }

      setHasChanges(false);
    } catch (error) {
      // Error handling is done in individual mutations
    }
  };

  const availableRoles = [
    { value: 'crew_member', label: 'Crew Member', description: 'Basic crew member with standard permissions' },
    { value: 'crew_manager', label: 'Crew Manager', description: 'Manages crew members and schedules' },
    { value: 'floor_manager', label: 'Floor Manager', description: 'Manages specific location operations' },
    { value: 'manager', label: 'Manager', description: 'Full management permissions' },
    { value: 'administrator', label: 'Administrator', description: 'System administrator with full access' }
  ];

  if (userLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/crew-management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Crew Management
          </Button>
        </div>
        <div className="animate-pulse space-y-6">
          <Card><CardContent className="h-32 bg-gray-100 rounded" /></Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
          <Button onClick={() => navigate('/crew-management')} className="mt-4">
            Back to Crew Management
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/crew-management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Crew Management
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Crew Member Profile</h1>
        </div>
        {hasChanges && canEditRoles && (
          <Button onClick={handleSaveChanges} disabled={updateRoleMutation.isPending || updateLocationsMutation.isPending || updateNoteMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Profile Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profileImage || ''} />
              <AvatarFallback className="text-lg">
                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{user.name || 'Unknown User'}</h3>
              <p className="text-gray-600 mb-2">@{user.username}</p>
              <Badge variant="secondary">{user.role}</Badge>
              <div className="flex items-center gap-4 mt-4">
                {user.email && (
                  <a href={`mailto:${user.email}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </a>
                )}
                {user.phoneNumber && (
                  <a href={`tel:${user.phoneNumber}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                    <Phone className="h-4 w-4" />
                    {user.phoneNumber}
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Management */}
        <Card>
          <CardHeader>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>
              {canEditRoles ? 'Select the user\'s role and permissions' : 'View user role and permissions (read-only)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableRoles.map((role) => (
                <div key={role.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={role.value}
                    checked={selectedRole === role.value}
                    disabled={!canEditRoles}
                    onCheckedChange={(checked) => {
                      if (checked && canEditRoles) {
                        setSelectedRole(role.value);
                        setHasChanges(true);
                      }
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={role.value}
                      className={`text-sm font-medium leading-none ${canEditRoles ? 'cursor-pointer' : 'cursor-default'} ${!canEditRoles ? 'text-gray-500' : ''}`}
                    >
                      {role.label}
                    </label>
                    <p className="text-xs text-gray-600">{role.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedRole !== user.role && canEditRoles && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-4">
                    Confirm Role Change
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will change {user.name}'s role from "{user.role}" to "{selectedRole}". 
                      This action will immediately affect their permissions and access to the system.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSelectedRole(user.role || '')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => updateRoleMutation.mutate(selectedRole)}>
                      Confirm Change
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>

        {/* Location Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Location Assignments</CardTitle>
            <CardDescription>
              {canEditRoles ? 'Assign the user to locations they can work at' : 'View user location assignments (read-only)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allLocations.map((location) => (
                <div key={location.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`location-${location.id}`}
                    checked={selectedLocations.includes(location.id)}
                    disabled={!canEditRoles}
                    onCheckedChange={(checked) => {
                      if (!canEditRoles) return;
                      
                      if (checked) {
                        setSelectedLocations([...selectedLocations, location.id]);
                      } else {
                        setSelectedLocations(selectedLocations.filter(id => id !== location.id));
                      }
                      setHasChanges(true);
                    }}
                  />
                  <label
                    htmlFor={`location-${location.id}`}
                    className={`text-sm font-medium leading-none ${canEditRoles ? 'cursor-pointer' : 'cursor-default'} ${!canEditRoles ? 'text-gray-500' : ''}`}
                  >
                    {location.name}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Motivation Note */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Motivation & Notes</CardTitle>
          <CardDescription>
            {canEditRoles ? 'Add personal notes and motivation comments about this crew member' : 'View motivation notes (read-only)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={canEditRoles ? "Add motivation notes, performance comments, or other relevant information..." : "No notes available"}
            value={motivationNote}
            disabled={!canEditRoles}
            onChange={(e) => {
              if (canEditRoles) {
                setMotivationNote(e.target.value);
                setHasChanges(true);
              }
            }}
            rows={6}
            className={!canEditRoles ? 'text-gray-500 bg-gray-50' : ''}
          />
        </CardContent>
      </Card>
    </div>
  );
}