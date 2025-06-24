import { NavigationSection } from './navigation-config';
import { coreNavigationSections } from './sections/core-navigation';
import { administrationSection } from './sections/administration';
import { locationManagementSection } from './sections/location-management';
import { workflowSections } from './sections/workflow-sections';

/**
 * Complete navigation configuration
 * Order determines display order in sidebar and mobile menu
 */
export const navigationSections: NavigationSection[] = [
  ...coreNavigationSections.filter(section => section.id === 'dashboard'), // Dashboard first
  administrationSection,
  locationManagementSection,
  ...workflowSections,
  ...coreNavigationSections.filter(section => section.id !== 'dashboard'), // Rest of core sections
];

export * from './navigation-config';
export { hasNavigationAccess, getAccessibleNavigation } from './navigation-config';