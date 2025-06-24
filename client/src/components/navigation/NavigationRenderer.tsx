import React from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useWorkflowPermissions } from "@/hooks/use-workflow-permissions";
import { navigationSections, getAccessibleNavigation, NavigationSection } from '@shared/navigation';
import { NavigationSection as NavigationSectionComponent } from './NavigationSection';

interface NavigationRendererProps {
  layout: 'sidebar' | 'mobile';
  onNavigate: (path: string) => void;
  onMobileClose?: () => void;
  currentPath: string;
  serverAuthData?: any;
}

export function NavigationRenderer({ 
  layout, 
  onNavigate, 
  onMobileClose, 
  currentPath,
  serverAuthData 
}: NavigationRendererProps) {
  const { user } = useAuth();
  const { hasWorkflowAccess } = useWorkflowPermissions();
  
  // Use server auth data for role checks
  const effectiveUser = serverAuthData?.user || user;
  
  // Get accessible navigation sections based on user permissions
  const accessibleSections = getAccessibleNavigation(navigationSections, effectiveUser, hasWorkflowAccess);
  
  return (
    <div className={layout === 'sidebar' ? 'space-y-1' : 'space-y-2'}>
      {accessibleSections.map((section) => (
        <NavigationSectionComponent
          key={section.id}
          section={section}
          layout={layout}
          onNavigate={onNavigate}
          onMobileClose={onMobileClose}
          currentPath={currentPath}
        />
      ))}
    </div>
  );
}