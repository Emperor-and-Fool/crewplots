// Phase 3: useMessagePermissions hook - Extracted permission logic
// Role-based access control for messaging operations

import { useMemo } from 'react';
import type { WorkflowType } from '../types/messaging.types';
import { WORKFLOW_CONFIGS } from '../types/workflow.types';

export interface PermissionsConfig {
  userId: number;
  userRole: string;
  workflow: WorkflowType;
  messageOwnerId?: number;
}

export function useMessagePermissions(config: PermissionsConfig) {
  const { userId, userRole, workflow, messageOwnerId } = config;
  
  const permissions = useMemo(() => {
    const workflowConfig = WORKFLOW_CONFIGS[workflow];
    
    // Check if user role is allowed for this workflow
    const hasWorkflowAccess = workflowConfig.permissions.visibleToRoles.includes(userRole);
    
    // Check if user owns the message (for edit/delete operations)
    const isOwner = messageOwnerId ? userId === messageOwnerId : true;
    
    // Administrator always has full access
    const isAdmin = userRole === 'administrator';
    
    // Manager has elevated permissions
    const isManager = userRole === 'manager';
    
    return {
      canCreate: hasWorkflowAccess && (workflowConfig.permissions.canCreate || isAdmin),
      canEdit: hasWorkflowAccess && ((workflowConfig.permissions.canEdit && isOwner) || isAdmin),
      canDelete: hasWorkflowAccess && ((workflowConfig.permissions.canDelete && isOwner) || isAdmin),
      canView: hasWorkflowAccess && (workflowConfig.permissions.canView || isAdmin),
      canShare: isManager || isAdmin,
      
      // Workflow-specific permissions
      canUseRichText: workflowConfig.features.enableRichText,
      canAttachFiles: workflowConfig.features.enableFileAttachments,
      canSetPrivate: workflowConfig.features.enablePrivateMessages,
      canSetPriority: workflowConfig.features.enablePriority,
      
      // Access level flags
      isOwner,
      isAdmin,
      isManager,
      hasWorkflowAccess
    };
  }, [userId, userRole, workflow, messageOwnerId]);
  
  return permissions;
}