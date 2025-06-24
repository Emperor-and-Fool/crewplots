import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocationContext } from '@/contexts/location-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Location } from '@shared/schema';

interface LocationButtonProps {
  onLocationChange?: (locationId: number | null) => void;
  className?: string;
}

export function LocationButton({ onLocationChange, className }: LocationButtonProps) {
  const { selectedLocationId, setSelectedLocationId, isAllLocations } = useLocationContext();

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
    setSelectedLocationId(locationId);
    onLocationChange?.(locationId);
  };

  const getCurrentLocationName = () => {
    if (isAllLocations) return "All Locations";
    if (selectedLocationId && locations) {
      const current = locations.find(loc => loc.id === selectedLocationId);
      return current ? current.name : "Select Location";
    }
    return "Select Location";
  };

  const getCurrentIcon = () => {
    return isAllLocations ? Globe : Building2;
  };

  const activeLocations = locations?.filter(loc => loc.status === 'active') || [];

  if (isLoading) {
    return (
      <Button variant="outline" disabled className={className}>
        Loading...
      </Button>
    );
  }

  const Icon = getCurrentIcon();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("justify-between", className)}>
          <div className="flex items-center">
            <Icon className="mr-2 h-4 w-4" />
            <span className="truncate">{getCurrentLocationName()}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* All Locations Option */}
        <DropdownMenuItem
          onClick={() => handleLocationSelect(null)}
          className="flex items-center"
        >
          <Globe className="mr-2 h-4 w-4" />
          <span className="font-medium">All Locations</span>
          {isAllLocations && <span className="ml-auto text-primary-600">✓</span>}
        </DropdownMenuItem>
        
        {/* Individual Locations */}
        {activeLocations.map((location) => (
          <DropdownMenuItem
            key={location.id}
            onClick={() => handleLocationSelect(location.id)}
            className="flex items-center"
          >
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">{location.name}</span>
            {selectedLocationId === location.id && (
              <span className="ml-auto text-primary-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
        
        {/* No locations state */}
        {activeLocations.length === 0 && (
          <DropdownMenuItem disabled>
            No locations created yet
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}