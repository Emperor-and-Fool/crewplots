// Location Module Types
// Additional types specific to location module functionality

import type { Location } from '@shared/schema';

export interface LocationWithStats extends Location {
  staffCount?: number;
  applicantCount?: number;
  activeShifts?: number;
}

export interface LocationFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber?: string;
  email?: string;
  description?: string;
}

export interface LocationPermissions {
  canView: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
}

export interface LocationContextState {
  selectedLocationId: number | null;
  isAllLocations: boolean;
  availableLocations: Location[];
}