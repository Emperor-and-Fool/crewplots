import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import type { Message as BaseMessage, InsertMessage } from '@shared/schema';
import { RichTextEditor, MessageDisplay } from '@/components/ui/rich-text-editor';

interface Message extends BaseMessage {
  sender?: { id: number; username: string; role: string } | null;
  receiver?: { id: number; username: string; role: string } | null;
  compiledContent?: string; // Added by MessageService during hybrid compilation
}

const messageFormSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(5000, 'Message must be less than 5000 characters'),
  messageType: z.enum(['text', 'rich-text', 'system', 'notification']).default('rich-text'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  isPrivate: z.boolean().default(false),
  receiverId: z.number().optional(),
});

type MessageFormData = z.infer<typeof messageFormSchema>;

interface MessagingSystemProps {
  userId: number;
  receiverId?: number;
  mode?: 'note' | 'messages';
  title?: string;
  placeholder?: string;
  showPriority?: boolean;
  showPrivateToggle?: boolean;
  showMessageTypes?: boolean;
  maxHeight?: string;
  enableRichText?: boolean;
  enableFileAttachments?: boolean;
  enableEmoji?: boolean;
  enableMarkdown?: boolean;
  showOnlyUserMessages?: boolean;
  showSystemMessages?: boolean;
  allowMessageDeletion?: boolean;
  onMessageSent?: (message: Message) => void;
  onMessageClick?: (message: Message) => void;
  className?: string;
  compactMode?: boolean;
  workflow?: 'application' | 'crew' | 'location' | 'scheduling' | 'knowledge' | 'statistics';
  documentStorage?: boolean;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
};

