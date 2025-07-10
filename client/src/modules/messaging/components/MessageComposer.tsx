// Phase 4: MessageComposer component - Extracted from messaging-system.tsx
// Focused component for creating and editing messages

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from './RichTextEditor';
import { messageFormSchema } from '../services/messageValidator';
import type { MessageFormData, WorkflowType } from '../types/messaging.types';
import { WORKFLOW_CONFIGS } from '../types/workflow.types';

interface MessageComposerProps {
  workflow: WorkflowType;
  onSubmit: (data: MessageFormData) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<MessageFormData>;
  showAdvancedOptions?: boolean;
  placeholder?: string;
  title?: string;
}

export function MessageComposer({
  workflow,
  onSubmit,
  isSubmitting = false,
  defaultValues,
  showAdvancedOptions = false,
  placeholder = 'Type your message...',
  title = 'Compose Message'
}: MessageComposerProps) {
  const workflowConfig = WORKFLOW_CONFIGS[workflow];
  
  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      content: '',
      messageType: 'rich-text',
      priority: 'normal',
      isPrivate: false,
      ...defaultValues
    }
  });

  const handleSubmit = (data: MessageFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Rich Text Content Field */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value}
                      onChange={field.onChange}
                      placeholder={placeholder}
                      enabled={workflowConfig.features.enableRichText}
                      workflow={workflow}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advanced Options */}
            {showAdvancedOptions && (
              <div className="space-y-4 border-t pt-4">
                {/* Message Type */}
                {workflowConfig.features.enableMessageTypes && (
                  <FormField
                    control={form.control}
                    name="messageType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select message type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="text">Plain Text</SelectItem>
                            <SelectItem value="rich-text">Rich Text</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                            <SelectItem value="notification">Notification</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Priority */}
                {workflowConfig.features.enablePriority && (
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Private Toggle */}
                {workflowConfig.features.enablePrivateMessages && (
                  <FormField
                    control={form.control}
                    name="isPrivate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Private Message</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Only visible to managers and administrators
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={isSubmitting || !form.watch('content')?.trim()}
              className="w-full"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}