import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Send, Clock, Save, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import type { Message } from '@shared/schema';
import { RichTextEditor, MessageDisplay } from '@/components/ui/rich-text-editor';

// Note form validation schema
const noteFormSchema = z.object({
  content: z.string()
    .min(1, 'Note content is required')
    .max(5000, 'Note must be less than 5000 characters'),
});

type NoteFormData = z.infer<typeof noteFormSchema>;

interface NoteSystemProps {
  userId: number;
  title?: string;
  placeholder?: string;
  maxHeight?: string;
  workflow?: 'application' | 'crew' | 'location' | 'scheduling' | 'knowledge' | 'statistics';
  onNoteSaved?: (note: Message) => void;
  className?: string;
  compactMode?: boolean;
}

export function NoteSystem({
  userId,
  title = 'Notes',
  placeholder = 'Type your note here...',
  maxHeight = '400px',
  workflow = 'application',
  onNoteSaved,
  className = '',
  compactMode = false,
}: NoteSystemProps) {
  const { toast } = useToast();
  
  // Note state management
  const [editContent, setEditContent] = React.useState<string>('');
  const [hasNote, setHasNote] = React.useState<boolean>(false);
  const [noteId, setNoteId] = React.useState<number | null>(null);
  const [lastSavedContent, setLastSavedContent] = React.useState<string>('');
  const [isAutoSaving, setIsAutoSaving] = React.useState<boolean>(false);
  const [showEditor, setShowEditor] = React.useState<boolean>(true);

  // Form setup
  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      content: '',
    },
  });

  // Fetch user's note
  const { data: notes = [], isLoading, error } = useQuery<Message[]>({
    queryKey: ['/api/applicant-portal/messages', userId],
    queryFn: async () => {
      const response = await fetch('/api/applicant-portal/messages', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch note: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!userId,
  });

  // Set up initial state when note loads
  React.useEffect(() => {
    if (notes.length > 0) {
      const note = notes[0]; // Should only be one note per user
      setEditContent(note.compiledContent || note.content || '');
      setLastSavedContent(note.compiledContent || note.content || '');
      setNoteId(note.id);
      setHasNote(true);
      setShowEditor(false); // Show as card initially
      form.setValue('content', note.compiledContent || note.content || '');
    } else {
      setShowEditor(true); // Show editor if no note exists
    }
  }, [notes, form]);

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/applicant-portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save note');
      }
      
      return response.json();
    },
    onMutate: () => {
      setIsAutoSaving(true);
    },
    onSuccess: (note) => {
      setNoteId(note.id);
      setLastSavedContent(note.compiledContent || note.content);
      setIsAutoSaving(false);
      setHasNote(true);
    },
    onError: () => {
      setIsAutoSaving(false);
    },
  });

  // Send/finalize mutation
  const sendNoteMutation = useMutation({
    mutationFn: async (data: NoteFormData) => {
      const response = await fetch('/api/applicant-portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: data.content }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send note');
      }
      
      return response.json();
    },
    onSuccess: (note) => {
      setShowEditor(false); // Switch to card view
      setHasNote(true);
      
      // Refresh the data
      queryClient.invalidateQueries({
        queryKey: ['/api/applicant-portal/messages', userId],
      });
      
      if (onNoteSaved) {
        onNoteSaved(note);
      }
      
      toast({
        title: "Note saved successfully!",
        description: "Your note has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving note",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-save effect - debounced
  React.useEffect(() => {
    if (editContent.trim() && editContent !== lastSavedContent) {
      const timeoutId = setTimeout(() => {
        autoSaveMutation.mutate(editContent);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [editContent, lastSavedContent]);

  // Handle form submission (finalize note)
  const onSubmit = (data: NoteFormData) => {
    if (data.content.trim()) {
      sendNoteMutation.mutate(data);
    }
  };

  // Auto-save status
  const getAutoSaveStatus = () => {
    if (isAutoSaving) return 'Saving...';
    if (editContent !== lastSavedContent && editContent.trim()) return 'Type to auto-save';
    if (lastSavedContent) return 'Draft saved';
    return '';
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          {title}
          {!showEditor && hasNote && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditor(true)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showEditor ? (
          // Editor view
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RichTextEditor
                        content={editContent}
                        onChange={(content) => {
                          setEditContent(content);
                          field.onChange(content);
                        }}
                        placeholder={placeholder}
                        className={`min-h-[${maxHeight}]`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Auto-save status */}
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{getAutoSaveStatus()}</span>
                <div className="flex gap-2">
                  <Button type="submit" disabled={sendNoteMutation.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    {sendNoteMutation.isPending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        ) : (
          // Card view (display mode)
          <div className="space-y-4">
            <MessageDisplay content={notes[0]?.compiledContent || notes[0]?.content || ''} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default NoteSystem;