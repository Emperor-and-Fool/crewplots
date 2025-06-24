import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Location } from '@shared/schema';

interface LocationContextType {
  selectedLocationId: number | null;
  selectedLocation: Location | null;
  setSelectedLocationId: (locationId: number | null) => void;
  isAllLocations: boolean;
  getCurrentLocation: () => Location | null;
  getLocationName: () => string;
  getLocationLogo: () => string | null;
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  // Fetch all locations to get location details
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

  // Get the currently selected location object
  const selectedLocation = selectedLocationId && locations 
    ? locations.find(loc => loc.id === selectedLocationId) || null 
    : null;

  // Load from session storage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('selectedLocationId');
    if (saved && saved !== 'null') {
      const locationId = parseInt(saved, 10);
      setSelectedLocationId(locationId);
    }
  }, []);

  // Save to session storage when changed
  useEffect(() => {
    sessionStorage.setItem('selectedLocationId', String(selectedLocationId));
  }, [selectedLocationId]);

  const isAllLocations = selectedLocationId === null;

  // Helper methods
  const getCurrentLocation = () => selectedLocation;
  
  const getLocationName = () => {
    if (!selectedLocation) return 'No Location Selected';
    return selectedLocation.name;
  };
  
  const getLocationLogo = () => {
    if (!selectedLocation) return null;
    return selectedLocation.logoUrl;
  };

  return (
    <LocationContext.Provider
      value={{
        selectedLocationId,
        selectedLocation,
        setSelectedLocationId,
        isAllLocations,
        getCurrentLocation,
        getLocationName,
        getLocationLogo,
        isLoading,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}