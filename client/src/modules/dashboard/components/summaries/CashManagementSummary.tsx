import { CashManagementSummary as LegacyCashManagementSummary } from "../../../../components/dashboard/cash-management-summary";

interface CashManagementSummaryProps {
  locationId?: number;
}

// Wrapper component that maintains modular architecture while using existing cash management summary
export const CashManagementSummary = ({ locationId }: CashManagementSummaryProps) => {
  return <LegacyCashManagementSummary locationId={locationId!} />;
};