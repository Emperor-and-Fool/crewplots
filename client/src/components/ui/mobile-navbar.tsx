import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  Menu,
  X,
  LayoutDashboard,
  MapPin,
  Users,
  Calendar,
  UserPlus,
  DollarSign,
  Book,
  BarChart,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MobileNavbar() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();
  
  const isActive = (path: string) => location === path;
  
  // Only managers can access locations page
  const canAccessLocations = user?.role === "manager";
  
  // Managers and floor managers can access these pages
  const canAccessManagementPages = ["manager", "floor_manager"].includes(user?.role || "");
  
  // Format user role for display
  const formatRole = (role: string) => {
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

  return (
    <div className="md:hidden bg-primary-800 text-white p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">ShiftPro</h1>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 bg-primary-800 text-white border-r border-primary-700">
          <div className="flex flex-col h-full">
            <div className="p-4 flex items-center justify-between border-b border-primary-700">
              <h1 className="text-xl font-bold">ShiftPro</h1>
              <Button variant="ghost" size="icon" className="text-white" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="overflow-y-auto flex-grow">
              <nav className="mt-5 px-2">
                <div className="space-y-2">
                  {/* Dashboard */}
                  <Link href="/dashboard">
                    <a 
                      className={cn(
                        "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                        isActive("/dashboard") ? "bg-primary-700" : "hover:bg-primary-700"
                      )}
                      onClick={() => setOpen(false)}
                    >
                      <LayoutDashboard className="h-5 w-5 mr-3" />
                      Dashboard
                    </a>
                  </Link>
                  
                  {/* Locations - Manager only */}
                  {canAccessLocations && (
                    <Link href="/locations">
                      <a 
                        className={cn(
                          "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                          isActive("/locations") ? "bg-primary-700" : "hover:bg-primary-700"
                        )}
                        onClick={() => setOpen(false)}
                      >
                        <MapPin className="h-5 w-5 mr-3" />
                        Locations
                      </a>
                    </Link>
                  )}
                  
                  {/* Staff Management */}
                  {canAccessManagementPages && (
                    <Link href="/staff-management">
                      <a 
                        className={cn(
                          "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                          isActive("/staff-management") ? "bg-primary-700" : "hover:bg-primary-700"
                        )}
                        onClick={() => setOpen(false)}
                      >
                        <Users className="h-5 w-5 mr-3" />
                        Staff Management
                      </a>
                    </Link>
                  )}
                  
                  {/* Scheduling */}
                  {canAccessManagementPages && (
                    <Link href="/scheduling">
                      <a 
                        className={cn(
                          "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                          isActive("/scheduling") ? "bg-primary-700" : "hover:bg-primary-700"
                        )}
                        onClick={() => setOpen(false)}
                      >
                        <Calendar className="h-5 w-5 mr-3" />
                        Scheduling
                      </a>
                    </Link>
                  )}
                  
                  {/* Applicants */}
                  {canAccessManagementPages && (
                    <Link href="/applicants">
                      <a 
                        className={cn(
                          "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                          isActive("/applicants") ? "bg-primary-700" : "hover:bg-primary-700"
                        )}
                        onClick={() => setOpen(false)}
                      >
                        <UserPlus className="h-5 w-5 mr-3" />
                        Applicants
                      </a>
                    </Link>
                  )}
                  
                  {/* Cash Management */}
                  {canAccessManagementPages && (
                    <Link href="/cash-management">
                      <a 
                        className={cn(
                          "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                          isActive("/cash-management") ? "bg-primary-700" : "hover:bg-primary-700"
                        )}
                        onClick={() => setOpen(false)}
                      >
                        <DollarSign className="h-5 w-5 mr-3" />
                        Cash Management
                      </a>
                    </Link>
                  )}
                  
                  {/* Knowledge Base */}
                  <Link href="/knowledge-base">
                    <a 
                      className={cn(
                        "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                        isActive("/knowledge-base") ? "bg-primary-700" : "hover:bg-primary-700"
                      )}
                      onClick={() => setOpen(false)}
                    >
                      <Book className="h-5 w-5 mr-3" />
                      Knowledge Base
                    </a>
                  </Link>
                  
                  {/* Reports */}
                  {canAccessManagementPages && (
                    <Link href="/reports">
                      <a 
                        className={cn(
                          "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                          isActive("/reports") ? "bg-primary-700" : "hover:bg-primary-700"
                        )}
                        onClick={() => setOpen(false)}
                      >
                        <BarChart className="h-5 w-5 mr-3" />
                        Reports
                      </a>
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
                  <p className="text-xs font-medium text-primary-300">
                    {user?.role ? formatRole(user.role) : ""}
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