export function MessagingSystem({
  userId,
  receiverId,
  mode = 'messages',
  title = 'Messages',
  placeholder = 'Type your message here...',
  showPriority = true,
  showPrivateToggle = true,
  showMessageTypes = false,
  maxHeight = '400px',
  enableRichText = false,
  enableFileAttachments = false,
  enableEmoji = false,
  enableMarkdown = false,
  showOnlyUserMessages = false,
  showSystemMessages = true,
  allowMessageDeletion = false,
  onMessageSent,
  onMessageClick,
  className = '',
  compactMode = false,
}: MessagingSystemProps) {
  const { toast } = useToast();
  
  const isNoteMode = mode === 'note';
  const isMessagesMode = mode === 'messages';
  
  const [editingMessageId, setEditingMessageId] = React.useState<number | null>(null);
  const [editContent, setEditContent] = React.useState<string>('');
  const [hasCreatedMessage, setHasCreatedMessage] = React.useState<boolean>(false);
  const [draftMessageId, setDraftMessageId] = React.useState<number | null>(null);
  const [lastSavedContent, setLastSavedContent] = React.useState<string>('');
  const [isAutoSaving, setIsAutoSaving] = React.useState<boolean>(false);
  const [hasSaveError, setHasSaveError] = React.useState<boolean>(false);

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      content: '',
      messageType: 'rich-text',
      priority: 'normal',
      isPrivate: false,
      receiverId,
    },
  });

  const { data: messages = [], isLoading, error, refetch } = useQuery<Message[]>({
    queryKey: isNoteMode ? ['/api/messaging/notes', userId] : ['/api/messaging/messages', userId],
    queryFn: async () => {
      const endpoint = isNoteMode ? '/api/messaging/notes' : '/api/messaging/messages';
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${isNoteMode ? 'notes' : 'messages'}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`${isNoteMode ? 'Notes' : 'Messages'} fetched via hybrid architecture:`, data);
      return data;
    },
    enabled: !!userId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number): Promise<void> => {
      const response = await fetch(`/api/messaging/notes/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete note: ${response.statusText}`);
      }
    },
    onSuccess: (_, deletedMessageId) => {
      queryClient.setQueryData<Message[]>(['/api/messaging/notes', userId], (old = []) => {
        return old.filter(msg => msg.id !== deletedMessageId);
      });
      
      refetch();
      
      toast({
        title: 'Note deleted',
        description: 'Your note has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete note',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number, content: string }): Promise<void> => {
      const response = await fetch(`/api/messaging/notes/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update note: ${response.statusText}`);
      }
    },
    onSuccess: (_, { messageId, content }) => {
      queryClient.setQueryData<Message[]>(['/api/messaging/notes', userId], (old = []) => {
        return old.map(msg => 
          msg.id === messageId 
            ? { ...msg, content, updatedAt: new Date() }
            : msg
        );
      });
      
      refetch();
      setEditingMessageId(null);
      setEditContent('');
      setDraftMessageId(null);
      setLastSavedContent('');
      
      toast({
        title: isNoteMode ? 'Note updated' : 'Message updated',
        description: isNoteMode ? 'Your note has been saved.' : 'Your message has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: isNoteMode ? 'Failed to update note' : 'Failed to update message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData): Promise<Message> => {
      const messageData = {
        content: data.content,
        messageType: data.messageType,
        priority: data.priority,
        isPrivate: data.isPrivate,
        receiverId: data.receiverId,
      };

      const response = await fetch('/api/messaging/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to create message: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: async (newMessage) => {
      setHasCreatedMessage(true);
      
      queryClient.setQueryData<Message[]>(['/api/messaging/notes', userId], (old = []) => {
        return [...(old || []), newMessage];
      });
      
      await refetch();
      
      form.reset();
      
      onMessageSent?.(newMessage);
      
      toast({
        title: isNoteMode ? 'Note saved' : 'Message sent',
        description: isNoteMode ? 'Your note has been saved.' : 'Your message has been sent.',
      });
    },
    onError: (error) => {
      toast({
        title: isNoteMode ? 'Failed to save note' : 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const autoSaveDraftMutation = useMutation({
    mutationFn: async (content: string): Promise<Message> => {
      if (draftMessageId) {
        const response = await fetch(`/api/messaging/notes/${draftMessageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to auto-save note: ${response.statusText}`);
        }

        return response.json();
      } else {
        const response = await fetch('/api/messaging/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            messageType: 'rich-text',
            priority: 'normal',
            isPrivate: false
          }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to create note: ${response.statusText}`);
        }

        return response.json();
      }
    },
    onSuccess: (savedMessage) => {
      if (!draftMessageId) {
        setDraftMessageId(savedMessage.id);
      }
      setLastSavedContent(editContent);
      setIsAutoSaving(false);
      setHasSaveError(false);
    },
    onError: () => {
      setIsAutoSaving(false);
      setHasSaveError(true);
    },
  });

  const filteredMessages = React.useMemo(() => {
    if (!messages) return [];
    
    let filtered = messages;
    
    if (showOnlyUserMessages) {
      filtered = filtered.filter(msg => msg.userId === userId);
    }
    
    if (!showSystemMessages) {
      filtered = filtered.filter(msg => msg.messageType !== 'system');
    }
    
    return filtered;
  }, [messages, showOnlyUserMessages, showSystemMessages, userId]);

  React.useEffect(() => {
    if (editContent && filteredMessages.length > 0) {
      const shouldAutoSave = editContent.trim() !== lastSavedContent.trim() && 
                           editContent.trim().length > 0 && 
                           !isAutoSaving;

      if (shouldAutoSave && isNoteMode) {
        setIsAutoSaving(true);
        
        const timeoutId = setTimeout(() => {
          autoSaveDraftMutation.mutate(editContent);
        }, 500);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [editContent, lastSavedContent, draftMessageId, filteredMessages, isNoteMode]);

  const onSubmit = (data: MessageFormData) => {
    if (draftMessageId && editContent.trim()) {
      editMessageMutation.mutate({
        messageId: draftMessageId,
        content: editContent
      });
      return;
    }
    
    if (data.content.trim()) {
      createMessageMutation.mutate(data);
    }
  };

  const resetForm = () => {
    form.reset();
    setEditingMessageId(null);
    setEditContent('');
    setDraftMessageId(null);
    setLastSavedContent('');
    setHasCreatedMessage(false);
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-red-600 dark:text-red-400">
            Failed to load {isNoteMode ? 'notes' : 'messages'}
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log('MessagingSystem render state:', {
    isLoading,
    messagesLength: messages.length,
    filteredMessagesLength: filteredMessages.length,
    editingMessageId,
    createMutationPending: createMessageMutation.isPending,
    isNoteMode
  });

  return (
    <Card className={className}>
      <CardHeader className={compactMode ? 'pb-3' : ''}>
        <div className="flex items-center gap-2 text-base font-medium">
          <MessageCircle className="h-4 w-4" />
          {title}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ScrollArea className={`rounded-md border p-3`} style={{ maxHeight: 'none' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
              <span className="ml-2">Loading messages...</span>
            </div>
          ) : filteredMessages.length === 0 && !createMessageMutation.isPending ? (
            editingMessageId === -1 ? (
              <div className="space-y-3">
                <RichTextEditor
                  content={editContent}
                  onChange={setEditContent}
                  placeholder={placeholder}
                  className="min-h-[120px]"
                  maxHeight="none"
                />
                
                <div className="flex items-center gap-2 justify-between">
                  <div className="text-xs text-muted-foreground">
                    {editContent.length}/1000 characters
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {isAutoSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                          Auto-saving...
                        </>
                      ) : hasSaveError ? (
                        <span className="text-red-500">Save failed</span>
                      ) : lastSavedContent.trim() && editContent.trim() === lastSavedContent.trim() ? (
                        <span className="text-green-600">Saved</span>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        if (editContent.trim()) {
                          if (draftMessageId) {
                            editMessageMutation.mutate({
                              messageId: draftMessageId,
                              content: editContent
                            });
                          } else {
                            createMessageMutation.mutate({
                              content: editContent,
                              messageType: 'rich-text',
                              priority: 'normal',
                              isPrivate: false
                            });
                          }
                          setEditingMessageId(null);
                          setEditContent('');
                        }
                      }}
                      disabled={editMessageMutation.isPending || createMessageMutation.isPending || !editContent.trim()}
                    >
                      {createMessageMutation.isPending ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                      ) : (
                        <Send className="h-3 w-3 mr-1" />
                      )}
                      {isNoteMode ? 'Save' : 'Send'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingMessageId(null);
                        setEditContent('');
                      }}
                      disabled={createMessageMutation.isPending}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm mt-1">Start the conversation!</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setEditingMessageId(-1)}
                >
                  Create First Message
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    editingMessageId === message.id 
                      ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
                      : 'bg-gray-50 dark:bg-gray-900/20'
                  }`}
                  onClick={() => onMessageClick?.(message)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      
                      {message.priority !== 'normal' && (
                        <Badge className={getPriorityColor(message.priority)}>
                          {message.priority}
                        </Badge>
                      )}
                      
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    
                    {editingMessageId === message.id ? (
                      <div className="space-y-3 mt-3">
                        <RichTextEditor
                          content={editContent}
                          onChange={setEditContent}
                          placeholder={placeholder}
                          className="min-h-[120px]"
                          maxHeight="none"
                        />
                        
                        <div className="flex items-center gap-2 justify-between">
                          <div className="text-xs text-muted-foreground">
                            {editContent.length}/1000 characters
                          </div>
                          
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {isAutoSaving ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                  Auto-saving...
                                </>
                              ) : hasSaveError ? (
                                <span className="text-red-500">Save failed</span>
                              ) : lastSavedContent.trim() && editContent.trim() === lastSavedContent.trim() ? (
                                <span className="text-green-600">Saved</span>
                              ) : null}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                editMessageMutation.mutate({
                                  messageId: message.id,
                                  content: editContent
                                });
                              }}
                              disabled={editMessageMutation.isPending || !editContent.trim()}
                            >
                              {editMessageMutation.isPending ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                              ) : (
                                <Save className="h-3 w-3 mr-1" />
                              )}
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditContent('');
                              }}
                              disabled={editMessageMutation.isPending}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMessageId(message.id);
                          setEditContent((message as any).compiledContent || message.content);
                        }}
                      >
                        <MessageDisplay content={(message as any).compiledContent || message.content} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredMessages.length > 0 && editingMessageId === -1 && (
                <div className="space-y-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <RichTextEditor
                    content={editContent}
                    onChange={setEditContent}
                    placeholder={placeholder}
                    className="min-h-[120px]"
                    maxHeight="none"
                  />
                  
                  <div className="flex items-center gap-2 justify-between">
                    <div className="text-xs text-muted-foreground">
                      {editContent.length}/1000 characters
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          if (editContent.trim()) {
                            createMessageMutation.mutate({
                              content: editContent,
                              messageType: 'rich-text',
                              priority: 'normal',
                              isPrivate: false
                            });
                            setEditingMessageId(null);
                            setEditContent('');
                          }
                        }}
                        disabled={createMessageMutation.isPending || !editContent.trim()}
                      >
                        {createMessageMutation.isPending ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                        ) : (
                          <Send className="h-3 w-3 mr-1" />
                        )}
                        {isNoteMode ? 'Save' : 'Send'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingMessageId(null);
                          setEditContent('');
                        }}
                        disabled={createMessageMutation.isPending}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {filteredMessages.length > 0 && editingMessageId !== -1 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingMessageId(-1)}
              disabled={createMessageMutation.isPending}
            >
              Add New Message
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}