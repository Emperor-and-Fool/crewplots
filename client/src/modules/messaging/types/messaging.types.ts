// Phase 1: Core messaging type definitions
// Will be populated in Phase 2 with extracted types from components

export interface BaseMessage {
  id: number;
  content: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExtendedMessage extends BaseMessage {
  sender?: UserProfile | null;
  receiver?: UserProfile | null;
  priority: MessagePriority;
  isPrivate: boolean;
  messageType: MessageType;
}

export interface UserProfile {
  id: number;
  username: string;
  role: string;
}

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type MessageType = 'text' | 'rich-text' | 'system' | 'notification';
export type ComponentMode = 'note' | 'messages';
export type WorkflowType = 'application' | 'crew' | 'location' | 'scheduling' | 'knowledge' | 'statistics';

// Phase 2 TODO: Extract and consolidate types from:
// - client/src/components/ui/messaging-system.tsx (lines 22-38)
// - client/src/components/applicants/application-notes.tsx (lines 15-32)
// - server/services/messaging-service.ts (lines 8-20)