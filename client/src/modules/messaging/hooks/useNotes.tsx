// Phase 3: useNotes hook - Extracted from application-notes.tsx
// Specialized hook for note operations in workflow contexts

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { WorkflowType, CompiledNote } from '../types/messaging.types';

export interface NotesConfig {
  userId: number;
  workflow: WorkflowType;
  readOnlyMode?: boolean;
}

export function useNotes(config: NotesConfig) {
  const { userId, workflow, readOnlyMode } = config;
  const { toast } = useToast();
  
  // Note creation state (extracted from application-notes.tsx lines 35-40)
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Fetch notes query (extracted from application-notes.tsx lines 45-75)
  const { data: notes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/messaging/notes', userId, workflow],
    queryFn: async () => {
      const endpoint = readOnlyMode && userId 
        ? `/api/messaging/notes/applicant/${userId}`
        : `/api/messaging/notes/${userId}`;
        
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Notes fetched via hybrid MongoDB/PostgreSQL:', data);
      return data;
    },
    enabled: !!userId,
    staleTime: 30000,
    retry: 2
  });

  // Create note mutation (extracted from application-notes.tsx lines 77-110)
  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
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
          messageType: 'text',
          priority: 'normal',
          isPrivate: false
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create note: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/notes'] });
      setNewNoteContent('');
      setIsAddingNote(false);
      
      toast({
        title: 'Note saved successfully!',
        description: 'Your note has been recorded.',
        duration: 4000
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to save note. Please try again.',
        variant: 'destructive',
        duration: 4000
      });
    },
  });

  // Update note mutation (extracted from application-notes.tsx lines 112-140)
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: number; content: string }) => {
      const response = await fetch(`/api/messaging/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update note: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/notes'] });
      
      toast({
        title: 'Note updated!',
        description: 'Your note has been updated.',
        duration: 4000
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to update note. Please try again.',
        variant: 'destructive',
        duration: 4000
      });
    },
  });

  // Delete note mutation (extracted from application-notes.tsx lines 142-170)
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const response = await fetch(`/api/messaging/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete note: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/notes'] });
      
      toast({
        title: 'Note deleted!',
        description: 'Your note has been deleted.',
        duration: 4000
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: 'Failed to delete note. Please try again.',
        variant: 'destructive',
        duration: 4000
      });
    },
  });

  // Public interface
  return {
    // Data
    notes,
    isLoading,
    error,
    
    // Creation state
    newNoteContent,
    setNewNoteContent,
    isAddingNote,
    setIsAddingNote,
    
    // Operations
    createNote: createNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    refetch,
    
    // Mutation states
    isCreating: createNoteMutation.isPending,
    isUpdating: updateNoteMutation.isPending,
    isDeleting: deleteNoteMutation.isPending,
    
    // Read-only mode
    readOnlyMode
  };
}