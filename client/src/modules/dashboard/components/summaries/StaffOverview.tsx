import { StaffOverview as LegacyStaffOverview } from "../../../../components/dashboard/staff-overview";

interface StaffOverviewProps {
  locationId: number;
}

// Wrapper component that maintains modular architecture while using existing staff overview
export const StaffOverview = ({ locationId }: StaffOverviewProps) => {
  return <LegacyStaffOverview locationId={locationId} />;
};