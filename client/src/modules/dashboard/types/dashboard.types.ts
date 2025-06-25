// Dashboard module types - UI-only extensions of schema types
export interface DashboardStats {
  totalApplicants: number;
  totalStaff: number;
  shiftsThisWeek: number;
  hoursScheduled: number;
}

export interface DashboardFilters {
  selectedLocationId?: number;
  isAllLocations: boolean;
  assignedLocationIds: number[];
  isLocationRestricted: boolean;
}

export interface AdminActions {
  clearAllSessions: () => Promise<void>;
  isClearing: boolean;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

export interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  className?: string;
}

export interface LocationSummaryProps {
  locationId: number;
}