import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export const AuthDevelopmentTools = () => {
  const { user, logout } = useAuth();

  if (import.meta.env.PROD) {
    return null; // Hide in production
  }

  const handleForceLogout = async () => {
    try {
      await logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Force logout failed:", error);
    }
  };

  return (
    <Card className="mt-4 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-sm text-orange-800">Development Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-gray-600">
          Current User: {user?.username || "Not authenticated"}
        </div>
        <div className="text-xs text-gray-600">
          Role: {user?.role || "None"}
        </div>
        {user && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleForceLogout}
            className="text-xs"
          >
            Force Logout
          </Button>
        )}
      </CardContent>
    </Card>
  );
};