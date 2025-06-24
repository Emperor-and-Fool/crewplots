// Phase 1: Message validation service skeleton
// Will be populated in Phase 3 with extracted validation logic

import { z } from 'zod';

// Phase 3 TODO: Extract from messaging-system.tsx lines 28-36
// - Message form validation schema
// - Content length validation
// - Type and priority validation

export const messageFormSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(5000, 'Message must be less than 5000 characters'),
  messageType: z.enum(['text', 'rich-text', 'system', 'notification']).default('rich-text'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  isPrivate: z.boolean().default(false),
  receiverId: z.number().optional(),
});

export type MessageFormData = z.infer<typeof messageFormSchema>;

export class MessageValidator {
  static validateContent(content: string): boolean {
    throw new Error('TODO: Implement in Phase 3');
  }
  
  static validateFormData(data: unknown): MessageFormData {
    throw new Error('TODO: Implement in Phase 3');
  }
}