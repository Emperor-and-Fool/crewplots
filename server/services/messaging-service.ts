import { eq, and, desc, or, isNull } from 'drizzle-orm';
import { db } from '../db';
import { noteRefs, users } from '@shared/schema';
import type { InsertNoteRef, Message, User } from '@shared/schema';
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
      .from(noteRefs)
      .where(and(
        eq(noteRefs.userId, userId),
        eq(noteRefs.workflow, workflow as any),
        isNull(noteRefs.receiverId) // Only notes, not conversations
      ))
      .orderBy(desc(noteRefs.createdAt));

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
        if (document && document.buffer) {
          content = document.buffer.toString('utf-8');
        } else {
          content = note.content || 'Content temporarily unavailable';
        }
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
      .from(noteRefs)
      .where(and(
        eq(noteRefs.userId, userId),
        eq(noteRefs.workflow, workflow as any),
        isNull(noteRefs.receiverId)
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
  async createNote(noteData: InsertNoteRef, requestingUserId: number): Promise<CompiledNote> {
    let documentReference: string | null = null;
    
    // Store content in MongoDB if it exists
    if (noteData.content && noteData.content.trim()) {
      try {
        const contentBuffer = Buffer.from(noteData.content, 'utf-8');
        const document = await documentService.storeDocument(
          contentBuffer,
          {
            filename: `note_${Date.now()}.txt`,
            contentType: 'text/plain',
            size: contentBuffer.length,
            userId: requestingUserId,
            documentType: 'other'
          }
        );
        documentReference = document.documentId;
      } catch (error) {
        console.warn('Failed to store note content in MongoDB, falling back to PostgreSQL:', error);
        // Content will remain in PostgreSQL as fallback
      }
    }

    // Create note metadata in PostgreSQL
    const noteToInsert = {
      ...noteData,
      documentReference,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // If content is stored in MongoDB, keep minimal content for fallback
    if (documentReference) {
      noteToInsert.content = noteData.content?.substring(0, 100) + '...' || '';
    }
    
    const [createdNote] = await db
      .insert(noteRefs)
      .values(noteToInsert)
      .returning();

    // Return compiled note data
    return this.compileNoteData(createdNote, requestingUserId, 'administrator'); // Assume admin role for creator
  }

  // Get single note with compiled data
  async getCompiledNote(noteId: number, requestingUserId: number, requestingUserRole: string): Promise<CompiledNote | null> {
    const note = await db
      .select()
      .from(noteRefs)
      .where(eq(noteRefs.id, noteId))
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
  async getConversationMessages(userId: number, receiverId?: number, limit: number = 50): Promise<NoteRef[]> {
    let whereConditions;

    if (receiverId) {
      // Get messages between user and specific receiver
      whereConditions = and(
        or(
          and(eq(noteRefs.userId, userId), eq(noteRefs.receiverId, receiverId)),
          and(eq(noteRefs.userId, receiverId), eq(noteRefs.receiverId, userId))
        ),
        or(
          eq(noteRefs.userId, userId),
          eq(noteRefs.isPrivate, false) // Include non-private messages from others
        )
      );
    } else {
      // Get user's general messages (sent or received)
      whereConditions = or(
        eq(noteRefs.userId, userId),
        and(eq(noteRefs.receiverId, userId), eq(noteRefs.isPrivate, false))
      );
    }

    return await db
      .select()
      .from(noteRefs)
      .where(whereConditions)
      .orderBy(desc(noteRefs.createdAt))
      .limit(limit);
  }

  async createConversationMessage(messageData: InsertNoteRef): Promise<NoteRef> {
    const [createdMessage] = await db
      .insert(noteRefs)
      .values(messageData)
      .returning();
    
    return createdMessage;
  }

  // General message operations
  async getNoteRefById(messageId: number): Promise<NoteRef | null> {
    const [message] = await db
      .select()
      .from(noteRefs)
      .where(eq(noteRefs.id, messageId))
      .limit(1);
    
    return message || null;
  }

  async updateNoteRef(messageId: number, updates: Partial<InsertNoteRef>): Promise<NoteRef | null> {
    const [updatedMessage] = await db
      .update(noteRefs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(noteRefs.id, messageId))
      .returning();
    
    return updatedMessage || null;
  }

  async deleteNoteRef(messageId: number): Promise<boolean> {
    const result = await db
      .delete(noteRefs)
      .where(eq(noteRefs.id, messageId));
    
    return (result.rowCount || 0) > 0;
  }
}

// Export a singleton instance
export const messagingService = new MessagingService();