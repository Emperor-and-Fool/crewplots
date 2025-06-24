import { cn } from "@/lib/utils";
import { NavigationSection } from '@shared/navigation/types';
import { NavigationItem } from '../shared/NavigationItem';
import { PermissionGate } from '../shared/PermissionGate';

interface MobileNavItemProps {
  section: NavigationSection;
  user: any;
  hasWorkflowAccess: (workflow: string) => boolean;
  onNavigate: (path: string) => void;
  onMobileClose: () => void;
  currentPath: string;
}

export function MobileNavItem({ 
  section, 
  user,
  hasWorkflowAccess,
  onNavigate, 
  onMobileClose,
  currentPath 
}: MobileNavItemProps) {
  const IconComponent = section.icon;
  
  return (
    <PermissionGate 
      permission={section.permission} 
      user={user} 
      hasWorkflowAccess={hasWorkflowAccess}
    >
      {/* Handle sections with only one child (simplified display) */}
      {section.children && section.children.length === 1 ? (
        <NavigationItem
          item={{
            id: section.id,
            label: section.label,
            path: section.children[0].path,
            icon: section.icon,
            permission: section.permission
          }}
          layout="mobile"
          user={user}
          hasWorkflowAccess={hasWorkflowAccess}
          onNavigate={onNavigate}
          onMobileClose={onMobileClose}
          currentPath={currentPath}
          className="flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer hover:bg-primary-700"
        />
      ) : (
        /* Handle sections with multiple children using flat hierarchy */
        section.children && section.children.length > 1 && (
          <div>
            {/* Section header */}
            <div className={cn(
              "flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer",
              "text-primary-100 hover:bg-primary-700"
            )}>
              <IconComponent className="h-5 w-5 mr-3" />
              {section.label}
            </div>
            
            {/* Section children */}
            {section.children.map((child) => (
              <NavigationItem
                key={child.id}
                item={child}
                layout="mobile"
                user={user}
                hasWorkflowAccess={hasWorkflowAccess}
                onNavigate={onNavigate}
                onMobileClose={onMobileClose}
                currentPath={currentPath}
                className="ml-4"
              />
            ))}
          </div>
        )
      )}
    </PermissionGate>
  );
}