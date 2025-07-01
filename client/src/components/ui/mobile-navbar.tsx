import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  Search,
  Bell,
  LogOut
} from "lucide-react";
import { useAuth } from "@/modules/auth";
import { useWorkflowPermissions } from "@/hooks/use-workflow-permissions";
import { useLocationContext } from "@/contexts/location-context";
import { NavigationRenderer } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MobileNavbar() {
  const [open, setOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { hasWorkflowAccess, hasPermission } = useWorkflowPermissions();
  const { selectedLocationId, setSelectedLocationId } = useLocationContext();
  const [serverAuthData, setServerAuthData] = useState<{
    authenticated: boolean;
    user: any;
  }>({
    authenticated: false,
    user: null
  });
  
  // Direct server-side check for user data to ensure we have accurate role information
  useEffect(() => {
    const checkServerAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setServerAuthData(data);
          }
        }
      } catch (error) {
        console.error("Error checking server auth in mobile navbar:", error);
      }
    };
    
    checkServerAuth();
  }, []);
  
  // Use server auth data for role checks
  const effectiveUser = serverAuthData.user || user;
  
  const isActive = (path: string) => location === path;
  

  
  // Format user role for display
  const formatRole = (role: string) => {
    if (!role) return '';
    return role.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };
  
  // Direct server-side logout that bypasses the React state issues
  const handleLogout = () => {
    console.log("Using direct server-side logout from mobile navbar");
    // Navigate directly to the dev-logout endpoint
    window.location.href = "/api/auth/dev-logout";
  };
  
  // Navigation handler to avoid nested <a> tag issues
  const navigateTo = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <div className="md:hidden bg-primary-800 text-white p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">Crew Plots Pro</h1>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 bg-primary-800 text-white border-r border-primary-700">
          <div className="flex flex-col h-full">
            <div className="p-4 flex items-center justify-between border-b border-primary-700">
              <h1 className="text-xl font-bold">Crew Plots Pro</h1>
              <Button variant="ghost" size="icon" className="text-white" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="overflow-y-auto flex-grow">
              <nav className="mt-5 px-2">
                <div className="text-white mt-4 space-y-1">
                  <NavigationRenderer
                    layout="mobile"
                    onNavigate={navigateTo}
                    onMobileClose={() => setOpen(false)}
                    currentPath={location}
                    serverAuthData={serverAuthData}
                  />
                </div>
              </nav>
            </div>
            
            <div className="p-4 border-t border-primary-700">
              <div className="flex items-center">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.name}`} alt={user?.name || "User"} />
                  <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs font-medium text-primary-300">
                    {effectiveUser?.role ? formatRole(effectiveUser.role) : ""}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="ml-auto text-primary-300 hover:text-white hover:bg-primary-700"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
