import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/modules/auth";
import { useWorkflowPermissions } from "@/hooks/use-workflow-permissions";
import { useLocationContext } from "@/contexts/location-context";
import { NavigationRenderer } from "@/components/navigation";

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
        console.error("Error checking server auth in sidebar:", error);
      }
    };
    
    checkServerAuth();
  }, []);
  
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
          onClick={() => navigate("/")}
        >
          Crew Plots Pro
        </h1>
      </div>
      
      <div className="overflow-y-auto flex-grow scrollbar-hide">
        <nav className="mt-5 px-2">
          <NavigationRenderer
            layout="desktop"
            onNavigate={navigate}
            currentPath={location}
            serverAuthData={serverAuthData}
          />
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
      </div>
    </aside>
  );
}
