import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, RefreshCw, AlertTriangle } from "lucide-react";
import { useLogout } from "@/modules/users/hooks/useLogout";
import { useAuth } from "@/modules/auth";

export function EmergencyLogout() {
  const { logout, isLoggingOut } = useLogout();
  const { user } = useAuth();
  
  const handleLogout = () => {
    console.log("Using AuthService logout from emergency component");
    logout(); // Delegates to service layer
  };

  const handleDevLogout = () => {
    console.log("Emergency dev-logout triggered via Ctrl+Shift+L");
    window.location.href = "/api/auth/dev-logout";
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Add keyboard shortcut for administrators: Ctrl+Shift+L = dev-logout
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        if (user?.role === 'administrator') {
          console.log("Administrator emergency dev-logout shortcut activated");
          handleDevLogout();
        } else {
          console.log("Dev-logout shortcut available for administrators only");
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user?.role]);

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
          {user?.role === 'administrator' && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Admin shortcut: Ctrl+Shift+L for emergency dev-logout
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleRefresh} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Page
          </Button>
          <Button variant="outline" onClick={handleLogout} className="w-full" disabled={isLoggingOut}>
            <LogOut className="w-4 h-4 mr-2" />
            {isLoggingOut ? 'Logging out...' : 'Logout & Restart'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}