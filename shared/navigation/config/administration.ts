import { Settings, Mail, Shield, Wrench, TestTube, Globe, Terminal } from 'lucide-react';
import { NavigationSection } from '../types';

export const administrationSection: NavigationSection = {
  id: 'administration',
  label: 'Administration',
  icon: Settings,
  permission: { role: 'administrator' },
  children: [
    {
      id: 'email-settings',
      label: 'Email Settings',
      path: '/settings/email',
      icon: Mail,
      permission: { role: 'administrator' }
    },
    {
      id: 'security-settings',
      label: 'Security Settings',
      path: '/settings/security',
      icon: Shield,
      permission: { role: 'administrator' }
    },
    {
      id: 'devops-tests',
      label: 'DevOps Tests',
      icon: Terminal,
      permission: { role: 'administrator' },
      children: [
        {
          id: 'validation-test',
          label: 'Validation Test',
          path: '/validation-test',
          icon: Wrench,
          permission: { role: 'administrator' }
        },
        {
          id: 'admin-test',
          label: 'Admin Test',
          path: '/admin-test',
          icon: TestTube,
          permission: { role: 'administrator' }
        },
        {
          id: 'endpoint-test',
          label: 'Endpoint Test',
          path: '/endpoint-test',
          icon: Globe,
          permission: { role: 'administrator' }
        }
      ]
    }
  ]
};