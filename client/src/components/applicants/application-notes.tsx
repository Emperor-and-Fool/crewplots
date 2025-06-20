import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Clock, User, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ApplicationNotesProps {
  userId?: number;
}

interface CompiledNote {
  id: number;
  content: string;
  workflow: string;
  messageType: string;
  createdAt: string;
  updatedAt: string;
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

export function ApplicationNotes({ userId }: ApplicationNotesProps) {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch application notes for the current user
  const { data: notes, isLoading } = useQuery<CompiledNote[]>({
    queryKey: ['/api/messages/notes', userId, 'application'],
    queryFn: async () => {
      const response = await fetch(`/api/messages/notes/${userId}/application`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      return response.json();
    },
    enabled: !!userId,
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/messages/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content,
          userId: userId,
          workflow: 'application',
          messageType: 'text',
          visibleToRoles: ['manager', 'administrator'] // Applicants can share with managers
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create note');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/notes', userId, 'application'] });
      setNewNoteContent('');
      setIsAddingNote(false);
      toast({
        title: 'Note added',
        description: 'Your note has been successfully added to your application.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create note. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: number; content: string }) => {
      const response = await fetch(`/api/messages/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        throw new Error('Failed to update note');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/notes', userId, 'application'] });
      setEditingNoteId(null);
      setEditContent('');
      toast({
        title: 'Note updated',
        description: 'Your note has been successfully updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update note. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const response = await fetch(`/api/messages/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete note');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/notes', userId, 'application'] });
      toast({
        title: 'Note deleted',
        description: 'Your note has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete note. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateNote = () => {
    if (!newNoteContent.trim()) return;
    createNoteMutation.mutate(newNoteContent);
  };

  const handleUpdateNote = (noteId: number) => {
    if (!editContent.trim()) return;
    updateNoteMutation.mutate({ noteId, content: editContent });
  };

  const handleDeleteNote = (noteId: number) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  const startEditing = (note: CompiledNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  if (!userId) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">Please log in to view your application notes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add new note section */}
      <div className="space-y-3">
        {!isAddingNote ? (
          <Button
            onClick={() => setIsAddingNote(true)}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add a note to your application
          </Button>
        ) : (
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Add a note about your application, additional information, or updates..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="min-h-[100px]"
                  maxLength={1000}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    {newNoteContent.length}/1000 characters
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setIsAddingNote(false);
                        setNewNoteContent('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateNote}
                      disabled={!newNoteContent.trim() || createNoteMutation.isPending}
                      size="sm"
                    >
                      {createNoteMutation.isPending ? 'Adding...' : 'Add Note'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4">
            <p className="text-gray-500">Loading your notes...</p>
          </div>
        ) : notes && notes.length > 0 ? (
          notes.map((note) => (
            <Card key={note.id} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                {editingNoteId === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px]"
                      maxLength={1000}
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">
                        {editContent.length}/1000 characters
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={cancelEditing}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={!editContent.trim() || updateNoteMutation.isPending}
                          size="sm"
                        >
                          {updateNoteMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="whitespace-pre-wrap">{note.content}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{note.author.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {note.author.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      </div>
                      
                      {note.permissions.canEdit && (
                        <div className="flex gap-1">
                          <Button
                            onClick={() => startEditing(note)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          {note.permissions.canDelete && (
                            <Button
                              onClick={() => handleDeleteNote(note.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notes yet</p>
            <p className="text-sm text-gray-400">Add your first note to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplicationNotes;