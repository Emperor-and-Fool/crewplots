import { useCallback } from 'react';
import { useLocation as useWouterLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useLocationContext } from '@/contexts/location-context';
import { useCreateLocation, useUpdateLocation, useDeleteLocation } from './useLocationData';
import type { LocationFormData } from '../types/location.types';

export function useLocationActions() {
  const [, navigate] = useWouterLocation();
  const { toast } = useToast();
  const { setSelectedLocationId } = useLocationContext();
  
  const createLocationMutation = useCreateLocation();
  const updateLocationMutation = useUpdateLocation();
  const deleteLocationMutation = useDeleteLocation();

  const handleCreateLocation = useCallback(async (data: LocationFormData) => {
    try {
      const newLocation = await createLocationMutation.mutateAsync(data);
      toast({
        title: "Location created",
        description: `${newLocation.name} has been successfully created.`,
      });
      navigate('/locations');
      return newLocation;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create location. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [createLocationMutation, navigate, toast]);

  const handleUpdateLocation = useCallback(async (id: number, data: Partial<LocationFormData>) => {
    try {
      const updatedLocation = await updateLocationMutation.mutateAsync({ id, data });
      toast({
        title: "Location updated",
        description: `${updatedLocation.name} has been successfully updated.`,
      });
      return updatedLocation;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [updateLocationMutation, toast]);

  const handleDeleteLocation = useCallback(async (id: number, locationName: string) => {
    try {
      await deleteLocationMutation.mutateAsync(id);
      toast({
        title: "Location deleted",
        description: `${locationName} has been successfully deleted.`,
      });
      // If deleted location was selected, reset to all locations
      setSelectedLocationId(null);
      navigate('/locations');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete location. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [deleteLocationMutation, setSelectedLocationId, navigate, toast]);

  const handleNavigateToLocation = useCallback((locationId: number) => {
    navigate(`/locations/${locationId}`);
  }, [navigate]);

  const handleSetLocationContext = useCallback((locationId: number | null) => {
    setSelectedLocationId(locationId);
    navigate('/dashboard');
  }, [setSelectedLocationId, navigate]);

  const handleEditLocation = useCallback((locationId: number) => {
    navigate(`/locations/${locationId}/edit`);
  }, [navigate]);

  return {
    // Mutation functions
    handleCreateLocation,
    handleUpdateLocation,
    handleDeleteLocation,
    
    // Navigation functions
    handleNavigateToLocation,
    handleSetLocationContext,
    handleEditLocation,
    
    // Loading states
    isCreating: createLocationMutation.isPending,
    isUpdating: updateLocationMutation.isPending,
    isDeleting: deleteLocationMutation.isPending,
  };
}