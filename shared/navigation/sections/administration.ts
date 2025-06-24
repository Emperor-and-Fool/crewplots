import { Settings, Mail, Shield } from 'lucide-react';
import { NavigationSection } from '../navigation-config';

export const administrationSection: NavigationSection = {
  id: 'administration',
  label: 'Administration',
  icon: Settings,
  requiredRole: 'administrator',
  children: [
    {
      id: 'email-settings',
      label: 'Email Settings',
      path: '/settings/email',
      icon: Mail,
      requiredRole: 'administrator'
    },
    {
      id: 'security-settings',
      label: 'Security Settings',
      path: '/settings/security',
      icon: Shield,
      requiredRole: 'administrator'
    }
  ]
};