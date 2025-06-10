import { eq, and, desc, or, isNull } from 'drizzle-orm';
import { db } from '../db';
import { messages } from '@shared/schema';
import type { InsertMessage, Message } from '@shared/schema';

export class MessagingService {
  
  // Notes-related business logic
  async getNotesByWorkflow(userId: number, workflow: string, userRole: string): Promise<Message[]> {
    const workflowNotes = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.userId, userId),
        eq(messages.workflow, workflow as any),
        isNull(messages.receiverId) // Only notes, not conversations
      ))
      .orderBy(desc(messages.createdAt));

    // Filter by role permissions
    return workflowNotes.filter(note => {
      if (!note.visibleToRoles || note.visibleToRoles.length === 0) {
        return true; // No restrictions = visible to all
      }
      return note.visibleToRoles.includes(userRole);
    });
  }

  async getNotesCountByWorkflow(userId: number, workflow: string, userRole: string): Promise<number> {
    const workflowNotes = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.userId, userId),
        eq(messages.workflow, workflow as any),
        isNull(messages.receiverId)
      ));

    // Filter by role permissions
    const visibleCount = workflowNotes.filter(note => {
      if (!note.visibleToRoles || note.visibleToRoles.length === 0) {
        return true;
      }
      return note.visibleToRoles.includes(userRole);
    }).length;

    return visibleCount;
  }

  async createNote(noteData: InsertMessage): Promise<Message> {
    const [createdNote] = await db
      .insert(messages)
      .values(noteData)
      .returning();
    
    return createdNote;
  }

  // Conversation-related business logic
  async getConversationMessages(userId: number, receiverId?: number, limit: number = 50): Promise<Message[]> {
    let whereConditions;

    if (receiverId) {
      // Get messages between user and specific receiver
      whereConditions = and(
        or(
          and(eq(messages.userId, userId), eq(messages.receiverId, receiverId)),
          and(eq(messages.userId, receiverId), eq(messages.receiverId, userId))
        ),
        or(
          eq(messages.userId, userId),
          eq(messages.isPrivate, false) // Include non-private messages from others
        )
      );
    } else {
      // Get user's general messages (sent or received)
      whereConditions = or(
        eq(messages.userId, userId),
        and(eq(messages.receiverId, userId), eq(messages.isPrivate, false))
      );
    }

    return await db
      .select()
      .from(messages)
      .where(whereConditions)
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async createConversationMessage(messageData: InsertMessage): Promise<Message> {
    const [createdMessage] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    
    return createdMessage;
  }

  // General message operations
  async getMessageById(messageId: number): Promise<Message | null> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);
    
    return message || null;
  }

  async updateMessage(messageId: number, updates: Partial<InsertMessage>): Promise<Message | null> {
    const [updatedMessage] = await db
      .update(messages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning();
    
    return updatedMessage || null;
  }

  async deleteMessage(messageId: number): Promise<boolean> {
    const result = await db
      .delete(messages)
      .where(eq(messages.id, messageId));
    
    return result.rowCount > 0;
  }
}

// Export a singleton instance
export const messagingService = new MessagingService();