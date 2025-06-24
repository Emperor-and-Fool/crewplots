import { cn } from "@/lib/utils";
import { NavigationSection } from '@shared/navigation/types';
import { NavigationItem } from '../shared/NavigationItem';
import { PermissionGate } from '../shared/PermissionGate';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SidebarSectionProps {
  section: NavigationSection;
  user: any;
  hasWorkflowAccess: (workflow: string) => boolean;
  onNavigate: (path: string) => void;
  currentPath: string;
}

export function SidebarSection({ 
  section, 
  user,
  hasWorkflowAccess,
  onNavigate, 
  currentPath 
}: SidebarSectionProps) {
  const IconComponent = section.icon;
  
  return (
    <PermissionGate 
      permission={section.permission} 
      user={user} 
      hasWorkflowAccess={hasWorkflowAccess}
    >
      {/* Handle sections with only one child (simplified display) */}
      {section.children && section.children.length === 1 ? (
        <div 
          className={cn(
            "group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer",
            currentPath === section.children[0].path ? "bg-primary-700" : "hover:bg-primary-700"
          )}
          onClick={() => onNavigate(section.children[0].path)}
        >
          <section.icon className="h-5 w-5 mr-3" />
          {section.label}
        </div>
      ) : (
        /* Handle sections with multiple children using accordion */
        section.children && section.children.length > 1 && (
          <Accordion type="single" collapsible className="border-0">
            <AccordionItem value={section.id} className="border-0">
              <AccordionTrigger className="py-0">
                <div className={cn(
                  "w-full flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  "hover:bg-primary-700"
                )}>
                  <IconComponent className="h-5 w-5 mr-3" />
                  {section.label}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0 pb-1 px-2">
                <ul className="pl-8">
                  {section.children.map((child) => (
                    <li key={child.id}>
                      <NavigationItem
                        item={child}
                        layout="desktop"
                        user={user}
                        hasWorkflowAccess={hasWorkflowAccess}
                        onNavigate={onNavigate}
                        currentPath={currentPath}
                      />
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )
      )}
    </PermissionGate>
  );
}