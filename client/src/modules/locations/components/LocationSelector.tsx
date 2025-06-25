import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Building2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Location } from '@shared/schema';

interface LocationSelectorProps {
  currentLocationId?: number | null;
  onLocationChange?: (locationId: number | null) => void;
}

function LocationSelector({ currentLocationId, onLocationChange }: LocationSelectorProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: locations, isLoading } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return response.json() as Location[];
    },
  });

  // Fetch user's assigned locations for role-based filtering
  const { data: userLocations } = useQuery({
    queryKey: ['/api/user-locations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/user-locations/${user.id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return []; // No assignments
        throw new Error('Failed to fetch user locations');
      }
      return response.json();
    },
    enabled: !!user?.id && (user?.role === 'crew_manager' || user?.role === 'floor_manager')
  });

  const handleLocationSelect = (locationId: number | null) => {
    onLocationChange?.(locationId);
    // Navigate to dashboard with location context
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="animate-pulse">
          <div className="h-4 bg-primary-600 rounded w-20 mb-2"></div>
          <div className="space-y-1">
            <div className="h-8 bg-primary-600 rounded"></div>
            <div className="h-8 bg-primary-600 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  let activeLocations = locations?.filter(loc => loc.status === 'active') || [];

  // Filter locations for crew managers and floor managers
  const assignedLocationIds = userLocations?.map(ul => ul.locationId) || [];
  const isLocationRestricted = (user?.role === 'crew_manager' || user?.role === 'floor_manager') && assignedLocationIds.length > 0;
  
  if (isLocationRestricted) {
    activeLocations = activeLocations.filter(loc => assignedLocationIds.includes(loc.id));
  }

  // Get current location name for button text
  const getCurrentLocationName = () => {
    if (currentLocationId === null) return "All Locations";
    const current = activeLocations.find(loc => loc.id === currentLocationId);
    return current ? current.name : "Select Location";
  };

  return (
    <div className="py-2">
      <div className="text-xs font-semibold text-primary-200 uppercase tracking-wide mb-2">
        {getCurrentLocationName()}
      </div>
      
      <div className="space-y-1">
        {/* All Locations Option - Only show for unrestricted users */}
        {!isLocationRestricted && (
          <button
            onClick={() => handleLocationSelect(null)}
            className={cn(
              "w-full flex items-center px-2 py-1 text-xs rounded-md transition-colors",
              currentLocationId === null
                ? "bg-primary-600 text-white"
                : "text-primary-200 hover:bg-primary-600 hover:text-white"
            )}
            title="View all locations combined"
          >
            <Globe className="mr-2 h-3 w-3" />
            <span className="truncate font-medium">All Locations</span>
          </button>
        )}
        
        {/* Individual Locations */}
        {activeLocations.map((location) => (
          <button
            key={location.id}
            onClick={() => handleLocationSelect(location.id)}
            className={cn(
              "w-full flex items-center px-2 py-1 text-xs rounded-md transition-colors",
              currentLocationId === location.id
                ? "bg-primary-600 text-white"
                : "text-primary-200 hover:bg-primary-600 hover:text-white"
            )}
            title={location.address || location.name}
          >
            <Globe className="mr-2 h-3 w-3" />
            <span className="truncate">{location.name}</span>
          </button>
        ))}
        
        {/* No locations state */}
        {activeLocations.length === 0 && (
          <div className="px-2 py-1 text-xs text-primary-300 italic">
            No locations created yet
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationSelector;