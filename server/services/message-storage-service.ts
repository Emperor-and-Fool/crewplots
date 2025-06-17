import { mongoProxyClient } from './mongodb-proxy-client';
import { storage } from '../database/storage';
import type { NoteRef, InsertNoteRef } from '@shared/schema';
import { ObjectId } from 'mongodb';

/*
 * CRITICAL ARCHITECTURE RULE - NO SQL FALLBACK FOR CONTENT
 * 
 * This service implements a strict hybrid database architecture:
 * - PostgreSQL: stores ONLY metadata and MongoDB ObjectId references
 * - MongoDB: stores ONLY rich text content and files
 * 
 * FALLBACK PROHIBITION:
 * Creating any SQL fallback mechanism for content or files is STRICTLY FORBIDDEN
 * as it represents complete corruption of the system's architectural intent.
 * 
 * The system MUST fail explicitly when MongoDB is unavailable rather than
 * silently storing content in PostgreSQL, which would:
 * 1. Corrupt data integrity
 * 2. Create inconsistent storage patterns
 * 3. Violate the hybrid architecture principles
 * 4. Make the system unreliable and unpredictable
 * 
 * REQUIRED BEHAVIOR:
 * - MongoDB unavailable = System fails with clear error message
 * - PostgreSQL content field = MongoDB ObjectId reference ONLY
 * - No content ever stored in PostgreSQL under any circumstances
 */

// Service layer message with compiled content
export interface ServiceMessage extends NoteRef {
  compiledContent?: string;
}

// MongoDB document structure
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

export class MessageService {
  private static instance: MessageService;
  
  private constructor() {}
  
  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  // Initialize MongoDB proxy connection
  private async initializeMongoProxy() {
    try {
      await mongoProxyClient.connect();
      console.log('✅ Message service connected to MongoDB proxy');
    } catch (error) {
      throw new Error('CRITICAL: MongoDB proxy connection failed - system requires MongoDB');
    }
  }

  // Store content document in MongoDB via proxy - NO FALLBACK ALLOWED
  private async storeContentDocument(
    content: string, 
    options: { 
      contentType: 'rich-text' | 'plain-text' | 'markdown';
      workflow: string;
    }
  ): Promise<string> {
    console.log(`🔍 STORING CONTENT: length=${content.length}, type=${options.contentType}`);
    
    if (!mongoProxyClient.isConnected()) {
      await this.initializeMongoProxy();
    }
    
    console.log(`✅ MongoDB proxy connection established, using collection: documents`);

    // Calculate content metadata
    const plainText = content.replace(/<[^>]*>/g, '');
    const metadata = {
      wordCount: plainText.trim().split(/\s+/).length,
      characterCount: plainText.length,
      htmlLength: content.length,
    };

    const document: MessageDocument = {
      content,
      contentType: options.contentType,
      workflow: options.workflow,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`🔄 INSERTING DOCUMENT: ${JSON.stringify({ contentType: options.contentType, workflow: options.workflow, metadata })}`);
    const result = await mongoProxyClient.insertOne('documents', document);
    
    console.log(`📊 INSERT RESULT: insertedId=${result.insertedId}`);
    
    if (!result.insertedId) {
      console.error('❌ MONGODB INSERTION FAILED - NO INSERTED ID');
      throw new Error('CRITICAL: MongoDB document insertion failed - no fallback allowed');
    }
    
    const objectIdString = result.insertedId.toString();
    console.log(`✅ MONGODB DOCUMENT CREATED: ${objectIdString}`);
    return objectIdString;
  }

  // Update MongoDB document with PostgreSQL message reference
  private async updateDocumentMessageReference(documentId: string, messageId: number): Promise<void> {
    if (!mongoProxyClient.isConnected()) {
      await this.initializeMongoProxy();
    }

    const result = await mongoProxyClient.updateOne(
      'documents',
      { _id: new ObjectId(documentId) },
      { 
        $set: { 
          messageId, 
          updatedAt: new Date() 
        } 
      }
    );
    
    if (result.modifiedCount === 0) {
      throw new Error(`CRITICAL: MongoDB document ${documentId} not found for reference update`);
    }
  }

  // Get MongoDB document content via proxy
  private async getMongoDocument(documentId: string): Promise<MessageDocument | null> {
    if (!mongoProxyClient.isConnected()) {
      await this.initializeMongoProxy();
    }
    
    // Use string ID - ObjectId conversion happens in the proxy daemon
    return await mongoProxyClient.findOne('message-content', { _id: documentId });
  }

  // Update MongoDB document content via proxy
  private async updateContentDocument(documentId: string, newContent: string): Promise<void> {
    if (!mongoProxyClient.isConnected()) {
      await this.initializeMongoProxy();
    }

    // Recalculate metadata for updated content
    const plainText = newContent.replace(/<[^>]*>/g, '');
    const updatedMetadata = {
      wordCount: plainText.trim().split(/\s+/).length,
      characterCount: plainText.length,
      htmlLength: newContent.length,
    };

    const result = await mongoProxyClient.updateOne(
      'message-content',
      { _id: documentId },
      {
        $set: {
          content: newContent,
          metadata: updatedMetadata,
          updatedAt: new Date(),
        }
      }
    );
    
    if (result.modifiedCount === 0) {
      throw new Error(`CRITICAL: MongoDB document ${documentId} not found for content update`);
    }
  }

