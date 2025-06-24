import { cn } from "@/lib/utils";
import { NavigationItem as NavigationItemType } from '@shared/navigation/types';
import { PermissionGate } from './PermissionGate';

interface NavigationItemProps {
  item: NavigationItemType;
  layout: 'desktop' | 'mobile';
  user: any;
  hasWorkflowAccess: (workflow: string) => boolean;
  onNavigate: (path: string) => void;
  onMobileClose?: () => void;
  currentPath: string;
  className?: string;
}

export function NavigationItem({ 
  item, 
  layout, 
  user,
  hasWorkflowAccess,
  onNavigate, 
  onMobileClose, 
  currentPath,
  className 
}: NavigationItemProps) {
  const IconComponent = item.icon;
  const isActive = currentPath === item.path;
  
  const handleClick = () => {
    onNavigate(item.path);
    if (layout === 'mobile') {
      onMobileClose?.();
    }
  };
  
  const baseClasses = cn(
    "flex items-center py-1 text-sm cursor-pointer",
    layout === 'desktop' 
      ? "text-primary-200 hover:text-white"
      : "px-2 py-2 font-medium rounded-md hover:bg-primary-700",
    isActive && layout === 'mobile' && "bg-primary-700",
    className
  );
  
  return (
    <PermissionGate 
      permission={item.permission} 
      user={user} 
      hasWorkflowAccess={hasWorkflowAccess}
    >
      <div className={baseClasses} onClick={handleClick}>
        {IconComponent && (
          <IconComponent 
            className={cn(
              layout === 'desktop' ? "h-4 w-4 mr-2" : "h-5 w-5 mr-3"
            )} 
          />
        )}
        {item.label}
      </div>
    </PermissionGate>
  );
}