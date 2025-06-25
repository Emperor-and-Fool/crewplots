import { WeeklySchedule } from "../../../../components/dashboard/weekly-schedule";
import { LocationSummaryProps } from "../../types/dashboard.types";

// Direct re-export with type compatibility for gradual migration
export const WeeklySummary = ({ locationId }: LocationSummaryProps) => {
  return <WeeklySchedule locationId={locationId} />;
};