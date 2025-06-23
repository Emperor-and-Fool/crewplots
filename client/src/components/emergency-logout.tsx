import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, RefreshCw, AlertTriangle } from "lucide-react";

export function EmergencyLogout() {
  const handleLogout = () => {
    window.location.href = "/api/auth/dev-logout";
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-xl">Page Loading Issue</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The application is having trouble loading. Try refreshing or logging out to start fresh.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleRefresh} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Page
          </Button>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Logout & Restart
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}