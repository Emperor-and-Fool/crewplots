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

  const activeLocations = locations?.filter(loc => loc.status === 'active') || [];

  return (
    <div className="py-2">
      <div className="text-xs font-semibold text-primary-200 uppercase tracking-wide mb-2">
        Select Location
      </div>
      
      <div className="space-y-1">
        {/* All Locations Option */}
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