import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Alert, 
  AlertDescription 
} from "@/components/ui/alert";

interface CashManagementSummaryProps {
  locationId?: number;
}

interface CashCount {
  id: number;
  locationId: number;
  countDate: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const CashManagementSummary = ({ locationId }: CashManagementSummaryProps) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Fetch cash counts for today
  const { data: cashCounts, isLoading } = useQuery<CashCount[]>({
    queryKey: ['/api/cash-counts/location', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const response = await fetch(`/api/cash-counts/location/${locationId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch cash counts');
      }
      return response.json();
    },
    enabled: !!locationId,
  });

  // Get the most recent cash count
  const latestCashCount = cashCounts
    ? [...cashCounts]
        .filter(count => new Date(count.countDate).toISOString().split('T')[0] === todayStr)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : undefined;

  // Format the last update time
  const formatLastUpdateTime = () => {
    if (!latestCashCount) return "No data available";
    
    const updateTime = new Date(latestCashCount.createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - updateTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return updateTime.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">Loading cash data...</div>
        </CardContent>
      </Card>
    );
  }

  const hasCompletedCount = latestCashCount && latestCashCount.status === 'completed';
  const needsAttention = !latestCashCount || latestCashCount.status === 'pending';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Alert */}
          {needsAttention ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Cash count needs attention for today
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Today's cash count completed
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Information */}
          <div className="space-y-2">
            {latestCashCount ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Amount:</span>
                  <span className="text-lg font-bold">
                    ${latestCashCount.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Updated:</span>
                  <span className="text-sm">{formatLastUpdateTime()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className={`text-sm font-medium ${
                    latestCashCount.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {latestCashCount.status.charAt(0).toUpperCase() + latestCashCount.status.slice(1)}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No cash counts recorded for today
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href="/cash-management">
            {latestCashCount ? 'Manage Cash Counts' : 'Start Cash Count'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};