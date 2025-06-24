import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LocationContextType {
  selectedLocationId: number | null;
  setSelectedLocationId: (locationId: number | null) => void;
  isAllLocations: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

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

  return (
    <LocationContext.Provider
      value={{
        selectedLocationId,
        setSelectedLocationId,
        isAllLocations,
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