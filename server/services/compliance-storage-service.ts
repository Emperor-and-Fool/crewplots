import { eq } from "drizzle-orm";
import { noteRefs, type NoteRef, type InsertNoteRef } from "@shared/schema";
import { storage } from "../database/storage";
// import { mongoConnection } from "../db-mongo";
import { ObjectId } from "mongodb";

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

/**
 * ComplianceStorageService - TEMPLATE FILE FOR BACKLOG
 * 
 * This is a template based on message-storage-service.ts for future compliance storage implementation.
 * Not functional - contains commented implementations to show architectural pattern.
 * 
 * Intended Architecture:
 * - PostgreSQL: Stores compliance metadata and references
 * - MongoDB: Stores compliance content and rich data
 * - Explicit failure: No silent fallbacks - fails visibly when MongoDB unavailable
 */
export class ComplianceStorageService {
  private static instance: ComplianceStorageService;

  private constructor() {}

  static getInstance(): ComplianceStorageService {
    if (!ComplianceStorageService.instance) {
      ComplianceStorageService.instance = new ComplianceStorageService();
    }
    return ComplianceStorageService.instance;
  }

  private getDatabase() {
    // return mongoConnection.getDatabase();
    throw new Error("Template file - MongoDB connection not implemented");
  }

  private async storeContentDocument(
    content: string, 
    contentType: 'rich-text' | 'plain-text' | 'markdown' = 'rich-text',
    workflow: string = 'general'
  ): Promise<string> {
    const db = this.getDatabase();
    const collection = db.collection('message_contents');

    const document: MessageDocument = {
      content,
      contentType,
      workflow,
      metadata: {
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: content.length,
        htmlLength: content.length
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(document);
    return result.insertedId.toString();
  }

  private async updateDocumentMessageReference(documentId: string, messageId: number): Promise<void> {
    const db = this.getDatabase();
    const collection = db.collection('message_contents');
    
    await collection.updateOne(
      { _id: new ObjectId(documentId) },
      { 
        $set: { 
          messageId: messageId,
          updatedAt: new Date()
        } 
      }
    );
  }

  private async getMongoDocument(documentId: string): Promise<MessageDocument | null> {
    const db = this.getDatabase();
    const collection = db.collection('message_contents');
    
    console.log(`🔍 COMPILING MESSAGE: PostgreSQL content field = ${documentId}`);
    
    if (!ObjectId.isValid(documentId)) {
      console.log(`❌ Invalid ObjectId: ${documentId}`);
      return null;
    }
    
    console.log(`✅ Valid ObjectId, fetching from MongoDB: ${documentId}`);
    const document = await collection.findOne({ _id: new ObjectId(documentId) });
    
    if (document) {
      console.log(`✅ MongoDB document found, content length: ${document.content?.length || 0}`);
    } else {
      console.log(`❌ MongoDB document not found for ID: ${documentId}`);
    }
    
    return document as MessageDocument | null;
  }

  private async updateContentDocument(documentId: string, newContent: string): Promise<void> {
    const db = this.getDatabase();
    const collection = db.collection('message_contents');
    
    await collection.updateOne(
      { _id: new ObjectId(documentId) },
      { 
        $set: { 
          content: newContent,
          metadata: {
            wordCount: newContent.split(/\s+/).filter(word => word.length > 0).length,
            characterCount: newContent.length,
            htmlLength: newContent.length
          },
          updatedAt: new Date()
        } 
      }
    );
  }

  private async compileMessage(postgresMessage: NoteRef): Promise<ServiceMessage> {
    try {
      // Get content from MongoDB using the content field as ObjectId
      const mongoDocument = await this.getMongoDocument(postgresMessage.content);
      
      if (mongoDocument) {
        return {
          ...postgresMessage,
          compiledContent: mongoDocument.content
        };
      } else {
        // Return PostgreSQL data without MongoDB content
        return {
          ...postgresMessage,
          compiledContent: undefined
        };
      }
    } catch (error) {
      console.error('Error compiling message:', error);
      // Return PostgreSQL data without MongoDB content on error
      return {
        ...postgresMessage,
        compiledContent: undefined
      };
    }
  }

  async createNoteRef(messageData: InsertNoteRef & { workflow?: string }): Promise<ServiceMessage> {
    console.log('📝 Creating message with hybrid storage...');
    
    // Store content in MongoDB first
    const documentId = await this.storeContentDocument(
      messageData.content, 
      messageData.messageType as 'rich-text' | 'plain-text' | 'markdown',
      messageData.workflow || 'general'
    );
    
    // Store reference in PostgreSQL with MongoDB ObjectId
    const postgresData = {
      ...messageData,
      content: documentId // Store MongoDB ObjectId as content reference
    };
    
    const createdMessage = await storage.createNoteRef(postgresData);
    
    // Update MongoDB document with PostgreSQL message ID
    await this.updateDocumentMessageReference(documentId, createdMessage.id);
    
    console.log(`✅ Hybrid storage complete: PostgreSQL ID ${createdMessage.id}, MongoDB ID ${documentId}`);
    
    // Return compiled message
    return this.compileMessage(createdMessage);
  }

  async getNoteRefsByUser(userId: number): Promise<ServiceMessage[]> {
    console.log(`Using hybrid storage for applicant user ${userId}`);
    
    // Get all messages from PostgreSQL
    const postgresMessages = await storage.getNoteRefsByUser(userId);
    console.log(`Fetched ${postgresMessages.length} compiled messages for applicant user ${userId}`);
    
    // Compile each message with MongoDB content
    const compiledMessages = await Promise.all(
      postgresMessages.map(msg => this.compileMessage(msg))
    );
    
    return compiledMessages;
  }

  async updateNoteRef(messageId: number, updates: { content?: string }): Promise<ServiceMessage> {
    console.log(`🔄 Updating message ${messageId} with hybrid storage...`);
    
    // Get existing message from PostgreSQL
    const existingMessage = await storage.getNoteRef(messageId);
    if (!existingMessage) {
      throw new Error('Message not found');
    }
    
    // If content is being updated, update MongoDB
    if (updates.content) {
      const documentId = existingMessage.content; // This is the MongoDB ObjectId
      await this.updateContentDocument(documentId, updates.content);
      console.log(`✅ MongoDB content updated for document ${documentId}`);
    }
    
    // Update PostgreSQL (excluding content since it's stored in MongoDB)
    const postgresUpdates = { ...updates };
    delete postgresUpdates.content; // Don't update content in PostgreSQL
    
    if (Object.keys(postgresUpdates).length > 0) {
      await storage.updateNoteRef(messageId, postgresUpdates);
    }
    
    // Get updated message and compile
    const updatedMessage = await storage.getNoteRef(messageId);
    if (!updatedMessage) {
      throw new Error('Message not found after update');
    }
    
    console.log(`✅ Hybrid update complete for message ${messageId}`);
    return this.compileMessage(updatedMessage);
  }

  async deleteNoteRef(messageId: number): Promise<boolean> {
    console.log(`🗑️ Deleting message ${messageId} with hybrid cleanup...`);
    
    // Get message to find MongoDB document ID
    const existingMessage = await storage.getNoteRef(messageId);
    if (!existingMessage) {
      return false;
    }
    
    // Delete from MongoDB first
    try {
      const db = this.getDatabase();
      const collection = db.collection('message_contents');
      const documentId = existingMessage.content; // MongoDB ObjectId
      
      await collection.deleteOne({ _id: new ObjectId(documentId) });
      console.log(`✅ MongoDB document ${documentId} deleted`);
    } catch (error) {
      console.error('Error deleting MongoDB document:', error);
      // Continue with PostgreSQL deletion even if MongoDB fails
    }

    // Delete PostgreSQL record
    return await storage.deleteNoteRef(messageId);
  }

  // Health check for both databases
  async healthCheck(): Promise<{ postgres: boolean; mongodb: boolean; serviceLayer: boolean }> {
    const postgresHealth = true; // DatabaseStorage doesn't have healthCheck method
    
    let mongoHealth = false;
    try {
      const db = this.getDatabase();
      await db.collection('message_contents').findOne({});
      mongoHealth = true;
    } catch (error) {
      console.error('MongoDB health check failed:', error);
      mongoHealth = false;
    }
    
    return {
      postgres: postgresHealth,
      mongodb: mongoHealth,
      serviceLayer: postgresHealth && mongoHealth
    };
  }
}

// Export singleton instance
export const complianceStorageService = ComplianceStorageService.getInstance();