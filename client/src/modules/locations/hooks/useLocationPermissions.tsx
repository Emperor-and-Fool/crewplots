import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { LocationPermissions } from '../types/location.types';

export function useLocationPermissions(): LocationPermissions {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) {
      return {
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canManageUsers: false,
      };
    }

    const isAdmin = user.role === 'administrator';
    const isManager = user.role === 'manager';
    const hasLocationAccess = isAdmin || isManager;

    // Check workflow permissions for location management
    const locationWorkflowPermissions = user.workflowPermissions?.location || [];
    const canViewLocations = locationWorkflowPermissions.includes('view');
    const canEditLocations = locationWorkflowPermissions.includes('edit');
    const canCreateLocations = locationWorkflowPermissions.includes('create');
    const canDeleteLocations = locationWorkflowPermissions.includes('delete');
    const canManageLocationUsers = locationWorkflowPermissions.includes('manage_users');

    return {
      canView: hasLocationAccess && canViewLocations,
      canEdit: hasLocationAccess && canEditLocations,
      canCreate: hasLocationAccess && canCreateLocations,
      canDelete: isAdmin && canDeleteLocations, // Only administrators can delete
      canManageUsers: hasLocationAccess && canManageLocationUsers,
    };
  }, [user]);
}

// Helper hook for specific permission checks
export function useCanAccessLocation(locationId?: number) {
  const { user } = useAuth();
  const permissions = useLocationPermissions();
  
  return useMemo(() => {
    if (!permissions.canView) return false;
    
    // Additional logic for location-specific access could go here
    // For now, if user can view locations generally, they can view this one
    return true;
  }, [permissions.canView, locationId]);
}