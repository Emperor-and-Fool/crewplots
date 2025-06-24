import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Clock, User, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { User as UserSchema } from '@shared/schema';

// Note structure for applicant notes
interface ApplicantNote {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  author?: {
    id: number;
    username: string;
  };
}

interface ApplicationNotesProps {
  userId?: number;
}

export function ApplicationNotes({ userId }: ApplicationNotesProps) {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notes for this user
  const { data: notes = [], isLoading } = useQuery<ApplicantNote[]>({
    queryKey: ['/api/applicants', userId, 'notes'],
    enabled: !!userId,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', `/api/applicants/${userId}/notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants', userId, 'notes'] });
      setNewNoteContent('');
      setIsAddingNote(false);
      toast({
        title: "Note Added",
        description: "Application note has been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: number; content: string }) => {
      return apiRequest('PATCH', `/api/applicants/${userId}/notes/${noteId}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants', userId, 'notes'] });
      setEditingNoteId(null);
      setEditContent('');
      toast({
        title: "Note Updated",
        description: "Application note has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error updating note:', error);
      toast({
        title: "Error",
        description: "Failed to update note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      return apiRequest('DELETE', `/api/applicants/${userId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants', userId, 'notes'] });
      toast({
        title: "Note Deleted",
        description: "Application note has been deleted.",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    addNoteMutation.mutate(newNoteContent);
  };

  const handleUpdateNote = (noteId: number) => {
    if (!editContent.trim()) return;
    updateNoteMutation.mutate({ noteId, content: editContent });
  };

  const handleEditNote = (note: ApplicantNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  if (!userId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500 text-center">No applicant selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Application Notes
        </CardTitle>
        <Button
          size="sm"
          onClick={() => setIsAddingNote(true)}
          disabled={isAddingNote}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Note
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Note Form */}
        {isAddingNote && (
          <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
            <Textarea
              placeholder="Enter your note about this applicant..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingNote(false);
                  setNewNoteContent('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={addNoteMutation.isPending || !newNoteContent.trim()}
              >
                {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {isLoading ? (
          <div className="text-center py-4">
            <p className="text-gray-500">Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No notes yet</p>
            <p className="text-sm text-gray-400">Add the first note about this applicant</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4 bg-white">
                {editingNoteId === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={updateNoteMutation.isPending || !editContent.trim()}
                      >
                        {updateNoteMutation.isPending ? 'Updating...' : 'Update'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{note.author?.username || 'Unknown'}</span>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(note.createdAt), 'MMM d, yyyy HH:mm')}
                        </Badge>
                        {note.updatedAt && note.updatedAt !== note.createdAt && (
                          <Badge variant="secondary" className="text-xs">
                            Updated
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditNote(note)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          disabled={deleteNoteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}