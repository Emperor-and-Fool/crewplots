import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Globe, ChevronDown } from 'lucide-react';
import { useLocationContext } from '@/contexts/location-context';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Location } from '@shared/schema';

function LocationHeader() {
  const { selectedLocationId, isAllLocations, setSelectedLocationId } = useLocationContext();
  const { user } = useAuth();

  const { data: locations, isLoading } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return response.json() as Location[];
    },
  });

  // Fetch user's assigned locations for role-based filtering
  const { data: userLocations } = useQuery({
    queryKey: ['/api/user-locations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/user-locations/${user.id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 404) return []; // No assignments
        throw new Error('Failed to fetch user locations');
      }
      return response.json();
    },
    enabled: !!user?.id && (user?.role === 'crew_manager' || user?.role === 'floor_manager')
  });

  const getCurrentLocation = () => {
    if (isAllLocations) return null;
    return locations?.find(loc => loc.id === selectedLocationId) || null;
  };

  const currentLocation = getCurrentLocation();
  let activeLocations = locations?.filter(loc => loc.status === 'active') || [];

  // Filter locations for crew managers and floor managers
  const assignedLocationIds = userLocations?.map(ul => ul.locationId) || [];
  const isLocationRestricted = (user?.role === 'crew_manager' || user?.role === 'floor_manager') && assignedLocationIds.length > 0;
  
  if (isLocationRestricted) {
    activeLocations = activeLocations.filter(loc => assignedLocationIds.includes(loc.id));
  }

  const getHeaderTitle = () => {
    if (isAllLocations) return "All Locations";
    if (currentLocation) return currentLocation.name;
    return "Select Location";
  };

  const getHeaderSubtitle = () => {
    if (isAllLocations) return "Combined overview across all locations";
    if (currentLocation) return "Location-specific production overview";
    return "Choose a location to view its production overview";
  };

  const getHeaderColor = () => {
    if (isAllLocations) return "blue";
    if (currentLocation) return "green";
    return "gray";
  };

  const color = getHeaderColor();
  const colorClasses = {
    blue: {
      bg: "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
      border: "border-blue-500",
      icon: "text-blue-600 dark:text-blue-400",
      title: "text-blue-900 dark:text-blue-100",
      subtitle: "text-blue-700 dark:text-blue-300",
      button: "text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-800/30"
    },
    green: {
      bg: "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
      border: "border-green-500",
      icon: "text-green-600 dark:text-green-400",
      title: "text-green-900 dark:text-green-100",
      subtitle: "text-green-700 dark:text-green-300",
      button: "text-green-900 dark:text-green-100 hover:bg-green-100 dark:hover:bg-green-800/30"
    },
    gray: {
      bg: "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700",
      border: "border-gray-400",
      icon: "text-gray-600 dark:text-gray-400",
      title: "text-gray-900 dark:text-gray-100",
      subtitle: "text-gray-700 dark:text-gray-300",
      button: "text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/30"
    }
  };

  const classes = colorClasses[color];
  const Icon = isAllLocations ? Globe : Building2;

  return (
    <div className={`${classes.bg} border-l-4 ${classes.border} p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Icon className={`h-6 w-6 ${classes.icon} mr-3`} />
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`p-0 h-auto font-semibold text-xl ${classes.button} justify-start hover:bg-transparent`}
                  disabled={isLoading}
                >
                  {getHeaderTitle()}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {/* All Locations Option - Only show for unrestricted users */}
                {!isLocationRestricted && (
                  <DropdownMenuItem
                    onClick={() => setSelectedLocationId(null)}
                    className="flex items-center"
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium">All Locations</div>
                      <div className="text-xs text-muted-foreground">Combined overview</div>
                    </div>
                    {isAllLocations && <span className="ml-auto text-primary-600">✓</span>}
                  </DropdownMenuItem>
                )}
                
                {/* Individual Locations */}
                {activeLocations.map((location) => (
                  <DropdownMenuItem
                    key={location.id}
                    onClick={() => setSelectedLocationId(location.id)}
                    className="flex items-center"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <div>
                      <div className="font-medium truncate">{location.name}</div>
                      <div className="text-xs text-muted-foreground">Production overview</div>
                    </div>
                    {selectedLocationId === location.id && (
                      <span className="ml-auto text-primary-600">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
                
                {/* No locations state */}
                {activeLocations.length === 0 && (
                  <DropdownMenuItem disabled>
                    No locations created yet
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className={`${classes.subtitle} text-sm`}>
              {getHeaderSubtitle()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LocationHeader;