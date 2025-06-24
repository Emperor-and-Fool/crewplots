import { MapPin, Settings, Plus } from 'lucide-react';
import { NavigationSection } from '../types';

export const locationManagementSection: NavigationSection = {
  id: 'locations',
  label: 'Locations',
  icon: MapPin,
  permission: { workflow: 'location' },
  children: [
    {
      id: 'manage-locations',
      label: 'Manage Locations',
      path: '/locations',
      icon: Settings,
      permission: { workflow: 'location' }
    },
    {
      id: 'add-location',
      label: 'Add Location',
      path: '/locations/new',
      icon: Plus,
      permission: { workflow: 'location' }
    }
  ]
};