// Phase 2: Core messaging type definitions
// Extracted and consolidated from multiple components

// Base message interface (from messaging-system.tsx and shared/schema)
export interface BaseMessage {
  id: number;
  content: string;
  userId: number;
  receiverId?: number;
  createdAt: string;
  updatedAt: string;
  messageType: MessageType;
  priority: MessagePriority;
  isPrivate: boolean;
  workflow?: WorkflowType;
}

// Extended message with joined user data (from messaging-system.tsx lines 22-25)
export interface ExtendedMessage extends BaseMessage {
  sender?: UserProfile | null;
  receiver?: UserProfile | null;
}

// Compiled note type for frontend consumption (from messaging-service.ts lines 8-20)
export interface CompiledNote extends Omit<BaseMessage, 'content'> {
  content: string;
  author: {
    id: number;
    name: string;
    role: string;
  };
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
}

// User profile interface (from application-notes.tsx)
export interface UserProfile {
  id: number;
  username: string;
  role: string;
}

// Message form data (from messaging-system.tsx lines 28-36)
export interface MessageFormData {
  content: string;
  messageType: MessageType;
  priority: MessagePriority;
  isPrivate: boolean;
  receiverId?: number;
}

// Component configuration interfaces
export interface MessagingSystemProps {
  // Core configuration
  userId: number;
  receiverId?: number;
  
  // Module selection
  mode?: ComponentMode;
  
  // UI customization
  title?: string;
  readOnlyMode?: boolean;
  placeholder?: string;
  showPriority?: boolean;
  showPrivateToggle?: boolean;
  showMessageTypes?: boolean;
  maxHeight?: string;
  
  // Workflow categorization
  workflow?: WorkflowType;
  
  // Document storage integration
  documentStorage?: boolean;
  
  // Feature toggles
  enableRichText?: boolean;
  enableFileAttachments?: boolean;
  enableEmoji?: boolean;
  enableMarkdown?: boolean;
  
  // Filtering and display options
  showOnlyUserMessages?: boolean;
  showSystemMessages?: boolean;
  allowMessageDeletion?: boolean;
  
  // Event handlers
  onMessageSent?: (message: ExtendedMessage) => void;
  onMessageClick?: (message: ExtendedMessage) => void;
  
  // Custom styling
  className?: string;
  compactMode?: boolean;
}

// Type definitions
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type MessageType = 'text' | 'rich-text' | 'system' | 'notification';
export type ComponentMode = 'note' | 'messages';
export type WorkflowType = 'application' | 'crew' | 'location' | 'scheduling' | 'knowledge' | 'statistics';