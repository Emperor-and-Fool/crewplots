import { Users, Calendar, UserPlus, DollarSign, Plus } from 'lucide-react';
import { NavigationSection } from '../types';

export const workflowSections: NavigationSection[] = [
  {
    id: 'applications',
    label: 'Applications',
    icon: UserPlus,
    permission: { workflow: 'application' },
    children: [
      {
        id: 'applications-main',
        label: 'Applications',
        path: '/applicants',
        permission: { workflow: 'application' }
      }
    ]
  },
  {
    id: 'crew',
    label: 'Crew',
    icon: Users,
    permission: { workflow: 'crew' },
    children: [
      {
        id: 'crew-main',
        label: 'Crew Management',
        path: '/crew-management',
        permission: { workflow: 'crew' }
      }
    ]
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: Calendar,
    permission: { workflow: 'scheduling' },
    children: [
      {
        id: 'scheduling-main',
        label: 'Scheduling',
        path: '/scheduling',
        permission: { workflow: 'scheduling' }
      },
      {
        id: 'scheduler',
        label: 'Week Schedule Templates',
        path: '/scheduler',
        icon: Plus,
        permission: { workflow: 'crew_planning' }
      }
    ]
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: DollarSign,
    permission: { workflow: 'financial' },
    children: [
      {
        id: 'financial-main',
        label: 'Financial',
        path: '/reports',
        permission: { workflow: 'financial' }
      }
    ]
  }
];