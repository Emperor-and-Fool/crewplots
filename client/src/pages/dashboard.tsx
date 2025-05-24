import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/topbar";
import { KPICards } from "@/components/kpi-cards";
import { Charts } from "@/components/charts";
import { RecentReservations } from "@/components/recent-reservations";
import { QuickActions } from "@/components/quick-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: api.getDashboardMetrics,
  });

  const { data: recentReservations, isLoading: reservationsLoading, error: reservationsError } = useQuery({
    queryKey: ["/api/reservations/recent"],
    queryFn: () => api.getRecentReservations(5),
  });

  if (metricsError || reservationsError) {
    return (
      <div className="p-6">
        <TopBar />
        <div className="mt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load dashboard data. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar />
      <div className="p-6">
        {/* KPI Cards */}
        {metricsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : metrics ? (
          <KPICards metrics={metrics} />
        ) : null}

        {/* Charts */}
        {metricsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        ) : metrics ? (
          <Charts roomStatusCounts={metrics.roomStatusCounts} />
        ) : null}

        {/* Recent Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Reservations */}
          <div className="lg:col-span-2">
            {reservationsLoading ? (
              <Skeleton className="h-96" />
            ) : recentReservations ? (
              <RecentReservations reservations={recentReservations} />
            ) : null}
          </div>

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
