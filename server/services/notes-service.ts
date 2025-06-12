import { db } from '../db';
import { noteRefs as notes } from '@shared/schema';
import type { InsertNoteRef as InsertNote, NoteRef } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface MongoNoteContent {
  content: string;
  workflow: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

class NotesService {
  private mongoProxyUrl = 'http://localhost:3001';

  /**
   * Check if MongoDB proxy is available
   */
  async isMongoDBProxyAvailable(): Promise<boolean> {
    try {
      console.log('DEBUG: Checking MongoDB proxy availability...');
      const response = await fetch(`${this.mongoProxyUrl}/health`, {
        timeout: 2000
      });
      const health = await response.json();
      const isAvailable = health.mongodb === 'connected';
      console.log('DEBUG: MongoDB proxy available:', isAvailable);
      return isAvailable;
    } catch (error) {
      console.log('DEBUG: MongoDB proxy not available:', error.message);
      return false;
    }
  }

  /**
   * Store note content in MongoDB
   */
  private async storeNoteInMongoDB(content: string, metadata: any): Promise<string> {
    console.log('DEBUG: Storing note content in MongoDB...');
    const response = await fetch(`${this.mongoProxyUrl}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        workflow: metadata.workflow || 'application',
        metadata: metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    });

    if (!response.ok) {
      throw new Error(`MongoDB storage failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('DEBUG: Note stored in MongoDB with ID:', result.documentId);
    return result.documentId;
  }

  /**
   * Retrieve note content from MongoDB
   */
  private async retrieveNoteFromMongoDB(documentId: string): Promise<MongoNoteContent | null> {
    try {
      console.log('DEBUG: Retrieving note from MongoDB:', documentId);
      const response = await fetch(`${this.mongoProxyUrl}/notes/${documentId}`);
      
      if (!response.ok) {
        console.log('DEBUG: Note not found in MongoDB:', documentId);
        return null;
      }

      const noteContent = await response.json();
      console.log('DEBUG: Retrieved note from MongoDB');
      return noteContent;
    } catch (error) {
      console.log('DEBUG: Error retrieving note from MongoDB:', error.message);
      return null;
    }
  }

  /**
   * Create a note - stores metadata in PostgreSQL, content in MongoDB
   */
  async createNote(noteData: InsertNote & { workflow?: string }): Promise<NoteRef> {
    const mongoAvailable = await this.isMongoDBProxyAvailable();
    
    if (!mongoAvailable) {
      console.log('ERROR: MongoDB proxy not available - note creation failed');
      throw new Error('MongoDB storage not available. Notes require MongoDB to be running.');
    }

    console.log('DEBUG: Creating note with MongoDB storage for user', noteData.userId);
    
    // Store note content in MongoDB
    const documentId = await this.storeNoteInMongoDB(noteData.content, {
      workflow: noteData.workflow || 'application',
      userId: noteData.userId,
      applicantId: noteData.applicantId
    });

    // Store metadata in PostgreSQL with MongoDB reference
    const noteToStore = {
      ...noteData,
      content: documentId, // Store MongoDB document ID
      documentReference: documentId
    };

    const [createdNote] = await db.insert(notes).values(noteToStore).returning();
    console.log('DEBUG: Note metadata stored in PostgreSQL with ID:', createdNote.id);
    
    return createdNote;
  }

  /**
   * Get note with content from MongoDB
   */
  async getNote(id: number): Promise<(NoteRef & { fullContent?: string }) | null> {
    console.log('DEBUG: Retrieving note with ID:', id);
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    
    if (!note) {
      console.log('DEBUG: Note not found in PostgreSQL:', id);
      return null;
    }

    // Try to get full content from MongoDB
    const mongoContent = await this.retrieveNoteFromMongoDB(note.content);
    
    return {
      ...note,
      fullContent: mongoContent?.content || note.content
    };
  }

  /**
   * Get notes for a user
   */
  async getNotesForUser(userId: number): Promise<(NoteRef & { fullContent?: string })[]> {
    console.log('DEBUG: Retrieving notes for user:', userId);
    const userNotes = await db.select().from(notes).where(eq(notes.userId, userId));
    
    // Enrich with MongoDB content
    const enrichedNotes = await Promise.all(
      userNotes.map(async (note) => {
        const mongoContent = await this.retrieveNoteFromMongoDB(note.content);
        return {
          ...note,
          fullContent: mongoContent?.content || note.content
        };
      })
    );

    console.log('DEBUG: Retrieved', enrichedNotes.length, 'notes for user', userId);
    return enrichedNotes;
  }

  /**
   * Get notes for an applicant
   */
  async getNotesForApplicant(applicantId: number): Promise<(NoteRef & { fullContent?: string })[]> {
    console.log('DEBUG: Retrieving notes for applicant:', applicantId);
    const applicantNotes = await db.select().from(notes).where(eq(notes.applicantId, applicantId));
    
    // Enrich with MongoDB content
    const enrichedNotes = await Promise.all(
      applicantNotes.map(async (note) => {
        const mongoContent = await this.retrieveNoteFromMongoDB(note.content);
        return {
          ...note,
          fullContent: mongoContent?.content || note.content
        };
      })
    );

    console.log('DEBUG: Retrieved', enrichedNotes.length, 'notes for applicant', applicantId);
    return enrichedNotes;
  }

  /**
   * Update note - updates MongoDB content and PostgreSQL metadata
   */
  async updateNote(id: number, updates: Partial<InsertNote>): Promise<NoteRef | null> {
    console.log('DEBUG: Updating note with ID:', id);
    
    const existingNote = await this.getNote(id);
    if (!existingNote) {
      console.log('DEBUG: Note not found for update:', id);
      return null;
    }

    // If content is being updated, store in MongoDB
    if (updates.content) {
      const mongoAvailable = await this.isMongoDBProxyAvailable();
      
      if (!mongoAvailable) {
        console.log('ERROR: MongoDB proxy not available - note update failed');
        throw new Error('MongoDB storage not available. Note updates require MongoDB to be running.');
      }

      const documentId = await this.storeNoteInMongoDB(updates.content, {
        workflow: 'application',
        userId: existingNote.userId,
        applicantId: existingNote.applicantId
      });

      updates.content = documentId;
      updates.documentReference = documentId;
    }

    const [updatedNote] = await db.update(notes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();

    console.log('DEBUG: Note updated successfully:', id);
    return updatedNote;
  }

  /**
   * Delete note - removes from both PostgreSQL and MongoDB
   */
  async deleteNote(id: number): Promise<boolean> {
    console.log('DEBUG: Deleting note with ID:', id);
    
    const note = await this.getNote(id);
    if (!note) {
      console.log('DEBUG: Note not found for deletion:', id);
      return false;
    }

    // Try to delete from MongoDB (best effort)
    if (note.content && note.content.length === 24) { // ObjectId length check
      try {
        await fetch(`${this.mongoProxyUrl}/notes/${note.content}`, {
          method: 'DELETE'
        });
        console.log('DEBUG: Note content deleted from MongoDB');
      } catch (error) {
        console.log('DEBUG: Failed to delete from MongoDB (continuing):', error.message);
      }
    }

    // Delete from PostgreSQL
    await db.delete(notes).where(eq(notes.id, id));
    console.log('DEBUG: Note metadata deleted from PostgreSQL');
    
    return true;
  }
}

export const notesService = new NotesService();