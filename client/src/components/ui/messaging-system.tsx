import React, { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Bold, Italic, Smile } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import type { Message } from '@shared/schema';

interface MessagingSystemProps {
  applicantId: number;
  currentUserId: number;
  messages: Message[];
  onMessageSave: (content: string) => void;
}

export function MessagingSystem({
  applicantId,
  currentUserId,
  messages,
  onMessageSave,
}: MessagingSystemProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Simple text formatting functions
  const insertFormatting = (before: string, after: string = before) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newMessage.substring(start, end);
    
    const newText = 
      newMessage.substring(0, start) + 
      before + selectedText + after + 
      newMessage.substring(end);
    
    setNewMessage(newText);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length, 
        end + before.length
      );
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = 
      newMessage.substring(0, start) + 
      emoji + 
      newMessage.substring(start);
    
    setNewMessage(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onMessageSave(newMessage.trim());
      setNewMessage('');
      toast({
        title: 'Message sent',
        description: 'Your message has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Failed to send message',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (content: string) => {
    // Simple rendering of bold and italic text
    let rendered = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return <span dangerouslySetInnerHTML={{ __html: rendered }} />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Messages ({messages.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Messages List */}
        <div className="max-h-96 overflow-y-auto space-y-3 border rounded-lg p-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-40" />
              <p>No messages yet</p>
              <p className="text-sm">Start a conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg border ${
                  message.userId === currentUserId
                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 ml-8'
                    : 'bg-gray-50 dark:bg-gray-900/20 mr-8'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium">
                    {message.userId === currentUserId ? 'You' : 'Admin'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
                <div className="text-sm">
                  {renderMessageContent(message.content)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Composition */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Formatting Toolbar */}
          <div className="flex gap-2 border-b pb-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('**')}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('*')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertEmoji('😊')}
              title="Add emoji"
            >
              😊
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertEmoji('👍')}
              title="Add emoji"
            >
              👍
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertEmoji('❤️')}
              title="Add emoji"
            >
              ❤️
            </Button>
          </div>

          <Textarea
            ref={textareaRef}
            placeholder="Type your message here... Use **bold** and *italic* for formatting"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
            className="resize-none"
          />

          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {newMessage.length}/1000 characters
            </div>
            <Button 
              type="submit" 
              disabled={!newMessage.trim() || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}