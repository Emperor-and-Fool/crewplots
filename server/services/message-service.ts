import { ObjectId } from 'mongodb';
import { mongoConnection } from '../db-mongo';
import { storage } from '../storage';
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
        // Fallback path: Store content directly in PostgreSQL
        console.log('MongoDB unavailable, using PostgreSQL fallback for message storage');
        const postgresMessage = await storage.createMessage(messageData);

        return {
          ...postgresMessage,
          compiledContent: postgresMessage.content,
        };
      }
    } catch (error) {
      console.error('MessageService.createMessage error:', error);
      throw new Error(`Failed to create message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get messages with content compiled from MongoDB
   */
  async getMessagesByUser(userId: number): Promise<ServiceMessage[]> {
    try {
      // Step 1: Fetch message metadata from PostgreSQL
      const postgresMessages = await storage.getMessagesByUser(userId);

      // Step 2: Compile messages with MongoDB content
      const compiledMessages = await Promise.all(
        postgresMessages.map(msg => this.compileMessage(msg))
      );

      return compiledMessages;
    } catch (error) {
      console.error('MessageService.getMessagesByUser error:', error);
      throw new Error(`Failed to get messages: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update message content in MongoDB
   */
  async updateMessage(messageId: number, updates: { content?: string }): Promise<ServiceMessage> {
    try {
      // Step 1: Get existing message to find MongoDB document ID
      const existingMessage = await storage.getMessage(messageId);
      if (!existingMessage) {
        throw new Error('Message not found');
      }

      const documentId = existingMessage.content; // Content field stores MongoDB document ID

      // Step 2: Update content in MongoDB if provided
      if (updates.content) {
        await this.updateContentDocument(documentId, updates.content);
      }

      // Step 3: Update metadata in PostgreSQL if needed
      const updatedMessage = await storage.updateMessage(messageId, {
        // Note: content field remains the MongoDB document ID
      });

      if (!updatedMessage) {
        throw new Error('Failed to update message');
      }

      // Step 4: Return compiled message
      return await this.compileMessage(updatedMessage);
    } catch (error) {
      console.error('MessageService.updateMessage error:', error);
      throw new Error(`Failed to update message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete message and associated MongoDB document
   */
  async deleteMessage(messageId: number): Promise<boolean> {
    try {
      // Step 1: Get message to find MongoDB document ID
      const message = await storage.getMessage(messageId);
      if (!message) {
        return false;
      }

      const documentId = message.content;

      // Step 2: Delete from PostgreSQL
      const postgresDeleted = await storage.deleteMessage(messageId);

      // Step 3: Delete from MongoDB
      if (postgresDeleted && documentId) {
        await this.deleteContentDocument(documentId);
      }

      return postgresDeleted;
    } catch (error) {
      console.error('MessageService.deleteMessage error:', error);
      throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : String(error)}`);
    }
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

  private async compileMessage(postgresMessage: Message): Promise<ServiceMessage> {
    try {
      // The content field in PostgreSQL contains the MongoDB document ID
      const documentId = postgresMessage.content;
      
      if (!documentId || !ObjectId.isValid(documentId)) {
        // Fallback for messages that don't have MongoDB documents
        return {
          ...postgresMessage,
          compiledContent: postgresMessage.content,
        };
      }

      // Fetch content from MongoDB
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
        content: document.content, // Replace content field with actual content for frontend
      };
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