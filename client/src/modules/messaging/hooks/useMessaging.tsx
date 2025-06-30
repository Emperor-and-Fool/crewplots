// Phase 3: useMessaging hook - Extracted from messaging-system.tsx
// Contains core messaging operations with MongoDB/PostgreSQL hybrid storage

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import type { ExtendedMessage, ComponentMode, WorkflowType, MessageFormData } from '../types/messaging.types';

export interface MessagingConfig {
  userId: number;
  receiverId?: number;
  mode: ComponentMode;
  workflow: WorkflowType;
  readOnlyMode?: boolean;
}

export function useMessaging(config: MessagingConfig) {
  const { userId, receiverId, mode, workflow, readOnlyMode } = config;
  const { toast } = useToast();
  
  // Edit state management (extracted from messaging-system.tsx lines 133-140)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [hasCreatedMessage, setHasCreatedMessage] = useState<boolean>(false);
  const [draftMessageId, setDraftMessageId] = useState<number | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState<string>('');

  // Mode-specific behavior (extracted from messaging-system.tsx lines 129-131)
  const isNoteMode = mode === 'note';
  const isMessagesMode = mode === 'messages';

  // API endpoint logic (extracted from messaging-system.tsx lines 154-165)
  const getNotesEndpoint = useCallback(() => {
    if (readOnlyMode && isNoteMode && userId) {
      return `/api/messaging/notes/applicant/${userId}`;
    }
    return '/api/messaging/notes';
  }, [readOnlyMode, isNoteMode, userId]);

  // Message fetching query (extracted from messaging-system.tsx lines 167-185)
  const { data: messages = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/messaging/notes', userId, workflow],
    queryFn: async () => {
      const endpoint = getNotesEndpoint();
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
    retry: (failureCount, error: any) => {
      // Retry logic for authentication failures
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return failureCount < 2;
      }
      return failureCount < 3;
    }
  });

  // Create message mutation (extracted from messaging-system.tsx lines 187-220)
  const createMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      const response = await fetch('/api/messaging/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          userId: userId,
          workflow: workflow,
          receiverId: receiverId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create message: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (newMessage) => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/notes'] });
      setHasCreatedMessage(true);
      setEditingMessageId(null);
      setEditContent('');
      setDraftMessageId(null);
      
      toast({
        title: isNoteMode ? 'Note saved successfully!' : 'Message sent!',
        description: isNoteMode ? 'Your note has been recorded.' : 'Your message has been delivered.',
        duration: 4000
      });
    },
    onError: (error: any) => {
      setHasSaveError(true);
      toast({
        title: 'Error',
        description: `Failed to ${isNoteMode ? 'save note' : 'send message'}. Please try again.`,
        variant: 'destructive',
        duration: 4000
      });
    },
  });

  // Update message mutation (extracted from messaging-system.tsx lines 222-250)
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) => {
      const response = await fetch(`/api/messaging/notes/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update message: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/notes'] });
      setEditingMessageId(null);
      setEditContent('');
      setIsAutoSaving(false);
      setHasSaveError(false);
      
      toast({
        title: isNoteMode ? 'Note updated!' : 'Message updated!',
        description: isNoteMode ? 'Your note has been updated.' : 'Your message has been updated.',
        duration: 4000
      });
    },
    onError: (error: any) => {
      setHasSaveError(true);
      setIsAutoSaving(false);
      toast({
        title: 'Error',
        description: `Failed to update ${isNoteMode ? 'note' : 'message'}. Please try again.`,
        variant: 'destructive',
        duration: 4000
      });
    },
  });

  // Auto-save draft mutation (extracted from messaging-system.tsx lines 252-290)
  const autoSaveDraftMutation = useMutation({
    mutationFn: async (content: string) => {
      if (draftMessageId) {
        // Update existing draft
        const response = await fetch(`/api/messaging/notes/${draftMessageId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ content }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update draft: ${response.status}`);
        }
        
        return response.json();
      } else {
        // Create new draft
        const response = await fetch('/api/messaging/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            content,
            userId: userId,
            workflow: workflow,
            messageType: 'rich-text',
            priority: 'normal',
            isPrivate: false,
            receiverId: receiverId
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create draft: ${response.status}`);
        }
        
        return response.json();
      }
    },
    onSuccess: (savedMessage) => {
      if (!draftMessageId) {
        setDraftMessageId(savedMessage.id);
        setHasCreatedMessage(true);
      }
      setLastSavedContent(editContent);
      setIsAutoSaving(false);
      setHasSaveError(false);
    },
    onError: (error: any) => {
      setIsAutoSaving(false);
      setHasSaveError(true);
      console.error('Auto-save failed:', error);
    },
  });

  // Shared auto-save hook integration (replaces lines 253-266)
  const { autoSaveStatus } = useAutoSave({
    data: editContent,
    onSave: async (content: string) => {
      if (content.trim() && content !== lastSavedContent) {
        await autoSaveDraftMutation.mutateAsync(content);
      }
    },
    enabled: !readOnlyMode && editContent.trim() && editContent !== lastSavedContent,
    debounceMs: 2000
  });

  // Delete message mutation (extracted from messaging-system.tsx lines 292-320)
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/messaging/notes/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/notes'] });
      toast({
        title: isNoteMode ? 'Note deleted!' : 'Message deleted!',
        description: isNoteMode ? 'Your note has been deleted.' : 'Your message has been deleted.',
        duration: 4000
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete ${isNoteMode ? 'note' : 'message'}. Please try again.`,
        variant: 'destructive',
        duration: 4000
      });
    },
  });

  // Auto-save functionality (extracted from messaging-system.tsx lines 322-350)
  useEffect(() => {
    if (!editContent || readOnlyMode || editContent === lastSavedContent) {
      return;
    }

    const autoSaveTimer = setTimeout(() => {
      if (editContent !== lastSavedContent && editContent.trim().length > 0) {
        setIsAutoSaving(true);
        autoSaveDraftMutation.mutate(editContent);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [editContent, lastSavedContent, readOnlyMode, autoSaveDraftMutation]);

  // Public interface
  return {
    // Data
    messages,
    isLoading,
    error,
    
    // Edit state
    editingMessageId,
    editContent,
    hasCreatedMessage,
    draftMessageId,
    isAutoSaving,
    hasSaveError,
    
    // State setters
    setEditingMessageId,
    setEditContent,
    setDraftMessageId,
    
    // Operations
    createMessage: createMessageMutation.mutate,
    updateMessage: editMessageMutation.mutate,
    deleteMessage: deleteMessageMutation.mutate,
    refetch,
    
    // Mutation states
    isCreating: createMessageMutation.isPending,
    isUpdating: editMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    
    // Mode helpers
    isNoteMode,
    isMessagesMode
  };
}