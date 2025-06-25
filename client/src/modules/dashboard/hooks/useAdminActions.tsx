import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { dashboardService } from "../services/dashboardService";

export const useAdminActions = () => {
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const clearAllSessions = useCallback(async () => {
    if (!user || user.role !== 'administrator') {
      toast({
        title: "Access Denied",
        description: "Only administrators can clear sessions",
        variant: "destructive"
      });
      return;
    }
    
    if (confirm("Are you sure you want to clear ALL sessions? This will log out all users.")) {
      setIsClearing(true);
      try {
        const response = await dashboardService.clearAllSessions();
        const data = await response.json();
        
        if (response.ok) {
          toast({
            title: "Success",
            description: "All sessions have been cleared",
          });
        } else {
          throw new Error(data.message || 'Failed to clear sessions');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to clear sessions',
          variant: "destructive"
        });
      } finally {
        setIsClearing(false);
      }
    }
  }, [user, toast]);

  return { clearAllSessions, isClearing };
};