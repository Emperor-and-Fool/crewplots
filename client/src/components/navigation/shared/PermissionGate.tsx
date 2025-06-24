import { ReactNode } from 'react';
import { PermissionConfig, hasPermission } from '@shared/navigation/types';

interface PermissionGateProps {
  permission?: PermissionConfig;
  user: any;
  hasWorkflowAccess: (workflow: string) => boolean;
  children: ReactNode;
}

export function PermissionGate({ 
  permission, 
  user, 
  hasWorkflowAccess, 
  children 
}: PermissionGateProps) {
  if (!hasPermission(permission, user, hasWorkflowAccess)) {
    return null;
  }
  
  return <>{children}</>;
}