  // Compile PostgreSQL note with MongoDB content
  private async compileNote(postgresMessage: NoteRef): Promise<ServiceMessage> {
    const documentId = postgresMessage.content;
    
    console.log(`🔍 COMPILING NOTE: PostgreSQL content field = ${documentId}`);
    
    // Content must be a valid ObjectId referencing MongoDB
    if (!ObjectId.isValid(documentId)) {
      console.error(`❌ INVALID OBJECTID: ${documentId}`);
      throw new Error(`Invalid document reference: ${documentId}`);
    }
    
    console.log(`✅ Valid ObjectId, fetching from MongoDB: ${documentId}`);
    const document = await this.getMongoDocument(documentId);
    if (!document) {
      console.error(`❌ MONGODB DOCUMENT NOT FOUND: ${documentId}`);
      throw new Error(`MongoDB document not found: ${documentId}`);
    }
    
    console.log(`✅ MongoDB document found, content length: ${document.content.length}`);
    return {
      ...postgresMessage,
      documentId,
      compiledContent: document.content,
      content: document.content, // Replace for frontend consumption
    };
  }

  // Create message with dual-database coordination - MONGODB REQUIRED
  async createNoteRef(messageData: InsertNoteRef & { workflow?: string }): Promise<ServiceMessage> {
    console.log('Creating message with MongoDB storage for applicant user', messageData.userId);
    
    // Step 1: Store rich content in MongoDB - MUST SUCCEED
    const documentId = await this.storeContentDocument(messageData.content, {
      contentType: 'rich-text',
      workflow: messageData.workflow || 'application',
    });

    // CRITICAL: Verify MongoDB document was created
    if (!documentId || !ObjectId.isValid(documentId)) {
      throw new Error('CRITICAL: MongoDB document creation failed - no fallback allowed');
    }

    // Step 2: Calculate metadata for PostgreSQL
    const plainText = messageData.content.replace(/<[^>]*>/g, '');
    const metadata = {
      wordCount: plainText.trim().split(/\s+/).length,
      characterCount: plainText.length,
      htmlLength: messageData.content.length,
    };

    // Step 3: Create relational record in PostgreSQL with MongoDB reference ONLY
    const postgresMessage = await storage.createNoteRef({
      ...messageData,
      content: documentId, // ONLY MongoDB ObjectId - NEVER actual content
      documentId: documentId, // New hybrid architecture field
      documentType: messageData.workflow || 'motivation',
      wordCount: metadata.wordCount,
      characterCount: metadata.characterCount,
      htmlLength: metadata.htmlLength,
    });

    // Step 4: Update MongoDB document with PostgreSQL reference
    await this.updateDocumentMessageReference(documentId, postgresMessage.id);

    // Step 5: Return unified data structure
    return {
      ...postgresMessage,
      documentId,
      compiledContent: messageData.content,
      content: messageData.content, // Keep original content for frontend
    };
  }

  // Get messages by user with content compilation
  async getNoteRefsByUser(userId: number): Promise<ServiceMessage[]> {
    console.log('Using hybrid storage for applicant user', userId);
    
    // Fetch metadata from PostgreSQL
    const postgresMessages = await storage.getNoteRefsByUser(userId);

    // Compile with MongoDB content in parallel
    const compiledMessages = await Promise.all(
      postgresMessages.map(msg => this.compileNote(msg))
    );

    console.log(`Fetched ${compiledMessages.length} compiled messages for applicant user ${userId}`);
    return compiledMessages;
  }

  // Update message with content coordination
  async updateNoteRef(messageId: number, updates: { content?: string }): Promise<ServiceMessage> {
    // Get existing message
    const existingMessage = await storage.getNoteRef(messageId);
    if (!existingMessage) {
      throw new Error('Message not found');
    }

    if (!updates.content) {
      throw new Error('Content update required');
    }

    console.log(`Updating message ${messageId} with MongoDB storage for applicant user ${existingMessage.userId}`);
    
    const documentId = existingMessage.content;
    
    // Content must be a MongoDB ObjectId
    if (!ObjectId.isValid(documentId)) {
      throw new Error(`Invalid document reference: ${documentId}`);
    }

    await this.updateContentDocument(documentId, updates.content);
    
    // Calculate new metadata for PostgreSQL
    const plainText = updates.content.replace(/<[^>]*>/g, '');
    const metadata = {
      wordCount: plainText.trim().split(/\s+/).length,
      characterCount: plainText.length,
      htmlLength: updates.content.length,
    };
    
    // Update PostgreSQL metadata
    const updatedMessage = await storage.updateNoteRef(messageId, {
      wordCount: metadata.wordCount,
      characterCount: metadata.characterCount,
      htmlLength: metadata.htmlLength,
    });
    
    return {
      ...updatedMessage!,
      documentId,
      compiledContent: updates.content,
      content: updates.content,
    };
  }

  // Delete message with cleanup
  async deleteNoteRef(messageId: number): Promise<boolean> {
    // Get existing message for MongoDB cleanup
    const existingMessage = await storage.getNoteRef(messageId);
    if (!existingMessage) {
      return false;
    }

    const documentId = existingMessage.content;
    
    // Delete MongoDB document if it exists
    if (ObjectId.isValid(documentId)) {
      if (!mongoProxyClient.isConnected()) {
        await this.initializeMongoProxy();
      }
      await mongoProxyClient.deleteOne('documents', { _id: new ObjectId(documentId) });
    }

    // Delete PostgreSQL record
    return await storage.deleteNoteRef(messageId);
  }

  // Health check for both databases
  async healthCheck(): Promise<{ postgres: boolean; mongodb: boolean; serviceLayer: boolean }> {
    const postgresHealth = !!storage;
    
    let mongoHealth = false;
    try {
      const health = await mongoProxyClient.checkHealth();
      mongoHealth = health.mongodb;
    } catch (error) {
      mongoHealth = false;
    }
    
    return {
      postgres: postgresHealth,
      mongodb: mongoHealth,
      serviceLayer: postgresHealth && mongoHealth,
    };
  }
}

// Export singleton instance
export const messageStorageService = MessageService.getInstance();