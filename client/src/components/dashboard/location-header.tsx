import { Building2, MapPin } from "lucide-react";
import { useLocationContext } from "@/contexts/location-context";

export function LocationHeader() {
  const { selectedLocation, getLocationName, getLocationLogo, isAllLocations } = useLocationContext();

  if (isAllLocations) {
    return (
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Locations Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Overview across all locations</p>
        </div>
      </div>
    );
  }

  const locationLogo = getLocationLogo();
  const locationName = getLocationName();

  return (
    <div className="flex items-center space-x-3 mb-6">
      <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg">
        {locationLogo ? (
          <img 
            src={locationLogo} 
            alt={`${locationName} logo`}
            className="w-8 h-8 object-contain rounded"
          />
        ) : (
          <MapPin className="w-6 h-6 text-green-600 dark:text-green-400" />
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locationName} Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Location-specific crew scheduling overview</p>
      </div>
    </div>
  );
}