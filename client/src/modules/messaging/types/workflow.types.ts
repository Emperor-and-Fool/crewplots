// Phase 2: Workflow-specific type definitions
// Extracted from messaging system and services

export type WorkflowType = 'application' | 'crew' | 'location' | 'scheduling' | 'knowledge' | 'statistics';

// Workflow configuration (from messaging-system.tsx workflow handling)
export interface WorkflowConfig {
  workflow: WorkflowType;
  permissions: WorkflowPermissions;
  features: WorkflowFeatures;
  storage: WorkflowStorageConfig;
  ui: WorkflowUIConfig;
}

// Permission system (from messaging-service.ts and application-notes.tsx)
export interface WorkflowPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
  visibleToRoles: string[]; // e.g., ['manager', 'administrator']
  requiresApproval?: boolean;
}

// Feature toggles (from messaging-system.tsx props)
export interface WorkflowFeatures {
  enableRichText: boolean;
  enableFileAttachments: boolean;
  enablePrivateMessages: boolean;
  enablePriority: boolean;
  enableAutoSave: boolean;
  enableEmoji: boolean;
  enableMarkdown: boolean;
  enableMessageTypes: boolean;
}

// Storage configuration per workflow
export interface WorkflowStorageConfig {
  useHybridStorage: boolean;
  useRedisCache: boolean;
  cacheTTL: number;
  documentStorage: boolean; // MongoDB document storage
  retryAttempts: number;
}

// UI configuration per workflow  
export interface WorkflowUIConfig {
  defaultMode: 'note' | 'messages';
  showPriority: boolean;
  showPrivateToggle: boolean;
  compactMode: boolean;
  readOnlyMode: boolean;
  placeholder: string;
  title: string;
}

// Predefined workflow configurations
export const WORKFLOW_CONFIGS: Record<WorkflowType, WorkflowConfig> = {
  application: {
    workflow: 'application',
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canView: true,
      visibleToRoles: ['manager', 'administrator'],
    },
    features: {
      enableRichText: true,
      enableFileAttachments: false,
      enablePrivateMessages: false,
      enablePriority: false,
      enableAutoSave: true,
      enableEmoji: false,
      enableMarkdown: false,
      enableMessageTypes: false,
    },
    storage: {
      useHybridStorage: true,
      useRedisCache: true,
      cacheTTL: 3600,
      documentStorage: true,
      retryAttempts: 3,
    },
    ui: {
      defaultMode: 'note',
      showPriority: false,
      showPrivateToggle: false,
      compactMode: true,
      readOnlyMode: false,
      placeholder: 'Type your note about your application...',
      title: 'Why you want to be part of our crew',
    },
  },
  crew: {
    workflow: 'crew',
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canView: true,
      visibleToRoles: ['crew', 'manager', 'administrator'],
    },
    features: {
      enableRichText: true,
      enableFileAttachments: true,
      enablePrivateMessages: true,
      enablePriority: true,
      enableAutoSave: true,
      enableEmoji: true,
      enableMarkdown: true,
      enableMessageTypes: true,
    },
    storage: {
      useHybridStorage: true,
      useRedisCache: true,
      cacheTTL: 1800,
      documentStorage: true,
      retryAttempts: 3,
    },
    ui: {
      defaultMode: 'messages',
      showPriority: true,
      showPrivateToggle: true,
      compactMode: false,
      readOnlyMode: false,
      placeholder: 'Type your message...',
      title: 'Team Communication',
    },
  },
  location: {
    workflow: 'location',
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canView: true,
      visibleToRoles: ['manager', 'administrator'],
    },
    features: {
      enableRichText: true,
      enableFileAttachments: true,
      enablePrivateMessages: false,
      enablePriority: false,
      enableAutoSave: true,
      enableEmoji: false,
      enableMarkdown: true,
      enableMessageTypes: false,
    },
    storage: {
      useHybridStorage: true,
      useRedisCache: true,
      cacheTTL: 7200,
      documentStorage: true,
      retryAttempts: 3,
    },
    ui: {
      defaultMode: 'note',
      showPriority: false,
      showPrivateToggle: false,
      compactMode: true,
      readOnlyMode: false,
      placeholder: 'Location notes and information...',
      title: 'Location Information',
    },
  },
  scheduling: {
    workflow: 'scheduling',
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canView: true,
      visibleToRoles: ['crew', 'manager', 'administrator'],
    },
    features: {
      enableRichText: false,
      enableFileAttachments: false,
      enablePrivateMessages: false,
      enablePriority: true,
      enableAutoSave: true,
      enableEmoji: false,
      enableMarkdown: false,
      enableMessageTypes: false,
    },
    storage: {
      useHybridStorage: true,
      useRedisCache: true,
      cacheTTL: 900,
      documentStorage: false,
      retryAttempts: 3,
    },
    ui: {
      defaultMode: 'note',
      showPriority: true,
      showPrivateToggle: false,
      compactMode: true,
      readOnlyMode: false,
      placeholder: 'Scheduling notes...',
      title: 'Schedule Information',
    },
  },
  knowledge: {
    workflow: 'knowledge',
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canView: true,
      visibleToRoles: ['crew', 'manager', 'administrator'],
    },
    features: {
      enableRichText: true,
      enableFileAttachments: true,
      enablePrivateMessages: false,
      enablePriority: false,
      enableAutoSave: true,
      enableEmoji: false,
      enableMarkdown: true,
      enableMessageTypes: false,
    },
    storage: {
      useHybridStorage: true,
      useRedisCache: true,
      cacheTTL: 14400,
      documentStorage: true,
      retryAttempts: 3,
    },
    ui: {
      defaultMode: 'note',
      showPriority: false,
      showPrivateToggle: false,
      compactMode: false,
      readOnlyMode: false,
      placeholder: 'Knowledge base content...',
      title: 'Knowledge Base',
    },
  },
  statistics: {
    workflow: 'statistics',
    permissions: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canView: true,
      visibleToRoles: ['manager', 'administrator'],
    },
    features: {
      enableRichText: false,
      enableFileAttachments: false,
      enablePrivateMessages: false,
      enablePriority: false,
      enableAutoSave: false,
      enableEmoji: false,
      enableMarkdown: false,
      enableMessageTypes: false,
    },
    storage: {
      useHybridStorage: false,
      useRedisCache: true,
      cacheTTL: 3600,
      documentStorage: false,
      retryAttempts: 1,
    },
    ui: {
      defaultMode: 'note',
      showPriority: false,
      showPrivateToggle: false,
      compactMode: true,
      readOnlyMode: true,
      placeholder: 'Statistical data...',
      title: 'Statistics',
    },
  },
};