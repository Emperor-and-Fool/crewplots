import React from 'react';
import { cn } from "@/lib/utils";
import { LucideIcon } from 'lucide-react';

interface NavigationItemData {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
}

interface NavigationItemProps {
  item: NavigationItemData;
  layout: 'sidebar' | 'mobile';
  onNavigate: (path: string) => void;
  onMobileClose?: () => void;
  currentPath: string;
}

export function NavigationItem({ 
  item, 
  layout, 
  onNavigate, 
  onMobileClose, 
  currentPath 
}: NavigationItemProps) {
  const IconComponent = item.icon;
  const isActive = item.path && currentPath === item.path;
  
  const handleClick = () => {
    if (item.path) {
      onNavigate(item.path);
      if (layout === 'mobile') {
        onMobileClose?.();
      }
    }
  };
  
  const baseClasses = layout === 'sidebar' 
    ? "group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer"
    : "flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer";
    
  const activeClasses = isActive ? "bg-primary-700" : "hover:bg-primary-700";
  
  return (
    <div 
      className={cn(baseClasses, activeClasses)}
      onClick={handleClick}
    >
      <IconComponent className="h-5 w-5 mr-3" />
      {item.label}
    </div>
  );
}