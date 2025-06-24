import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { MapPin, Building2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Location } from '@shared/schema';

interface LocationSelectorProps {
  currentLocationId?: number | null;
  onLocationChange?: (locationId: number | null) => void;
}

export function LocationSelector({ currentLocationId, onLocationChange }: LocationSelectorProps) {
  const [, navigate] = useLocation();

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

  const handleLocationSelect = (locationId: number | null) => {
    onLocationChange?.(locationId);
    // For now, just navigate to dashboard with location context
    // Later we can implement location-specific routing
    if (locationId) {
      navigate('/dashboard');
    }
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

  const activeLocations = locations?.filter(loc => loc.status === 'active') || [];

  return (
    <div className="px-3 py-2 border-b border-primary-600">
      <div className="text-xs font-semibold text-primary-100 uppercase tracking-wide mb-2">
        Locations
      </div>
      
      <div className="space-y-1">
        {/* All Locations Option */}
        <button
          onClick={() => handleLocationSelect(null)}
          className={cn(
            "w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
            currentLocationId === null
              ? "bg-primary-700 text-white"
              : "text-primary-100 hover:bg-primary-700 hover:text-white"
          )}
        >
          <Globe className="mr-3 h-4 w-4" />
          All Locations
        </button>

        {/* Individual Locations */}
        {activeLocations.map((location) => (
          <button
            key={location.id}
            onClick={() => handleLocationSelect(location.id)}
            className={cn(
              "w-full flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
              currentLocationId === location.id
                ? "bg-primary-700 text-white"
                : "text-primary-100 hover:bg-primary-700 hover:text-white"
            )}
            title={location.address || location.name}
          >
            <Building2 className="mr-3 h-4 w-4" />
            <span className="truncate">{location.name}</span>
          </button>
        ))}
        
        {/* No locations state */}
        {activeLocations.length === 0 && (
          <div className="px-2 py-2 text-sm text-primary-200 italic">
            No active locations
          </div>
        )}
      </div>
    </div>
  );
}