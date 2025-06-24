import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import { useWorkflowPermissions } from "@/hooks/use-workflow-permissions";

/**
 * Development warning banner for administrator bypass mode
 * Only displays in non-Docker development environments
 */
export const AdminBypassWarning = () => {
  const { isSuperuser } = useWorkflowPermissions();

  if (!isSuperuser) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50 text-orange-800 mb-4">
      <Shield className="h-4 w-4" />
      <AlertDescription>
        <strong>Development Mode:</strong> Administrator bypass active. All permissions enabled for testing. 
        This feature is automatically disabled in production environments.
      </AlertDescription>
    </Alert>
  );
};