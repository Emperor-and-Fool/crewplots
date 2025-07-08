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

  // DISABLED: Mock return to prevent phantom session creation
  console.error('🚨 RED ALERT: LocationContext attempting to load locations - MOCK ACTIVE');
  const locations: Location[] = [
    {
      id: 999,
      name: '🚨 MOCK LOCATION - AUTH DEBUG MODE',
      address: 'Mock Address',
      public_id: 'mock-999',
      contactEmail: 'mock@test.com',
      contactPhone: '+31000000000',
      status: 'active',
      logoUrl: null,
      description: 'Mock location for debugging session issues',
      createdAt: new Date(),
      settings: {}
    }
  ];
  const isLoading = false;

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