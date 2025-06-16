import { mongoConnection } from '../db-mongo';
import { storage } from '../storage';
import type { NoteRef, InsertNoteRef } from '@shared/schema';
import { ObjectId } from 'mongodb';

export interface ServiceMessage extends NoteRef {
  compiledContent?: string;
}

interface MessageDocument {
  _id?: ObjectId;
  messageId?: number;
  content: string;
  contentType: 'rich-text' | 'plain-text' | 'markdown';
  workflow: string;
  metadata: {
    wordCount: number;
    characterCount: number;
    htmlLength: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

class MessageService {
  async getNoteRefsByUser(userId: number): Promise<ServiceMessage[]> {
    const noteRefs = await storage.getNotesByUser(userId);
    
    const compiledMessages = await Promise.all(
      noteRefs.map(async (noteRef) => this.compileMessage(noteRef))
    );

    return compiledMessages;
  }

  async createNoteRef(userId: number, data: any): Promise<ServiceMessage> {
    const content = data.content || '';
    const contentAnalytics = this.analyzeContent(content);
    
    let documentId: string | null = null;
    
    if (content.trim()) {
      const mongoDoc: MessageDocument = {
        content,
        contentType: 'rich-text',
        workflow: data.workflow || 'general',
        metadata: contentAnalytics,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        await mongoConnection.connect();
        const db = mongoConnection.getDatabase();
        const result = await db.collection('messages').insertOne(mongoDoc);
        documentId = result.insertedId.toString();
      } catch (error) {
        console.error('MongoDB insert failed:', error);
        throw new Error('Failed to store message content');
      }
    }

    const noteRefData: InsertNoteRef = {
      content: documentId || '',
      messageType: data.messageType || 'rich-text',
      userId,
      receiverId: data.receiverId || null,
      isPrivate: data.isPrivate || false,
      priority: data.priority || 'normal',
      workflow: data.workflow || 'general',
      documentId,
      documentType: data.documentType || 'general',
      wordCount: contentAnalytics.wordCount,
      characterCount: contentAnalytics.characterCount,
      htmlLength: contentAnalytics.htmlLength,
      visibility: 'private',
      isEditable: true
    };

    const createdNoteRef = await storage.createNote(noteRefData);
    return this.compileMessage(createdNoteRef);
  }

  async updateNoteRef(messageId: number, userId: number, updates: { content: string }): Promise<ServiceMessage | null> {
    const existingNote = await storage.getNoteById(messageId);
    
    if (!existingNote || existingNote.userId !== userId) {
      return null;
    }

    const contentAnalytics = this.analyzeContent(updates.content);
    let documentId = existingNote.documentId;

    if (updates.content.trim()) {
      const mongoDoc: MessageDocument = {
        content: updates.content,
        contentType: 'rich-text',
        workflow: existingNote.workflow || 'general',
        metadata: contentAnalytics,
        createdAt: new Date(existingNote.createdAt),
        updatedAt: new Date()
      };

      try {
        await mongoConnection.connect();
        const db = mongoConnection.getDatabase();
        
        if (documentId) {
          await db.collection('messages').updateOne(
            { _id: new ObjectId(documentId) },
            { $set: mongoDoc }
          );
        } else {
          const result = await db.collection('messages').insertOne(mongoDoc);
          documentId = result.insertedId.toString();
        }
      } catch (error) {
        console.error('MongoDB update failed:', error);
        throw new Error('Failed to update message content');
      }
    }

    const noteRefUpdates = {
      content: documentId || '',
      documentId,
      wordCount: contentAnalytics.wordCount,
      characterCount: contentAnalytics.characterCount,
      htmlLength: contentAnalytics.htmlLength,
      updatedAt: new Date()
    };

    const updatedNoteRef = await storage.updateNote(messageId, noteRefUpdates);
    return updatedNoteRef ? this.compileMessage(updatedNoteRef) : null;
  }

  async deleteNoteRef(messageId: number, userId: number): Promise<boolean> {
    const existingNote = await storage.getNoteById(messageId);
    
    if (!existingNote || existingNote.userId !== userId) {
      return false;
    }

    if (existingNote.documentId) {
      try {
        await mongoConnection.connect();
        const db = mongoConnection.getDatabase();
        await db.collection('messages').deleteOne({
          _id: new ObjectId(existingNote.documentId)
        });
      } catch (error) {
        console.error('MongoDB delete failed:', error);
      }
    }

    return await storage.deleteNote(messageId);
  }

  private async compileMessage(noteRef: NoteRef): Promise<ServiceMessage> {
    let compiledContent = noteRef.content;

    if (noteRef.documentId && this.isValidObjectId(noteRef.documentId)) {
      try {
        await mongoConnection.connect();
        const db = mongoConnection.getDatabase();
        const document = await db.collection('messages').findOne({
          _id: new ObjectId(noteRef.documentId)
        });

        if (document?.content) {
          compiledContent = document.content;
        }
      } catch (error) {
        console.error('MongoDB fetch failed:', error);
      }
    }

    return {
      ...noteRef,
      compiledContent
    };
  }

  private isValidObjectId(id: string): boolean {
    return ObjectId.isValid(id) && (String(new ObjectId(id)) === id);
  }

  private analyzeContent(content: string): { wordCount: number; characterCount: number; htmlLength: number } {
    const textOnly = content.replace(/<[^>]*>/g, '');
    const words = textOnly.trim() ? textOnly.trim().split(/\s+/) : [];
    
    return {
      wordCount: words.length,
      characterCount: textOnly.length,
      htmlLength: content.length
    };
  }
}

export const messageService = new MessageService();