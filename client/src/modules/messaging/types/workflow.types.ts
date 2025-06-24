// Phase 1: Workflow-specific type definitions
// Will be populated in Phase 2 with workflow configurations

export interface WorkflowConfig {
  workflow: WorkflowType;
  permissions: WorkflowPermissions;
  features: WorkflowFeatures;
  storage: StorageConfig;
}

export interface WorkflowPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
  visibleToRoles: string[];
}

export interface WorkflowFeatures {
  enableRichText: boolean;
  enableFileAttachments: boolean;
  enablePrivateMessages: boolean;
  enablePriority: boolean;
  enableAutoSave: boolean;
}

export interface StorageConfig {
  useHybridStorage: boolean;
  useRedisCache: boolean;
  cacheTTL: number;
}

export type WorkflowType = 'application' | 'crew' | 'location' | 'scheduling' | 'knowledge' | 'statistics';

// Phase 2 TODO: Extract workflow-specific configurations from:
// - client/src/components/ui/messaging-system.tsx workflow prop handling
// - server/services/messaging-service.ts workflow filtering