import React from 'react';
import { cn } from "@/lib/utils";
import { NavigationSection as NavigationSectionType } from '@shared/navigation';
import { NavigationItem } from './NavigationItem';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface NavigationSectionProps {
  section: NavigationSectionType;
  layout: 'sidebar' | 'mobile';
  onNavigate: (path: string) => void;
  onMobileClose?: () => void;
  currentPath: string;
}

export function NavigationSection({ 
  section, 
  layout, 
  onNavigate, 
  onMobileClose, 
  currentPath 
}: NavigationSectionProps) {
  const IconComponent = section.icon;
  
  // Handle sections with only one child (simplified display)
  if (section.children && section.children.length === 1) {
    const child = section.children[0];
    return (
      <NavigationItem
        item={{
          id: section.id,
          label: section.label,
          icon: section.icon,
          path: child.path
        }}
        layout={layout}
        onNavigate={onNavigate}
        onMobileClose={onMobileClose}
        currentPath={currentPath}
      />
    );
  }
  
  // Handle sections with multiple children
  if (section.children && section.children.length > 1) {
    if (layout === 'sidebar') {
      // Desktop sidebar with accordion
      return (
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
                {section.children.map((child) => {
                  const ChildIconComponent = child.icon;
                  return (
                    <li key={child.id}>
                      <div 
                        className="flex items-center py-1 text-sm text-primary-200 hover:text-white cursor-pointer"
                        onClick={() => onNavigate(child.path)}
                      >
                        {ChildIconComponent && <ChildIconComponent className="h-4 w-4 mr-2" />}
                        {child.label}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    } else {
      // Mobile layout with flat hierarchy
      return (
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
          {section.children.map((child) => {
            const ChildIconComponent = child.icon;
            return (
              <div 
                key={child.id}
                className={cn(
                  "flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer ml-4",
                  "text-primary-200 hover:bg-primary-700"
                )}
                onClick={() => {
                  onNavigate(child.path);
                  onMobileClose?.();
                }}
              >
                {ChildIconComponent && <ChildIconComponent className="h-4 w-4 mr-3" />}
                {child.label}
              </div>
            );
          })}
        </div>
      );
    }
  }
  
  // Fallback for sections without children
  return null;
}