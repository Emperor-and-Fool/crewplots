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
  subtitle?: string;
  icon: React.ReactNode;
  link?: {
    text: string;
    href: string;
  };
  className?: string;
  onClick?: () => void;
}

export interface LocationSummaryProps {
  locationId: number;
}