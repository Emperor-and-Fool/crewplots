import { LayoutDashboard, Book, BarChart } from 'lucide-react';
import { NavigationSection } from '../types';

export const coreSections: NavigationSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    children: [
      {
        id: 'dashboard-main',
        label: 'Dashboard',
        path: '/dashboard'
      }
    ]
  },
  {
    id: 'knowledge-base',
    label: 'Knowledge Base',
    icon: Book,
    children: [
      {
        id: 'knowledge-base-main',
        label: 'Knowledge Base',
        path: '/knowledge-base'
      }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart,
    children: [
      {
        id: 'reports-main',
        label: 'Reports',
        path: '/reports'
      }
    ]
  }
];