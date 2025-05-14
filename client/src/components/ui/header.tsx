import { useState, useEffect } from "react";
import { Search, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Location } from "@shared/schema";

interface HeaderProps {
  className?: string;
  onLocationChange?: (locationId: number) => void;
}

export function Header({ className, onLocationChange }: HeaderProps) {
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  
  // Direct server-side logout that bypasses the React state issues
  const handleLogout = () => {
    console.log("Using direct server-side logout from header");
    // Navigate directly to the dev-logout endpoint
    window.location.href = "/api/auth/dev-logout";
  };

  // Fetch locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    enabled: user?.role === "manager" || user?.role === "floor_manager"
  });

  // If user is a floor manager, filter only their location
  const availableLocations = user?.role === "floor_manager" && user?.locationId
    ? locations?.filter(loc => loc.id === user.locationId)
    : locations;

  // Set first location as default when data is loaded
  useEffect(() => {
    if (availableLocations && availableLocations.length > 0 && !selectedLocation) {
      setSelectedLocation(String(availableLocations[0].id));
      if (onLocationChange) {
        onLocationChange(availableLocations[0].id);
      }
    }
  }, [availableLocations, selectedLocation, onLocationChange]);

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    if (onLocationChange) {
      onLocationChange(Number(value));
    }
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex-1 flex">
          <div className="w-full flex md:ml-0">
            <label htmlFor="search" className="sr-only">Search</label>
            <div className="relative w-full text-gray-400 focus-within:text-gray-600">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none pl-3">
                <Search className="h-5 w-5" />
              </div>
              <Input
                id="search"
                className="block w-full h-full pl-10 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                placeholder="Search"
                type="search"
              />
            </div>
          </div>
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          {/* Location Selector */}
          {availableLocations && availableLocations.length > 0 && (
            <div className="mr-3">
              <Select value={selectedLocation} onValueChange={handleLocationChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Notification button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-6 w-6 text-gray-400" />
                <span className="sr-only">View notifications</span>
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px]">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-auto">
                <DropdownMenuItem className="cursor-pointer">
                  <div className="flex flex-col">
                    <span className="font-medium">New applicant</span>
                    <span className="text-sm text-gray-500">Riley Johnson applied for Bar Staff</span>
                    <span className="text-xs text-gray-400 mt-1">2 minutes ago</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <div className="flex flex-col">
                    <span className="font-medium">Schedule published</span>
                    <span className="text-sm text-gray-500">Next week's schedule has been published</span>
                    <span className="text-xs text-gray-400 mt-1">1 hour ago</span>
                  </div>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-2">
                <span className="sr-only">Open user menu</span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${user?.name}`} alt={user?.name || "User"} />
                  <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
