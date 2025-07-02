import { cn } from "@/lib/utils";
import { NavigationItem as NavigationItemType } from '@shared/navigation/types';
import { PermissionGate } from './PermissionGate';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    if (item.path) {
      onNavigate(item.path);
      if (layout === 'mobile') {
        onMobileClose?.();
      }
    }
  };
  
  const baseClasses = cn(
    "flex items-center text-sm cursor-pointer",
    layout === 'desktop' 
      ? "py-1 text-primary-200 hover:text-white"
      : "px-2 py-2 font-medium rounded-md text-primary-200 hover:bg-primary-700 hover:text-white",
    isActive && layout === 'mobile' && "bg-primary-700 text-white",
    className
  );
  
  return (
    <PermissionGate 
      permission={item.permission} 
      user={user} 
      hasWorkflowAccess={hasWorkflowAccess}
    >
      {/* Handle items with children (nested structure) */}
      {item.children && item.children.length > 0 ? (
        <Accordion type="single" collapsible className="border-0">
          <AccordionItem value={item.id} className="border-0">
            <AccordionTrigger className="py-0">
              <div className={cn(
                "w-full flex items-center text-sm",
                layout === 'desktop' 
                  ? "py-1 text-primary-200 hover:text-white"
                  : "px-2 py-2 font-medium rounded-md text-primary-200 hover:bg-primary-700 hover:text-white"
              )}>
                {IconComponent && (
                  <IconComponent 
                    className={cn(
                      layout === 'desktop' ? "h-4 w-4 mr-2" : "h-5 w-5 mr-3"
                    )} 
                  />
                )}
                {item.label}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-0 pb-1">
              <ul className={layout === 'desktop' ? "pl-6" : "pl-8"}>
                {item.children.map((child) => (
                  <li key={child.id}>
                    <NavigationItem
                      item={child}
                      layout={layout}
                      user={user}
                      hasWorkflowAccess={hasWorkflowAccess}
                      onNavigate={onNavigate}
                      onMobileClose={onMobileClose}
                      currentPath={currentPath}
                    />
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        /* Handle items without children (leaf nodes) */
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
      )}
    </PermissionGate>
  );
}