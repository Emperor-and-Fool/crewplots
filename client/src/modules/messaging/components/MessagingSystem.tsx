import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Clock, AlertCircle, CheckCircle, User, Trash2, Edit2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import type { Message as BaseMessage, InsertMessage } from '@shared/schema';
import { RichTextEditor, MessageDisplay } from './RichTextEditor';

// Extended Message type that includes joined user data
interface Message extends BaseMessage {
  sender?: { id: number; username: string; role: string } | null;
  receiver?: { id: number; username: string; role: string } | null;
}

// Message form validation schema with extensible features
const messageFormSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(5000, 'Message must be less than 5000 characters'),
  messageType: z.enum(['text', 'rich-text', 'system', 'notification']).default('rich-text'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  isPrivate: z.boolean().default(false),
  receiverId: z.number().optional(), // Who receives the message
});

type MessageFormData = z.infer<typeof messageFormSchema>;

// Extensible props interface for future customization
interface MessagingSystemProps {
  // Core configuration
  userId: number;
  receiverId?: number; // Optional - who receives the message
  
  // Module selection - determines behavior
  mode?: 'note' | 'messages'; // Default: 'messages'
  
  // UI customization
  title?: string;
  readOnlyMode?: boolean; // New prop for read-only mode
  placeholder?: string;
  showPriority?: boolean;
  showPrivateToggle?: boolean;
  showMessageTypes?: boolean;
  maxHeight?: string;
  
  // Workflow categorization
  workflow?: 'application' | 'crew' | 'location' | 'scheduling' | 'knowledge' | 'statistics';
  
  // Document storage integration
  documentStorage?: boolean;
  
  // Feature toggles for future extensibility
  enableRichText?: boolean;
  enableFileAttachments?: boolean;
  enableEmoji?: boolean;
  enableMarkdown?: boolean;
  
  // Filtering and display options
  showOnlyUserMessages?: boolean;
  showSystemMessages?: boolean;
  allowMessageDeletion?: boolean;
  
  // Event handlers
  onMessageSent?: (message: Message) => void;
  onMessageClick?: (message: Message) => void;
  
  // Custom styling
  className?: string;
  compactMode?: boolean;
}

// Priority badge styling
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
};

// Message type icon
const getMessageIcon = (messageType: string) => {
  switch (messageType) {
    case 'system': return <AlertCircle className="h-4 w-4" />;
    case 'notification': return <CheckCircle className="h-4 w-4" />;
    default: return <MessageCircle className="h-4 w-4" />;
  }
};

