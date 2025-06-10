import { eq, and, desc, or, isNull } from 'drizzle-orm';
import { db } from '../db';
import { messages, users } from '@shared/schema';
import type { InsertMessage, Message, User } from '@shared/schema';
import { documentService } from './document-service';

// Compiled note type for frontend consumption
export interface CompiledNote extends Omit<Message, 'content'> {
  content: string;
  author: {
    id: number;
    name: string;
    role: string;
  };
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
}

export class MessagingService {
  
  // Notes-related business logic with compiled data assembly
  async getNotesByWorkflow(userId: number, workflow: string, userRole: string): Promise<CompiledNote[]> {
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
    const filteredNotes = workflowNotes.filter(note => {
      if (!note.visibleToRoles || note.visibleToRoles.length === 0) {
        return true; // No restrictions = visible to all
      }
      return note.visibleToRoles.includes(userRole);
    });

    // Compile complete note data
    const compiledNotes: CompiledNote[] = [];
    for (const note of filteredNotes) {
      const compiled = await this.compileNoteData(note, userId, userRole);
      compiledNotes.push(compiled);
    }

    return compiledNotes;
  }

  // Core data compilation method - assembles complete note data from multiple sources
  private async compileNoteData(note: Message, requestingUserId: number, requestingUserRole: string): Promise<CompiledNote> {
    // 1. Get content from MongoDB or fallback to PostgreSQL
    let content = note.content || '';
    if (note.documentReference) {
      try {
        const document = await documentService.getDocument(note.documentReference);
        content = document.content;
      } catch (error) {
        console.warn(`Failed to retrieve document content for note ${note.id}:`, error);
        // Graceful degradation - use PostgreSQL content or show unavailable message
        content = note.content || 'Content temporarily unavailable';
      }
    }

    // 2. Resolve author information
    const author = await this.resolveAuthor(note.userId);

    // 3. Compute permissions
    const permissions = this.computeNotePermissions(note, requestingUserId, requestingUserRole);

    // 4. Return compiled object
    return {
      ...note,
      content,
      author,
      permissions
    };
  }

  // Resolve author with fallback for deleted users
  private async resolveAuthor(authorId: number): Promise<{ id: number; name: string; role: string }> {
    try {
      const author = await db
        .select({
          id: users.id,
          name: users.name,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, authorId))
        .limit(1);

      if (author.length > 0) {
        return author[0];
      }
    } catch (error) {
      console.warn(`Failed to resolve author ${authorId}:`, error);
    }

    // Fallback for deleted/missing users
    return {
      id: authorId,
      name: 'Former User',
      role: 'unknown'
    };
  }

  // Compute note permissions based on business rules
  private computeNotePermissions(note: Message, userId: number, userRole: string): { canEdit: boolean; canDelete: boolean; canShare: boolean } {
    const isAuthor = note.userId === userId;
    const isManager = ['administrator', 'manager', 'crew_manager'].includes(userRole);
    
    return {
      canEdit: isAuthor || isManager,
      canDelete: isAuthor || userRole === 'administrator',
      canShare: isManager || isAuthor
    };
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

  // Create note with hybrid storage (metadata in PostgreSQL, content in MongoDB)
  async createNote(noteData: InsertMessage, requestingUserId: number): Promise<CompiledNote> {
    let documentReference: string | null = null;
    
    // Store content in MongoDB if it exists
    if (noteData.content && noteData.content.trim()) {
      try {
        const document = await documentService.storeDocument({
          filename: `note_${Date.now()}.txt`,
          content: noteData.content,
          contentType: 'text/plain',
          uploadedBy: requestingUserId,
          metadata: {
            type: 'note_content',
            workflow: noteData.workflow || 'general',
            createdAt: new Date().toISOString()
          }
        });
        documentReference = document.id;
      } catch (error) {
        console.warn('Failed to store note content in MongoDB, falling back to PostgreSQL:', error);
        // Content will remain in PostgreSQL as fallback
      }
    }

    // Create note metadata in PostgreSQL
    const [createdNote] = await db
      .insert(messages)
      .values({
        ...noteData,
        content: documentReference ? null : noteData.content, // Clear content if stored in MongoDB
        documentReference,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Return compiled note data
    return this.compileNoteData(createdNote, requestingUserId, 'administrator'); // Assume admin role for creator
  }

  // Get single note with compiled data
  async getCompiledNote(noteId: number, requestingUserId: number, requestingUserRole: string): Promise<CompiledNote | null> {
    const note = await db
      .select()
      .from(messages)
      .where(eq(messages.id, noteId))
      .limit(1);

    if (note.length === 0) {
      return null;
    }

    // Check permissions
    const noteData = note[0];
    if (noteData.visibleToRoles && noteData.visibleToRoles.length > 0) {
      if (!noteData.visibleToRoles.includes(requestingUserRole) && noteData.userId !== requestingUserId) {
        return null; // Not authorized to view
      }
    }

    return this.compileNoteData(noteData, requestingUserId, requestingUserRole);
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
    
    return (result.rowCount || 0) > 0;
  }
}

// Export a singleton instance
export const messagingService = new MessagingService();