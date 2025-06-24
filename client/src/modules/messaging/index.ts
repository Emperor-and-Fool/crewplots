// Messaging Module - Centralized exports
// Phase 1: Module structure creation

// Phase 4 - Component exports
export { MessagingSystem } from './components/MessagingSystem';
export { RichTextEditor } from './components/RichTextEditor';
export { MessageDisplay } from './components/MessageDisplay';
export { MessageComposer } from './components/MessageComposer';

// Phase 3 - Hook exports  
export { useMessaging } from './hooks/useMessaging';
export { useNotes } from './hooks/useNotes';
export { useMessagePermissions } from './hooks/useMessagePermissions';

// Phase 2 - Type exports
export type * from './types/messaging.types';
export type * from './types/storage.types';
export type * from './types/workflow.types';

// Temporary placeholder to ensure module structure is valid
export const MESSAGING_MODULE_VERSION = '1.0.0-migration';