export function MessagingSystem({
  userId,
  receiverId,
  mode = 'messages', // Default to messages mode
  title = 'Messages',
  readOnlyMode = false,
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
  
  // Mode-specific behavior configuration
  const isNoteMode = mode === 'note';
  const isMessagesMode = mode === 'messages';
  
  // Edit state management
  const [editingMessageId, setEditingMessageId] = React.useState<number | null>(null);
  const [editContent, setEditContent] = React.useState<string>('');
  const [hasCreatedMessage, setHasCreatedMessage] = React.useState<boolean>(false);
  const [draftMessageId, setDraftMessageId] = React.useState<number | null>(null);
  const [lastSavedContent, setLastSavedContent] = React.useState<string>('');
  const [isAutoSaving, setIsAutoSaving] = React.useState<boolean>(false);
  const [hasSaveError, setHasSaveError] = React.useState<boolean>(false);

  // Form setup with validation
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

  // Determine the correct API endpoint based on readOnlyMode and user context
  const getNotesEndpoint = () => {
    if (readOnlyMode && isNoteMode && userId) {
      // When in read-only mode (viewing applicant notes), use the applicant-specific endpoint
      return `/api/messaging/notes/applicant/${userId}`;
    }
    // Normal mode - user viewing their own notes or messages
    return isNoteMode ? '/api/messaging/notes' : '/api/messaging/messages';
  };

  // Fetch data via proper hybrid architecture - PostgreSQL first, then MongoDB content
  const { data: messages = [], isLoading, error, refetch } = useQuery<Message[]>({
    queryKey: [getNotesEndpoint(), userId],
    queryFn: async () => {
      const endpoint = getNotesEndpoint();
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required');
        }
        throw new Error(`Failed to fetch ${isNoteMode ? 'notes' : 'messages'}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`${isNoteMode ? 'Notes' : 'Messages'} fetched via hybrid architecture:`, data);
      
      // Check for Redis fallback notifications in headers
      const cacheStatus = response.headers.get('X-Cache-Status');
      const debugMessage = response.headers.get('X-Debug-Message');
      
      if (cacheStatus === 'postgres-fallback') {
        console.warn('🚨 REDIS FAILED: Redis cache unavailable, fell back to PostgreSQL');
        console.log('💾 FALLBACK ACTIVE:', debugMessage);
        
        // Show toast notification to user
        toast({
          title: "Redis Cache failing",
          description: "Fall back to default",
          variant: "destructive"
        });
      } else if (cacheStatus === 'redis-hit') {
        console.log('⚡ REDIS SUCCESS:', debugMessage);
      }
      
      return data;
    },
    enabled: !!userId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always consider data stale for instant updates
  });



  // Delete message mutation
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
      // Update cache using the correct query key
      const currentQueryKey = [getNotesEndpoint(), userId];
      queryClient.setQueryData<Message[]>(currentQueryKey, (old = []) => {
        return old.filter(msg => msg.id !== deletedMessageId);
      });
      
      // Also refetch to ensure consistency
      console.log(`🐛 REFETCH DEBUG: Calling refetch() after delete - this may reset component state`);
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

  // Edit message mutation
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
      // Update cache using the correct query key
      const currentQueryKey = [getNotesEndpoint(), userId];
      queryClient.setQueryData<Message[]>(currentQueryKey, (old = []) => {
        return old.map(msg => 
          msg.id === messageId 
            ? { ...msg, content, updatedAt: new Date() }
            : msg
        );
      });
      
      // Also refetch to ensure consistency
      console.log(`🐛 REFETCH DEBUG: Calling refetch() after edit - this may reset component state`);
      refetch();
      
      // Reset edit state
      setEditingMessageId(null);
      setEditContent('');
      
      toast({
        title: 'Motivation saved',
        description: 'Your motivation has been saved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update note',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create message mutation - use applicant-specific endpoint
  const createMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData): Promise<Message> => {
      const messageData = {
        content: data.content,
        priority: data.priority,
        isPrivate: data.isPrivate,
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
      // Set the flag to indicate a message was created
      setHasCreatedMessage(true);
      
      // Directly update cache with server response (setQueryData strategy)
      queryClient.setQueryData<Message[]>(['/api/messaging/notes', userId], (old = []) => {
        return [...(old || []), newMessage];
      });
      
      // Also use programmatic refetch for guaranteed fresh data
      console.log(`🐛 REFETCH DEBUG: Calling refetch() after create - this may reset component state`);
      await refetch();
      
      // Reset form
      form.reset();
      
      // Call custom handler
      onMessageSent?.(newMessage);
      
      // Show success toast
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

  // Auto-save draft mutation - handles both note and message modes
  const autoSaveDraftMutation = useMutation({
    mutationFn: async (content: string): Promise<Message> => {
      const messageData = {
        content,
        priority: 'normal' as const,
        isPrivate: false,
      };

      // Always POST - server handles upsert logic (client-side prevention disabled)
      console.log(`🐛 AUTO-SAVE DEBUG: Starting auto-save, content length=${content.length}`);
      console.log(`🐛 AUTO-SAVE DEBUG: Using POST request - server will handle upsert`);
      
      const response = await fetch('/api/messaging/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to save note: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`🐛 AUTO-SAVE DEBUG: POST request completed, returned message ID=${result.id}`);
      return result;
    },
    onMutate: () => {
      console.log(`🐛 AUTO-SAVE DEBUG: onMutate - server-side upsert mode`);
      setIsAutoSaving(true);
      setHasSaveError(false);
    },
    onSuccess: (message) => {
      console.log(`🐛 AUTO-SAVE DEBUG: onSuccess - received message ID=${message.id}`);
      setDraftMessageId(message.id);
      setLastSavedContent(message.content);
      setIsAutoSaving(false);
      setHasSaveError(false);
    },
    onError: () => {
      console.log(`🐛 AUTO-SAVE DEBUG: onError - auto-save failed`);
      setIsAutoSaving(false);
      setHasSaveError(true);
    },
  });

  // Filter messages based on props
  const filteredMessages = React.useMemo(() => {
    // Ensure we have an array to work with
    let filtered = Array.isArray(messages) ? messages : [];

    if (showOnlyUserMessages) {
      filtered = filtered.filter(msg => msg.userId === userId);
    }

    if (!showSystemMessages) {
      filtered = filtered.filter(msg => msg.messageType !== 'system');
    }

    return filtered.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages, showOnlyUserMessages, showSystemMessages, userId]);

  // Debounced auto-save effect - simplified server-side prevention
  React.useEffect(() => {
    if (editContent.trim() && editContent !== lastSavedContent) {
      const timeoutId = setTimeout(() => {
        autoSaveDraftMutation.mutate(editContent);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [editContent, lastSavedContent, autoSaveDraftMutation]);

  // Handle form submission
  const onSubmit = (data: MessageFormData) => {
    // If we have a draft, use the proper edit mutation like the Save button
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

  // Handle loading and error states
  if (error) {
    const isAuthError = error.message.includes('Authentication required') || error.message.includes('401') || error.message.includes('403');
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            {isAuthError ? (
              <>
                <div className="text-red-600 dark:text-red-400 font-medium">
                  Please log in to view your {isNoteMode ? 'notes' : 'messages'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Your session may have expired
                </div>
              </>
            ) : (
              <div className="text-red-600 dark:text-red-400">
                Failed to load {isNoteMode ? 'notes' : 'messages'}: {error.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Debug component state
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
        {/* Messages Display */}
        <ScrollArea className={`rounded-md border p-3`} style={{ maxHeight: 'none' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
              <span className="ml-2">Loading messages...</span>
            </div>
          ) : filteredMessages.length === 0 && !createMessageMutation.isPending ? (
            editingMessageId === -1 ? (
              // Show editor when creating first message
              <div className="space-y-3 p-3">
                <RichTextEditor
                  content={editContent}
                  onChange={setEditContent}
                  placeholder="Leave us a message..."
                  className="min-h-[120px]"
                  maxHeight="none"
                />
                
                <div className="flex items-center gap-2 justify-between">
                  <div className="text-xs text-muted-foreground">
                    {editContent.length}/1000 characters
                  </div>
                  
                  {/* Auto-save status indicator */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {isAutoSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                          <span>Saving...</span>
                        </>
                      ) : hasSaveError ? (
                        <>
                          <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                          <span>Save failed</span>
                        </>
                      ) : draftMessageId ? (
                        <>
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span>Draft saved</span>
                        </>
                      ) : editContent.trim() ? (
                        <span>Type to auto-save</span>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (editContent.trim()) {
                          if (draftMessageId) {
                            // Use edit mutation (PUT) for existing draft
                            editMessageMutation.mutate({
                              messageId: draftMessageId,
                              content: editContent
                            });
                          } else {
                            // Only create new if no draft exists
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
              // Show button when no messages exist and not in read-only mode
              !readOnlyMode ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full max-w-sm"
                    onClick={() => {
                      setEditingMessageId(-1);
                      setEditContent('');
                    }}
                  >
                    <Edit2 className="h-5 w-5 mr-2" />
                    {isNoteMode ? 'Write your motivation' : 'Start writing'}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mb-2" />
                  <p>No {isNoteMode ? 'notes' : 'messages'} available</p>
                </div>
              )
            )
          ) : hasCreatedMessage && filteredMessages.length === 0 && (isAutoSaving || autoSaveDraftMutation.isPending) ? (
            // Show loading state only when actively saving and no messages loaded yet
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
              <span className="ml-2">Loading your message...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                    message.userId === userId 
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
                      
                      {message.isPrivate && (
                        <Badge variant="outline">
                          Private
                        </Badge>
                      )}
                      
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                      </span>

                      {/* Edit and Delete buttons - only show for user's own messages and when not in read-only mode */}
                      {message.userId === userId && !readOnlyMode && (
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMessageId(message.id);
                              setEditContent(message.content);
                            }}
                            disabled={editMessageMutation.isPending}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          
                          {allowMessageDeletion && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this note?')) {
                                  deleteMessageMutation.mutate(message.id);
                                }
                              }}
                              disabled={deleteMessageMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {editingMessageId === message.id ? (
                      <div className="space-y-3">
                        <RichTextEditor
                          content={editContent}
                          onChange={setEditContent}
                          placeholder="Leave us a message..."
                          className="min-h-[120px]"
                          maxHeight="none"
                        />
                        
                        <div className="flex items-center gap-2 justify-between">
                          <div className="text-xs text-muted-foreground">
                            {editContent.length}/1000 characters
                          </div>
                          
                          {/* Auto-save status indicator */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {isAutoSaving ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
                                  <span>Saving...</span>
                                </>
                              ) : hasSaveError ? (
                                <>
                                  <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                                  <span>Save failed</span>
                                </>
                              ) : draftMessageId ? (
                                <>
                                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                  <span>Draft saved</span>
                                </>
                              ) : editContent.trim() ? (
                                <span>Type to auto-save</span>
                              ) : null}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (editContent.trim()) {
                                  editMessageMutation.mutate({
                                    messageId: message.id,
                                    content: editContent
                                  });
                                }
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
                      message.messageType === 'rich-text' ? (
                        <MessageDisplay 
                          content={message.content} 
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm text-foreground break-words">
                          {message.content}
                        </p>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>


      </CardContent>
    </Card>
  );
}

export default MessagingSystem;