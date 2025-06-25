import { MapPin, Settings, Plus } from 'lucide-react';
import { NavigationSection } from '../types';

export const locationManagementSection: NavigationSection = {
  id: 'locations',
  label: 'Locations',
  icon: MapPin,
  permission: { 
    workflow: 'location',
    // Exclude crew_manager and floor_manager from location management
    role: ['administrator', 'manager']
  },
  children: [
    {
      id: 'manage-locations',
      label: 'Manage Locations',
      path: '/locations',
      icon: Settings,
      permission: { 
        workflow: 'location',
        role: ['administrator', 'manager']
      }
    },
    {
      id: 'add-location',
      label: 'Add Location',
      path: '/locations/new',
      icon: Plus,
      permission: { 
        workflow: 'location',
        role: ['administrator', 'manager']
      }
    }
  ]
};