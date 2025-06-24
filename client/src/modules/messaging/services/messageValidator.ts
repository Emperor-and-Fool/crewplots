// Phase 2: Message validation service
// Extracted validation logic from messaging-system.tsx

import { z } from 'zod';
import type { MessageFormData, MessageType, MessagePriority } from '../types/messaging.types';

// Message form validation schema (from messaging-system.tsx lines 28-36)
export const messageFormSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(5000, 'Message must be less than 5000 characters'),
  messageType: z.enum(['text', 'rich-text', 'system', 'notification']).default('rich-text'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  isPrivate: z.boolean().default(false),
  receiverId: z.number().optional(),
});

// Note validation for application workflow (from application-notes.tsx)
export const noteFormSchema = z.object({
  content: z.string()
    .min(1, 'Note content is required')
    .max(1000, 'Note must be less than 1000 characters'),
  workflow: z.string().default('application'),
  messageType: z.string().default('text'),
  visibleToRoles: z.array(z.string()).default(['manager', 'administrator']),
});

export type NoteFormData = z.infer<typeof noteFormSchema>;

export class MessageValidator {
  static validateContent(content: string): boolean {
    return content.length > 0 && content.length <= 5000;
  }
  
  static validateFormData(data: unknown): MessageFormData {
    return messageFormSchema.parse(data);
  }
  
  static validateNoteData(data: unknown): NoteFormData {
    return noteFormSchema.parse(data);
  }
  
  static validateMessageType(type: string): type is MessageType {
    return ['text', 'rich-text', 'system', 'notification'].includes(type);
  }
  
  static validatePriority(priority: string): priority is MessagePriority {
    return ['low', 'normal', 'high', 'urgent'].includes(priority);
  }
}