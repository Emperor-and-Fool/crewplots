import { NavigationSection } from '../types';
import { coreSections } from './core-sections';
import { administrationSection } from './administration';
import { locationManagementSection } from './location-management';
import { workflowSections } from './workflow-sections';

/**
 * Complete navigation configuration
 * Order determines display order in sidebar and mobile menu
 */
export const navigationConfig: NavigationSection[] = [
  // Dashboard first
  ...coreSections.filter(section => section.id === 'dashboard'),
  
  // Administration section
  administrationSection,
  
  // Location management
  locationManagementSection,
  
  // Workflow sections
  ...workflowSections,
  
  // Remaining core sections
  ...coreSections.filter(section => section.id !== 'dashboard'),
];

export * from './core-sections';
export * from './administration';
export * from './location-management';
export * from './workflow-sections';