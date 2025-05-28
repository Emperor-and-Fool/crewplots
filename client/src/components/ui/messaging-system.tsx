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
import { MessageCircle, Send, Clock, AlertCircle, CheckCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import type { Message, InsertMessage } from '@shared/schema';

// Message form validation schema with extensible features
const messageFormSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(1000, 'Message must be less than 1000 characters'),
  messageType: z.enum(['text', 'rich-text', 'system', 'notification']).default('text'),
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
  
  // UI customization
  title?: string;
  placeholder?: string;
  showPriority?: boolean;
  showPrivateToggle?: boolean;
  showMessageTypes?: boolean;
  maxHeight?: string;
  
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
  applicantId,
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

  // Form setup with validation
  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      content: '',
      messageType: 'text',
      priority: 'normal',
      isPrivate: false,
      applicantId,
    },
  });

  // Fetch messages query
  const { data: messages = [], isLoading, error } = useQuery<Message[]>({
    queryKey: applicantId ? ['/api/messages', applicantId] : ['/api/messages', userId],
    enabled: !!userId,
  });

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData): Promise<Message> => {
      const messageData: InsertMessage = {
        content: data.content,
        messageType: data.messageType,
        priority: data.priority,
        isPrivate: data.isPrivate,
        userId,
        applicantId: data.applicantId,
        isRead: false,
        attachmentUrl: null,
        metadata: null,
      };

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create message: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (newMessage) => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({
        queryKey: applicantId ? ['/api/messages', applicantId] : ['/api/messages', userId],
      });
      
      // Reset form
      form.reset();
      
      // Call custom handler
      onMessageSent?.(newMessage);
      
      // Show success toast
      toast({
        title: 'Message sent',
        description: 'Your message has been successfully sent.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filter messages based on props
  const filteredMessages = React.useMemo(() => {
    let filtered = messages;

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

  // Handle form submission
  const onSubmit = (data: MessageFormData) => {
    if (data.content.trim()) {
      createMessageMutation.mutate(data);
    }
  };

  // Handle loading and error states
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 mr-2" />
            Failed to load messages
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className={compactMode ? 'pb-3' : ''}>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          {title}
          {filteredMessages.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {filteredMessages.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Messages Display */}
        <ScrollArea className={`rounded-md border p-3`} style={{ maxHeight }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
              <span className="ml-2">Loading messages...</span>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-2 opacity-40" />
              <p>No messages yet</p>
              <p className="text-sm">Start a conversation!</p>
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
                  <div className="flex-shrink-0">
                    {getMessageIcon(message.messageType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {message.userId === userId ? 'You' : 'System'}
                      </span>
                      
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
                    </div>
                    
                    <p className="text-sm text-foreground break-words">
                      {message.content}
                    </p>
                    
                    {/* Future: Rich text, attachments, etc. would go here */}
                    {enableMarkdown && message.messageType === 'rich-text' && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Rich text formatting enabled
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Message Composition Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={placeholder}
                      className="resize-none"
                      rows={compactMode ? 2 : 3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advanced Options (Collapsible) */}
            {(showPriority || showPrivateToggle || showMessageTypes) && (
              <div className="flex flex-wrap gap-3">
                {showPriority && (
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem className="flex-1 min-w-[120px]">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                {showMessageTypes && (
                  <FormField
                    control={form.control}
                    name="messageType"
                    render={({ field }) => (
                      <FormItem className="flex-1 min-w-[120px]">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            {enableRichText && <SelectItem value="rich-text">Rich Text</SelectItem>}
                            <SelectItem value="notification">Notification</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {form.watch('content').length}/1000 characters
              </div>
              
              <Button 
                type="submit" 
                disabled={createMessageMutation.isPending || !form.watch('content').trim()}
                className="gap-2"
              >
                {createMessageMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default MessagingSystem;