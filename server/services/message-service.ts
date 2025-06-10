import { ObjectId } from 'mongodb';
import { mongoConnection } from '../db-mongo';
import { storage } from '../storage';
import { db } from '../db';
import { messageDocuments } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { Message, InsertMessage } from '@shared/schema';

// MongoDB document structure for message content
interface MessageDocument {
  _id?: ObjectId;
  messageId?: number; // Reference back to PostgreSQL message
  content: string;
  contentType: 'rich-text' | 'plain-text' | 'markdown';
  workflow?: 'application' | 'crew' | 'location' | 'scheduling' | 'knowledge' | 'statistics';
  metadata: {
    wordCount: number;
    characterCount: number;
    htmlLength: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Extended message type that includes MongoDB document reference
interface ServiceMessage extends Message {
  documentId?: string; // MongoDB document _id
  compiledContent?: string; // Content fetched from MongoDB
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

  /**
   * Create a new message with content stored in MongoDB (fallback to PostgreSQL if MongoDB unavailable)
   */
  async createMessage(messageData: InsertMessage & { workflow?: string }): Promise<ServiceMessage> {
    try {
      // Check if MongoDB is available
      const mongoAvailable = await this.isMongoDBAvailable();
      
      if (mongoAvailable) {
        // MongoDB path: Store content in MongoDB
        const documentId = await this.storeContentDocument(messageData.content, {
          contentType: 'rich-text',
          workflow: messageData.workflow as any,
        });

        // Create message record in PostgreSQL with MongoDB reference
        const postgresMessage = await storage.createMessage({
          ...messageData,
          content: documentId, // Store MongoDB document ID as reference
        });

        // Update MongoDB document with PostgreSQL message ID
        await this.updateDocumentMessageReference(documentId, postgresMessage.id);

        return {
          ...postgresMessage,
          documentId,
          compiledContent: messageData.content,
        };
      } else {
        // Fallback path: Use PostgreSQL virtual MongoDB tables
        console.log('MongoDB unavailable, using PostgreSQL virtual document tables');
        
        // Store content in PostgreSQL message_documents table
        const documentId = await this.storeVirtualDocument(messageData.content, {
          contentType: 'rich-text',
          workflow: messageData.workflow as any,
        });

        // Create message record with virtual document reference
        const postgresMessage = await storage.createMessage({
          ...messageData,
          content: documentId.toString(), // Store virtual document ID as reference
        });

        // Update virtual document with message reference
        await this.updateVirtualDocumentReference(documentId, postgresMessage.id);

        return {
          ...postgresMessage,
          documentId: documentId.toString(),
          compiledContent: messageData.content,
        };
      }
    } catch (error) {
      console.error('MessageService.createMessage error:', error);
      throw new Error(`Failed to create message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get messages with content compiled from MongoDB (fallback to PostgreSQL if MongoDB unavailable)
   */
  async getMessagesByUser(userId: number): Promise<ServiceMessage[]> {
    try {
      // Step 1: Fetch message metadata from PostgreSQL
      const postgresMessages = await storage.getMessagesByUser(userId);

      // Step 2: Check if MongoDB is available
      const mongoAvailable = await this.isMongoDBAvailable();

      if (mongoAvailable) {
        // Compile messages with MongoDB content
        const compiledMessages = await Promise.all(
          postgresMessages.map(msg => this.compileMessage(msg, 'mongodb'))
        );
        return compiledMessages;
      } else {
        // Compile messages with virtual PostgreSQL documents
        const compiledMessages = await Promise.all(
          postgresMessages.map(msg => this.compileMessage(msg, 'virtual'))
        );
        return compiledMessages;
      }
    } catch (error) {
      console.error('MessageService.getMessagesByUser error:', error);
      throw new Error(`Failed to get messages: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upsert message for user - create if none exists, update if one exists
   * This ensures only one message per user
   */
  async upsertUserMessage(userId: number, content: string, workflow?: string): Promise<ServiceMessage> {
    try {
      // Check if user already has a message
      const existingMessages = await storage.getMessagesByUser(userId);
      
      if (existingMessages.length > 0) {
        // Update the existing message (use the first/only one)
        return await this.updateMessage(existingMessages[0].id, { content });
      } else {
        // Create new message
        return await this.createMessage({
          userId,
          content,
          messageType: 'text',
          workflow,
        });
      }
    } catch (error) {
      console.error('MessageService.upsertUserMessage error:', error);
      throw new Error(`Failed to upsert message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update message content (MongoDB or PostgreSQL based on availability)
   */
  async updateMessage(messageId: number, updates: { content?: string }): Promise<ServiceMessage> {
    try {
      // Step 1: Get existing message
      const existingMessage = await storage.getMessage(messageId);
      if (!existingMessage) {
        throw new Error('Message not found');
      }

      // Step 2: Check if MongoDB is available
      const mongoAvailable = await this.isMongoDBAvailable();

      if (updates.content) {
        if (mongoAvailable) {
          // MongoDB path: Update document content
          const documentId = existingMessage.content; // Content field stores MongoDB document ID
          
          if (documentId && this.isValidObjectId(documentId)) {
            await this.updateContentDocument(documentId, updates.content);
            
            // Return compiled message
            return await this.compileMessage(existingMessage, 'mongodb');
          }
        } else {
          // Virtual PostgreSQL mode: Update virtual document
          const documentId = existingMessage.content;
          
          if (documentId && !isNaN(parseInt(documentId))) {
            await this.updateVirtualDocument(documentId, updates.content);
            
            // Return compiled message
            return await this.compileMessage(existingMessage, 'virtual');
          }
        }
      }
      
      // Final fallback: Update content directly in PostgreSQL
      const updatedMessage = await storage.updateMessage(messageId, updates);
      
      if (!updatedMessage) {
        throw new Error('Failed to update message');
      }

      return {
        ...updatedMessage,
        compiledContent: updatedMessage.content,
      };
    } catch (error) {
      console.error('MessageService.updateMessage error:', error);
      throw new Error(`Failed to update message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete message and associated document (MongoDB or virtual PostgreSQL)
   */
  async deleteMessage(messageId: number): Promise<boolean> {
    try {
      // Step 1: Get message to find document reference
      const message = await storage.getMessage(messageId);
      if (!message) {
        return false;
      }

      const documentId = message.content;

      // Step 2: Delete from PostgreSQL
      const postgresDeleted = await storage.deleteMessage(messageId);

      // Step 3: Delete from document storage
      if (postgresDeleted && documentId) {
        const mongoAvailable = await this.isMongoDBAvailable();
        
        if (mongoAvailable && this.isValidObjectId(documentId)) {
          // Delete MongoDB document
          await this.deleteContentDocument(documentId);
        } else if (!isNaN(parseInt(documentId))) {
          // Delete virtual PostgreSQL document
          await this.deleteVirtualDocument(documentId);
        }
      }

      return postgresDeleted;
    } catch (error) {
      console.error('MessageService.deleteMessage error:', error);
      throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if MongoDB is available and connected
   */
  private async isMongoDBAvailable(): Promise<boolean> {
    try {
      const db = mongoConnection.getDatabase();
      await db.admin().ping();
      return true;
    } catch (error) {
      console.log('MongoDB not available, using PostgreSQL fallback');
      return false;
    }
  }

  /**
   * Check if string is a valid MongoDB ObjectId
   */
  private isValidObjectId(id: string): boolean {
    try {
      return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
    } catch {
      return false;
    }
  }

  /**
   * PRIVATE METHODS - Virtual PostgreSQL document operations (fallback)
   */

  private async storeVirtualDocument(
    content: string, 
    options: { 
      contentType: 'rich-text' | 'plain-text' | 'markdown';
      workflow?: string;
    }
  ): Promise<number> {
    // Calculate metadata
    const plainText = content.replace(/<[^>]*>/g, '');
    const wordCount = plainText.trim().split(/\s+/).length;
    const characterCount = plainText.length;
    const htmlLength = content.length;

    const [result] = await db.insert(messageDocuments).values({
      content,
      contentType: options.contentType,
      workflow: options.workflow as any,
      wordCount,
      characterCount,
      htmlLength,
    }).returning();

    return result.id;
  }

  private async updateVirtualDocumentReference(documentId: number, messageId: number): Promise<void> {
    await db.update(messageDocuments)
      .set({ messageId })
      .where(eq(messageDocuments.id, documentId));
  }

  private async getVirtualDocument(documentId: string): Promise<any> {
    const id = parseInt(documentId);
    if (isNaN(id)) return null;

    const [document] = await db.select().from(messageDocuments)
      .where(eq(messageDocuments.id, id));
    
    return document || null;
  }

  private async updateVirtualDocument(documentId: string, newContent: string): Promise<void> {
    const id = parseInt(documentId);
    if (isNaN(id)) return;

    // Calculate updated metadata
    const plainText = newContent.replace(/<[^>]*>/g, '');
    const wordCount = plainText.trim().split(/\s+/).length;
    const characterCount = plainText.length;
    const htmlLength = newContent.length;

    await db.update(messageDocuments)
      .set({
        content: newContent,
        wordCount,
        characterCount,
        htmlLength,
        updatedAt: new Date(),
      })
      .where(eq(messageDocuments.id, id));
  }

  private async deleteVirtualDocument(documentId: string): Promise<void> {
    const id = parseInt(documentId);
    if (isNaN(id)) return;

    await db.delete(messageDocuments)
      .where(eq(messageDocuments.id, id));
  }

  /**
   * PRIVATE METHODS - MongoDB document operations
   */

  private async storeContentDocument(
    content: string, 
    options: { 
      contentType: 'rich-text' | 'plain-text' | 'markdown';
      workflow?: string;
    }
  ): Promise<string> {
    const db = mongoConnection.getDatabase();
    const collection = db.collection<MessageDocument>('message_documents');

    // Calculate metadata
    const plainText = content.replace(/<[^>]*>/g, '');
    const wordCount = plainText.trim().split(/\s+/).length;
    const characterCount = plainText.length;
    const htmlLength = content.length;

    const document: MessageDocument = {
      content,
      contentType: options.contentType,
      workflow: options.workflow as any,
      metadata: {
        wordCount,
        characterCount,
        htmlLength,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(document);
    return result.insertedId.toString();
  }

  private async updateDocumentMessageReference(documentId: string, messageId: number): Promise<void> {
    const db = mongoConnection.getDatabase();
    const collection = db.collection<MessageDocument>('message_documents');

    await collection.updateOne(
      { _id: new ObjectId(documentId) },
      { 
        $set: { 
          messageId,
          updatedAt: new Date(),
        }
      }
    );
  }

  private async updateContentDocument(documentId: string, newContent: string): Promise<void> {
    const db = mongoConnection.getDatabase();
    const collection = db.collection<MessageDocument>('message_documents');

    // Calculate updated metadata
    const plainText = newContent.replace(/<[^>]*>/g, '');
    const wordCount = plainText.trim().split(/\s+/).length;
    const characterCount = plainText.length;
    const htmlLength = newContent.length;

    await collection.updateOne(
      { _id: new ObjectId(documentId) },
      {
        $set: {
          content: newContent,
          metadata: {
            wordCount,
            characterCount,
            htmlLength,
          },
          updatedAt: new Date(),
        }
      }
    );
  }

  private async deleteContentDocument(documentId: string): Promise<void> {
    const db = mongoConnection.getDatabase();
    const collection = db.collection<MessageDocument>('message_documents');

    await collection.deleteOne({ _id: new ObjectId(documentId) });
  }

  private async compileMessage(postgresMessage: Message, storageType: 'mongodb' | 'virtual'): Promise<ServiceMessage> {
    try {
      const documentId = postgresMessage.content;
      
      if (storageType === 'mongodb') {
        // MongoDB document compilation
        if (!documentId || !ObjectId.isValid(documentId)) {
          return {
            ...postgresMessage,
            compiledContent: postgresMessage.content,
          };
        }

        const db = mongoConnection.getDatabase();
        const collection = db.collection<MessageDocument>('message_documents');
        const document = await collection.findOne({ _id: new ObjectId(documentId) });
        
        if (!document) {
          console.warn(`MongoDB document not found for message ${postgresMessage.id}`);
          return {
            ...postgresMessage,
            compiledContent: 'Content not available',
          };
        }

        return {
          ...postgresMessage,
          documentId,
          compiledContent: document.content,
          content: document.content,
        };
      } else {
        // Virtual PostgreSQL document compilation
        if (!documentId || isNaN(parseInt(documentId))) {
          return {
            ...postgresMessage,
            compiledContent: postgresMessage.content,
          };
        }

        const virtualDocument = await this.getVirtualDocument(documentId);
        
        if (!virtualDocument) {
          console.warn(`Virtual document not found for message ${postgresMessage.id}`);
          return {
            ...postgresMessage,
            compiledContent: 'Content not available',
          };
        }

        return {
          ...postgresMessage,
          documentId,
          compiledContent: virtualDocument.content,
          content: virtualDocument.content,
        };
      }
    } catch (error) {
      console.error('Error compiling message:', error);
      return {
        ...postgresMessage,
        compiledContent: 'Error loading content',
      };
    }
  }
}

// Export singleton instance
export const messageService = MessageService.getInstance();