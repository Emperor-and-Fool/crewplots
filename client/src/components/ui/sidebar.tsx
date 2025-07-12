import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/modules/auth";
import { useWorkflowPermissions } from "@/hooks/use-workflow-permissions";
import { useLocationContext } from "@/contexts/location-context";
import { NavigationRenderer } from "@/components/navigation";
import { SessionSyncIndicator } from "@/components/auth/SessionSyncIndicator";

import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

interface SidebarProps {
  className?: string;
}

// Custom navigation item that works with Accordion
const NavItem = ({ icon, label, isActive, onClick }) => (
  <div
    className={cn(
      "w-full flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer",
      isActive ? "bg-primary-700" : "hover:bg-primary-700"
    )}
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </div>
);

export function Sidebar({ className }: SidebarProps) {
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
  
  // State to control accordion collapse on navigation
  const [accordionResetKey, setAccordionResetKey] = useState(0);
  
  // REMOVED: Direct server auth check to eliminate cascade - use AuthContext instead
  
  // Use server auth data for role checks
  const effectiveUser = serverAuthData.user || user;
  
  // Debug log to verify the user role
  console.log("Sidebar user data:", { 
    serverUser: serverAuthData.user, 
    reactUser: user, 
    effectiveUser,
    adminCheck: effectiveUser?.role === 'administrator',
    roleValue: effectiveUser?.role
  });
  
  const isActive = (path: string) => location === path;
  

  
  // Format user role for display
  const formatRole = (role: string) => {
    return role.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };
  
  // Enhanced navigation handler that closes accordions
  const handleNavigate = (path: string) => {
    console.log('🎯 Sidebar navigation to:', path);
    navigate(path);
    
    // Force accordion reset by changing key - this closes all expanded sections
    if (path === '/' || path === '/dashboard') {
      console.log('📁 Resetting accordions for dashboard navigation');
      setAccordionResetKey(prev => prev + 1);
    }
  };

  // Direct server-side logout that bypasses the React state issues
  const handleLogout = () => {
    console.log("Using direct server-side logout");
    // Navigate directly to the dev-logout endpoint
    window.location.href = "/api/auth/dev-logout";
  };

  return (
    <aside className={cn(
      "hidden md:flex md:flex-col w-64 bg-primary-900 text-white",
      className
    )}>
      <div className="p-4 flex items-center border-b border-primary-700">
        <h1 
          className="text-xl font-bold cursor-pointer hover:text-primary-200 transition-colors"
          onClick={() => handleNavigate("/")}
        >
          Crew Plots Pro
        </h1>
      </div>
      
      <div className="overflow-y-auto flex-grow scrollbar-hide">
        <nav className="mt-5 px-2">
          <div key={accordionResetKey}>
            <NavigationRenderer
              layout="desktop"
              onNavigate={handleNavigate}
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
            <p className="text-xs font-medium text-primary-200">
              {effectiveUser?.role ? formatRole(effectiveUser.role) : ""}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto text-primary-200 hover:text-white hover:bg-primary-700"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Session Sync Indicator */}
        <div className="mt-3 pt-3 border-t border-primary-700/50">
          <SessionSyncIndicator />
        </div>
      </div>
    </aside>
  );
}
