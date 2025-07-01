import { Settings, Mail, Shield, Wrench } from 'lucide-react';
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
      id: 'validation-test',
      label: 'Validation Test',
      path: '/validation-test',
      icon: Wrench,
      permission: { role: 'administrator' }
    }
  ]
};