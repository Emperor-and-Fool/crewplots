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
  applicantId: z.number().optional(), // For applicant-specific messages
});

type MessageFormData = z.infer<typeof messageFormSchema>;

// Extensible props interface for future customization
interface MessagingSystemProps {
  // Core configuration
  userId: number;
  applicantId?: number; // Optional - for applicant-specific messages
  
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
      applicantId: applicantId,
    },
  });

  // Fetch messages query with intelligent caching
  const messagesQuery = useQuery({
    queryKey: ['messages', applicantId ? `applicant-${applicantId}` : 'general'],
    queryFn: () => {
      const params = new URLSearchParams();
      if (applicantId) params.set('applicantId', applicantId.toString());
      if (showOnlyUserMessages) params.set('userId', userId.toString());
      return fetch(`/api/messages?${params}`).then(res => res.json());
    },
    staleTime: 30000, // Consider fresh for 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute
  });

  // Create message mutation with optimistic updates
  const createMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      const messageData: Partial<InsertMessage> = {
        content: data.content,
        messageType: data.messageType,
        priority: data.priority,
        isPrivate: data.isPrivate,
        senderId: userId,
        applicantId: data.applicantId,
        isRead: false,
        sentAt: new Date(),
      };

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onSuccess: (newMessage) => {
      // Reset form
      form.reset();
      
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ 
        queryKey: ['messages', applicantId ? `applicant-${applicantId}` : 'general'] 
      });
      
      // Call success callback
      onMessageSent?.(newMessage);
      
      toast({
        title: 'Message sent successfully',
        description: 'Your message has been delivered.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to send message',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: MessageFormData) => {
    createMessageMutation.mutate(data);
  };

  // Filter messages based on props
  const filteredMessages = messagesQuery.data?.filter((message: Message) => {
    if (!showSystemMessages && message.messageType === 'system') return false;
    if (showOnlyUserMessages && message.senderId !== userId) return false;
    return true;
  }) || [];

  if (messagesQuery.isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
        <ScrollArea className="border rounded-lg p-3" style={{ maxHeight }}>
          {filteredMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm mt-1">Start the conversation below</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((message: Message) => (
                <div
                  key={message.id}
                  onClick={() => onMessageClick?.(message)}
                  className={`p-3 rounded-lg border transition-colors ${
                    onMessageClick ? 'cursor-pointer hover:bg-muted/50' : ''
                  } ${
                    message.senderId === userId
                      ? 'bg-primary/5 border-primary/20 ml-8'
                      : 'bg-muted/30 mr-8'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getMessageIcon(message.messageType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {message.senderId === userId ? 'You' : `User ${message.senderId}`}
                        </span>
                        
                        {message.priority !== 'normal' && (
                          <Badge 
                            className={`text-xs ${getPriorityColor(message.priority)}`}
                            variant="secondary"
                          >
                            {message.priority}
                          </Badge>
                        )}
                        
                        {message.isPrivate && (
                          <Badge variant="outline" className="text-xs">
                            Private
                          </Badge>
                        )}
                        
                        <span className="text-xs text-muted-foreground ml-auto">
                          {message.sentAt ? format(new Date(message.sentAt), 'MMM d, HH:mm') : ''}
                        </span>
                      </div>
                      
                      <p className="text-sm text-foreground break-words">
                        {message.content}
                      </p>
                      
                      {!message.isRead && message.senderId !== userId && (
                        <div className="flex items-center gap-1 mt-2">
                          <div className="h-2 w-2 bg-primary rounded-full"></div>
                          <span className="text-xs text-primary">New</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Message Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {/* Message Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={placeholder}
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Controls */}
            {(showPriority || showPrivateToggle || showMessageTypes) && (
              <div className="flex flex-wrap gap-2">
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
                            <SelectItem value="low">Low Priority</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High Priority</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                {showPrivateToggle && (
                  <FormField
                    control={form.control}
                    name="isPrivate"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="rounded border border-input bg-background"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          Private message
                        </FormLabel>
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
                            <SelectItem value="rich-text">Rich Text</SelectItem>
                            <SelectItem value="notification">Notification</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {form.watch('content')?.length || 0}/1000 characters
              </div>
              
              <Button 
                type="submit" 
                disabled={createMessageMutation.isPending || !form.watch('content')?.trim()}
                className="flex items-center gap-2"
              >
                {createMessageMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {createMessageMutation.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}