// Phase 4: MessagingSystem component - Refactored using extracted components
// Main messaging interface using new modular architecture

import React from 'react';
import { MessageComposer } from './MessageComposer';
import { MessageDisplay } from './MessageDisplay';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useMessaging } from '../hooks/useMessaging';
import { useMessagePermissions } from '../hooks/useMessagePermissions';
import type { MessagingSystemProps } from '../types/messaging.types';
import { WORKFLOW_CONFIGS } from '../types/workflow.types';

export function MessagingSystem({
  userId,
  receiverId,
  mode = 'messages',
  workflow = 'application',
  title,
  readOnlyMode = false,
  placeholder,
  showPriority = true,
  showPrivateToggle = true,
  showMessageTypes = false,
  maxHeight = '500px',
  documentStorage = false,
  enableRichText = true,
  enableFileAttachments = false,
  enableEmoji = false,
  enableMarkdown = false,
  showOnlyUserMessages = false,
  showSystemMessages = true,
  allowMessageDeletion = true,
  onMessageSent,
  onMessageClick,
  className = '',
  compactMode = false
}: MessagingSystemProps) {
  const workflowConfig = WORKFLOW_CONFIGS[workflow];
  
  const {
    messages,
    isLoading,
    error,
    editingMessageId,
    editContent,
    setEditingMessageId,
    setEditContent,
    createMessage,
    updateMessage,
    deleteMessage,
    isCreating,
    isUpdating,
    isDeleting,
    isNoteMode
  } = useMessaging({
    userId,
    receiverId,
    mode,
    workflow,
    readOnlyMode
  });

  const permissions = useMessagePermissions({
    userId,
    userRole: 'user', // This should come from auth context
    workflow
  });

  const handleCreateMessage = (data: any) => {
    createMessage(data);
    onMessageSent?.(data);
  };

  const handleEditMessage = (messageId: number, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editContent) {
      updateMessage({ messageId: editingMessageId, content: editContent });
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleDeleteMessage = (messageId: number) => {
    if (allowMessageDeletion && window.confirm('Are you sure you want to delete this message?')) {
      deleteMessage(messageId);
    }
  };

  const filteredMessages = messages.filter(message => {
    if (showOnlyUserMessages && message.userId !== userId) return false;
    if (!showSystemMessages && message.messageType === 'system') return false;
    return true;
  });

  const displayTitle = title || workflowConfig.ui.title;
  const displayPlaceholder = placeholder || workflowConfig.ui.placeholder;

  return (
    <div className={`messaging-system ${className}`}>
      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load messages. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Messages Display */}
      <div 
        className="messages-container space-y-3 overflow-y-auto"
        style={{ maxHeight }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isNoteMode ? 'No notes yet' : 'No messages yet'}
          </div>
        ) : (
          filteredMessages.map((message) => (
            <MessageDisplay
              key={message.id}
              message={message}
              currentUserId={userId}
              currentUserRole="user" // This should come from auth context
              workflow={workflow}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              isEditing={editingMessageId === message.id}
              editContent={editContent}
              onEditContentChange={setEditContent}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              isUpdating={isUpdating}
              compactMode={compactMode}
            />
          ))
        )}
      </div>

      {/* Message Composer */}
      {permissions.canCreate && !readOnlyMode && (
        <div className="mt-4">
          <MessageComposer
            workflow={workflow}
            onSubmit={handleCreateMessage}
            isSubmitting={isCreating}
            showAdvancedOptions={showPriority || showPrivateToggle || showMessageTypes}
            placeholder={displayPlaceholder}
            title={isNoteMode ? 'Add Note' : 'Send Message'}
          />
        </div>
      )}
    </div>
  );
}