import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Plus, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Message } from '@shared/schema';

interface NotesManagerProps {
  userId: number;
  userName?: string;
  initialWorkflow?: string;
}

const WORKFLOWS = [
  { value: 'application', label: 'Application Process', color: 'bg-blue-100 text-blue-800' },
  { value: 'crew', label: 'Crew Management', color: 'bg-green-100 text-green-800' },
  { value: 'location', label: 'Location Notes', color: 'bg-purple-100 text-purple-800' },
  { value: 'scheduling', label: 'Scheduling', color: 'bg-orange-100 text-orange-800' },
  { value: 'knowledge', label: 'Knowledge Base', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'statistics', label: 'Performance', color: 'bg-red-100 text-red-800' }
];

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Managers' },
  { value: 'crew_manager', label: 'Crew Managers' },
  { value: 'crew_member', label: 'Crew Members' },
  { value: 'administrator', label: 'Administrators' }
];

export default function NotesManager({ userId, userName, initialWorkflow = 'application' }: NotesManagerProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState(initialWorkflow);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['manager']);
  const [isAddingNote, setIsAddingNote] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch notes for selected workflow
  const { data: notes, isLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages/notes', userId, selectedWorkflow],
    queryFn: async () => {
      const response = await fetch(`/api/messages/notes/${userId}/${selectedWorkflow}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      return response.json();
    },
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { content: string; workflow: string; visibleToRoles: string[] }) => {
      const response = await fetch('/api/messages/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: noteData.content,
          userId: userId,
          workflow: noteData.workflow,
          visibleToRoles: noteData.visibleToRoles,
          messageType: 'text'
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create note');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages/notes', userId, selectedWorkflow] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/notes', userId, selectedWorkflow, 'count'] });
      setNewNoteContent('');
      setIsAddingNote(false);
      toast({
        title: 'Note created',
        description: 'Note has been successfully added.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create note.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateNote = () => {
    if (!newNoteContent.trim()) return;
    
    createNoteMutation.mutate({
      content: newNoteContent,
      workflow: selectedWorkflow,
      visibleToRoles: selectedRoles
    });
  };

  const getWorkflowInfo = (workflow: string) => {
    return WORKFLOWS.find(w => w.value === workflow) || WORKFLOWS[0];
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <h3 className="text-lg font-semibold">
            Notes for {userName || `User ${userId}`}
          </h3>
        </div>
        
        {/* Workflow Selector */}
        <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORKFLOWS.map((workflow) => (
              <SelectItem key={workflow.value} value={workflow.value}>
                {workflow.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Add Note Section */}
      {isAddingNote ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter note content..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="min-h-20"
            />
            
            <div>
              <label className="text-sm font-medium mb-2 block">Visible to roles:</label>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <label key={role.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles([...selectedRoles, role.value]);
                        } else {
                          setSelectedRoles(selectedRoles.filter(r => r !== role.value));
                        }
                      }}
                    />
                    <span className="text-sm">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateNote}
                disabled={!newNoteContent.trim() || createNoteMutation.isPending}
              >
                {createNoteMutation.isPending ? 'Creating...' : 'Create Note'}
              </Button>
              <Button variant="outline" onClick={() => setIsAddingNote(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsAddingNote(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Note to {getWorkflowInfo(selectedWorkflow).label}
        </Button>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading notes...</div>
        ) : notes && notes.length > 0 ? (
          notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge className={getWorkflowInfo(note.workflow || selectedWorkflow).color}>
                    {getWorkflowInfo(note.workflow || selectedWorkflow).label}
                  </Badge>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(note.createdAt)}
                  </div>
                </div>
                
                <p className="text-gray-900 mb-3">{note.content}</p>
                
                {note.visibleToRoles && note.visibleToRoles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      Visible to: {note.visibleToRoles.join(', ')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No notes found for {getWorkflowInfo(selectedWorkflow).label.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
}