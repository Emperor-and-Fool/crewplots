// Location Module Exports
// Centralized exports for all location functionality

// Components
export { default as LocationForm } from './components/LocationForm';
export { default as LocationSelector } from './components/LocationSelector';
export { default as LocationHeader } from './components/LocationHeader';

// Pages
export { default as LocationsPage } from './pages/LocationsPage';
export { default as LocationDetailPage } from './pages/LocationDetailPage';
export { default as LocationCreatePage } from './pages/LocationCreatePage';

// Hooks
export { 
  useLocationData, 
  useLocation, 
  useCreateLocation, 
  useUpdateLocation, 
  useDeleteLocation 
} from './hooks/useLocationData';
export { useLocationPermissions, useCanAccessLocation } from './hooks/useLocationPermissions';
export { useLocationActions } from './hooks/useLocationActions';

// Types
export type * from './types/location.types';