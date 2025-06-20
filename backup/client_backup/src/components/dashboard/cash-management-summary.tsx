import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle } from "lucide-react";
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
import { CashCount } from "@shared/schema";

interface CashManagementSummaryProps {
  locationId: number;
}

export function CashManagementSummary({ locationId }: CashManagementSummaryProps) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Fetch cash counts for today
  const { data: cashCounts, isLoading } = useQuery<CashCount[]>({
    queryKey: ['/api/cash-counts/location', locationId],
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
    
    const date = new Date(latestCashCount.createdAt);
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Check if cash reconciliation was successful
  const isReconciled = latestCashCount && Math.abs(Number(latestCashCount.discrepancy)) < 10;

  // Format currency
  const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    return `$${Number(value).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Management</CardTitle>
          <p className="mt-1 text-sm text-gray-500">Loading cash data...</p>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center">
            <p>Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <CardTitle className="text-lg font-medium text-gray-900">
          Cash Management
        </CardTitle>
        <p className="mt-1 text-sm text-gray-500">
          Last update: {formatLastUpdateTime()}
        </p>
      </CardHeader>
      <CardContent className="p-4">
        {latestCashCount ? (
          <>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">
                  Cash Register
                </dt>
                <dd className="mt-1 text-lg font-medium text-gray-900">
                  {formatCurrency(latestCashCount.cashAmount)}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">
                  Card Payments
                </dt>
                <dd className="mt-1 text-lg font-medium text-gray-900">
                  {formatCurrency(latestCashCount.cardAmount)}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">
                  Float Amount
                </dt>
                <dd className="mt-1 text-lg font-medium text-gray-900">
                  {formatCurrency(latestCashCount.floatAmount)}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">
                  Daily Turnover
                </dt>
                <dd className="mt-1 text-lg font-medium text-success">
                  {formatCurrency(
                    Number(latestCashCount.cashAmount) + 
                    Number(latestCashCount.cardAmount) - 
                    Number(latestCashCount.floatAmount)
                  )}
                </dd>
              </div>
            </dl>
            <div className="mt-5">
              {isReconciled ? (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <AlertDescription className="ml-3 text-sm font-medium">
                    All counts reconciled successfully.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                  <AlertDescription className="text-sm font-medium">
                    Discrepancy of {formatCurrency(latestCashCount.discrepancy)} detected.
                    Please verify and recount.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p>No cash counts recorded for today</p>
            <Link href="/cash-management/new">
              <Button variant="outline" className="mt-2">
                Record Cash Count
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-gray-50 px-4 py-4 sm:px-6">
        <Link href="/cash-management">
          <Button variant="outline" size="sm" className="text-primary-700 bg-primary-100 hover:bg-primary-200">
            View details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
