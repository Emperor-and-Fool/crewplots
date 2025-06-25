import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AuthDevelopmentToolsProps } from "../../types/auth-ui.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export const AuthDevelopmentTools = ({ 
  onAutoLogin, 
  showDebugForm = true 
}: AuthDevelopmentToolsProps) => {
  const [autoLoginLoading, setAutoLoginLoading] = useState(false);
  const { login } = useAuth();

  // Auto-login handler
  const handleAutoLogin = async () => {
    try {
      setAutoLoginLoading(true);
      console.log("Auto-login triggered");
      
      const success = await login("admin", "adminpass123");
      console.log("Auto-login result:", success);
      
      if (success) {
        console.log("Auto-login successful");
        onAutoLogin?.();
      } else {
        console.error("Auto-login failed");
      }
    } catch (error) {
      console.error("Auto-login error:", error);
    } finally {
      setAutoLoginLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <Button
        type="button"
        variant="outline"
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
        onClick={handleAutoLogin}
        disabled={autoLoginLoading}
      >
        {autoLoginLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Auto-Login in progress...
          </>
        ) : (
          "Auto-Login (Development)"
        )}
      </Button>
      <div className="mt-2 text-xs text-center text-gray-500">
        This will automatically log you in with admin credentials for development purposes.
      </div>
      
      {showDebugForm && (
        <div className="mt-4 border-t pt-4">
          <h3 className="font-medium text-center mb-2">Direct Login Form (Debug)</h3>
          <form
            action="/api/auth/login"
            method="post"
            className="space-y-2"
            encType="application/x-www-form-urlencoded"
          >
            <div>
              <label className="text-xs text-gray-700">Username</label>
              <Input name="username" defaultValue="admin" />
            </div>
            <div>
              <label className="text-xs text-gray-700">Password</label>
              <Input name="password" type="password" defaultValue="adminpass123" />
            </div>
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              Direct Form Submit (Debug)
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};