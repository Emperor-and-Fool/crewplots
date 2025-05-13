import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Calendar,
  UserPlus,
  DollarSign,
  Book,
  BarChart,
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

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
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
    effectiveUser
  });
  
  const isActive = (path: string) => location === path;
  
  // Only managers can access locations page
  const canAccessLocations = effectiveUser?.role === "manager";
  
  // Managers and floor managers can access these pages
  const canAccessManagementPages = ["manager", "floor_manager"].includes(effectiveUser?.role || "");
  
  // Force enable all menu items for now to debug visibility issue
  const forceEnableAll = true;
  
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
      "hidden md:flex md:flex-col w-64 bg-gray-800 text-white",
      className
    )}>
      <div className="p-4 flex items-center border-b border-gray-700">
        <h1 className="text-xl font-bold">ShiftPro</h1>
      </div>
      
      <div className="overflow-y-auto flex-grow scrollbar-hide">
        <nav className="mt-5 px-2">
          <div className="space-y-1">
            {/* Dashboard */}
            <Link 
              href="/dashboard" 
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                isActive("/dashboard") ? "bg-primary-700" : "hover:bg-primary-700"
              )}
            >
              <LayoutDashboard className="h-5 w-5 mr-3" />
              Dashboard
            </Link>
            
            {/* Locations - Manager only */}
            {(canAccessLocations || forceEnableAll) && (
              <Accordion type="single" collapsible className="border-0">
                <AccordionItem value="locations" className="border-0">
                  <AccordionTrigger className="py-0">
                    <div className={cn(
                      "w-full flex items-center px-2 py-2 text-sm font-medium rounded-md",
                      isActive("/locations") ? "bg-primary-700" : "hover:bg-primary-700"
                    )}>
                      <MapPin className="h-5 w-5 mr-3" />
                      Locations
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-1 px-2">
                    <ul className="pl-8">
                      <li>
                        <Link 
                          href="/locations/create"
                          className="block py-1 text-sm text-primary-200 hover:text-white"
                        >
                          Create Location
                        </Link>
                      </li>
                      <li>
                        <Link 
                          href="/locations"
                          className="block py-1 text-sm text-primary-200 hover:text-white"
                        >
                          Manage Locations
                        </Link>
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            
            {/* Staff Management */}
            {(canAccessManagementPages || forceEnableAll) && (
              <Accordion type="single" collapsible className="border-0">
                <AccordionItem value="staff" className="border-0">
                  <AccordionTrigger className="py-0">
                    <div className={cn(
                      "w-full flex items-center px-2 py-2 text-sm font-medium rounded-md",
                      isActive("/staff-management") ? "bg-primary-700" : "hover:bg-primary-700"
                    )}>
                      <Users className="h-5 w-5 mr-3" />
                      Staff Management
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-1 px-2">
                    <ul className="pl-8">
                      <li>
                        <Link 
                          href="/staff-management/create"
                          className="block py-1 text-sm text-primary-200 hover:text-white"
                        >
                          Add Staff
                        </Link>
                      </li>
                      <li>
                        <Link 
                          href="/staff-management/competencies"
                          className="block py-1 text-sm text-primary-200 hover:text-white"
                        >
                          Competencies
                        </Link>
                      </li>
                      <li>
                        <Link 
                          href="/staff-management"
                          className="block py-1 text-sm text-primary-200 hover:text-white"
                        >
                          Staff List
                        </Link>
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            
            {/* Scheduling */}
            {(canAccessManagementPages || forceEnableAll) && (
              <Accordion type="single" collapsible className="border-0">
                <AccordionItem value="scheduling" className="border-0">
                  <AccordionTrigger className="py-0">
                    <div className={cn(
                      "w-full flex items-center px-2 py-2 text-sm font-medium rounded-md",
                      isActive("/scheduling") ? "bg-primary-700" : "hover:bg-primary-700"
                    )}>
                      <Calendar className="h-5 w-5 mr-3" />
                      Scheduling
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-1 px-2">
                    <ul className="pl-8">
                      <li>
                        <Link 
                          href="/scheduling/templates"
                          className="block py-1 text-sm text-primary-200 hover:text-white"
                        >
                          Templates
                        </Link>
                      </li>
                      <li>
                        <Link 
                          href="/scheduling/new"
                          className="block py-1 text-sm text-primary-200 hover:text-white"
                        >
                          Create Schedule
                        </Link>
                      </li>
                      <li>
                        <Link 
                          href="/scheduling"
                          className="block py-1 text-sm text-primary-200 hover:text-white"
                        >
                          View Calendar
                        </Link>
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            
            {/* Applicants */}
            {(canAccessManagementPages || forceEnableAll) && (
              <Link 
                href="/applicants"
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  isActive("/applicants") ? "bg-primary-700" : "hover:bg-primary-700"
                )}
              >
                <UserPlus className="h-5 w-5 mr-3" />
                Applicants
              </Link>
            )}
            
            {/* Cash Management */}
            {(canAccessManagementPages || forceEnableAll) && (
              <Link 
                href="/cash-management"
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  isActive("/cash-management") ? "bg-primary-700" : "hover:bg-primary-700"
                )}
              >
                <DollarSign className="h-5 w-5 mr-3" />
                Cash Management
              </Link>
            )}
            
            {/* Knowledge Base */}
            <Link 
              href="/knowledge-base"
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                isActive("/knowledge-base") ? "bg-primary-700" : "hover:bg-primary-700"
              )}
            >
              <Book className="h-5 w-5 mr-3" />
              Knowledge Base
            </Link>
            
            {/* Reports */}
            {canAccessManagementPages && (
              <Link 
                href="/reports"
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  isActive("/reports") ? "bg-primary-700" : "hover:bg-primary-700"
                )}
              >
                <BarChart className="h-5 w-5 mr-3" />
                Reports
              </Link>
            )}
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
              {user?.role ? formatRole(user.role) : ""}
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
