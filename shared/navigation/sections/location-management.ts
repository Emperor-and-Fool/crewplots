import { MapPin, Settings, Plus } from 'lucide-react';
import { NavigationSection } from '../navigation-config';

export const locationManagementSection: NavigationSection = {
  id: 'locations',
  label: 'Locations',
  icon: MapPin,
  requiredWorkflow: 'location',
  children: [
    {
      id: 'manage-locations',
      label: 'Manage Locations',
      path: '/locations',
      icon: Settings,
      requiredWorkflow: 'location'
    },
    {
      id: 'add-location',
      label: 'Add Location',
      path: '/locations/new',
      icon: Plus,
      requiredWorkflow: 'location'
    }
  ]
};