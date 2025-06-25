import { useAuth } from "@/modules/auth";
import { useWorkflowPermissions } from "@/hooks/use-workflow-permissions";
import { navigationConfig } from '@shared/navigation';
import { SidebarSection } from './desktop/SidebarSection';
import { MobileNavItem } from './mobile/MobileNavItem';

interface NavigationRendererProps {
  layout: 'desktop' | 'mobile';
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
  
  return (
    <div className={layout === 'desktop' ? 'space-y-1' : 'space-y-2'}>
      {navigationConfig.map((section) => (
        layout === 'desktop' ? (
          <SidebarSection
            key={section.id}
            section={section}
            user={effectiveUser}
            hasWorkflowAccess={hasWorkflowAccess}
            onNavigate={onNavigate}
            currentPath={currentPath}
          />
        ) : (
          <MobileNavItem
            key={section.id}
            section={section}
            user={effectiveUser}
            hasWorkflowAccess={hasWorkflowAccess}
            onNavigate={onNavigate}
            onMobileClose={onMobileClose || (() => {})}
            currentPath={currentPath}
          />
        )
      ))}
    </div>
  );
}