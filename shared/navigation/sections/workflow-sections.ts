import { Users, Calendar, UserPlus, DollarSign } from 'lucide-react';
import { NavigationSection } from '../navigation-config';

export const workflowSections: NavigationSection[] = [
  {
    id: 'applications',
    label: 'Applications',
    icon: UserPlus,
    requiredWorkflow: 'application',
    children: [
      {
        id: 'applications-main',
        label: 'Applications',
        path: '/applicants',
        requiredWorkflow: 'application'
      }
    ]
  },
  {
    id: 'crew',
    label: 'Crew',
    icon: Users,
    requiredWorkflow: 'crew',
    children: [
      {
        id: 'crew-main',
        label: 'Crew',
        path: '/staff',
        requiredWorkflow: 'crew'
      }
    ]
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: Calendar,
    requiredWorkflow: 'scheduling',
    children: [
      {
        id: 'scheduling-main',
        label: 'Scheduling',
        path: '/scheduling',
        requiredWorkflow: 'scheduling'
      }
    ]
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: DollarSign,
    requiredWorkflow: 'financial',
    children: [
      {
        id: 'financial-main',
        label: 'Financial',
        path: '/reports',
        requiredWorkflow: 'financial'
      }
    ]
  }
];