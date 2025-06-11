import { mongoConnection } from '../db-mongo';
import { storage } from '../storage';
import type { Message, InsertMessage } from '@shared/schema';
import { ObjectId } from 'mongodb';

// Service layer message with compiled content
export interface ServiceMessage extends Message {
  documentId?: string;
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

  // Check if MongoDB is available
  private async isMongoDBAvailable(): Promise<boolean> {
    try {
      await mongoConnection.checkConnection();
      return true;
    } catch (error) {
      console.log('MongoDB not available, using PostgreSQL fallback');
      return false;
    }
  }

  // Store content document in MongoDB
  private async storeContentDocument(
    content: string, 
    options: { 
      contentType: 'rich-text' | 'plain-text' | 'markdown';
      workflow: string;
    }
  ): Promise<string> {
    const db = mongoConnection.getDatabase();
    const collection = db.collection<MessageDocument>('message_documents');

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

    const result = await collection.insertOne(document);
    return result.insertedId.toString();
  }

  // Update MongoDB document with PostgreSQL message reference
  private async updateDocumentMessageReference(documentId: string, messageId: number): Promise<void> {
    const db = mongoConnection.getDatabase();
    const collection = db.collection<MessageDocument>('message_documents');

    await collection.updateOne(
      { _id: new ObjectId(documentId) },
      { 
        $set: { 
          messageId, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  // Get MongoDB document content
  private async getMongoDocument(documentId: string): Promise<MessageDocument | null> {
    try {
      const db = mongoConnection.getDatabase();
      const collection = db.collection<MessageDocument>('message_documents');
      
      return await collection.findOne({ _id: new ObjectId(documentId) });
    } catch (error) {
      console.error('Error fetching MongoDB document:', error);
      return null;
    }
  }

  // Update MongoDB document content
  private async updateContentDocument(documentId: string, newContent: string): Promise<void> {
    const db = mongoConnection.getDatabase();
    const collection = db.collection<MessageDocument>('message_documents');

    // Recalculate metadata for updated content
    const plainText = newContent.replace(/<[^>]*>/g, '');
    const updatedMetadata = {
      wordCount: plainText.trim().split(/\s+/).length,
      characterCount: plainText.length,
      htmlLength: newContent.length,
    };

    await collection.updateOne(
      { _id: new ObjectId(documentId) },
      {
        $set: {
          content: newContent,
          metadata: updatedMetadata,
          updatedAt: new Date(),
        }
      }
    );
  }

  // Compile PostgreSQL message with MongoDB content
  private async compileMessage(postgresMessage: Message): Promise<ServiceMessage> {
    const documentId = postgresMessage.content;
    
    // If content looks like an ObjectId, fetch from MongoDB
    if (ObjectId.isValid(documentId)) {
      const document = await this.getMongoDocument(documentId);
      
      if (document) {
        return {
          ...postgresMessage,
          documentId,
          compiledContent: document.content,
          content: document.content, // Replace for frontend consumption
        };
      }
    }
    
    // Fallback to PostgreSQL content
    return {
      ...postgresMessage,
      compiledContent: postgresMessage.content,
    };
  }

  // Create message with dual-database coordination
  async createMessage(messageData: InsertMessage & { workflow?: string }): Promise<ServiceMessage> {
    const mongoAvailable = await this.isMongoDBAvailable();
    
    if (mongoAvailable) {
      console.log('MongoDB available, using MongoDB storage for applicant user', messageData.userId);
      
      // Step 1: Store rich content in MongoDB
      const documentId = await this.storeContentDocument(messageData.content, {
        contentType: 'rich-text',
        workflow: messageData.workflow || 'application',
      });

      // Step 2: Create relational record in PostgreSQL with MongoDB reference
      const postgresMessage = await storage.createMessage({
        ...messageData,
        content: documentId, // Store MongoDB ObjectId as reference
      });

      // Step 3: Update MongoDB document with PostgreSQL reference
      await this.updateDocumentMessageReference(documentId, postgresMessage.id);

      // Step 4: Return unified data structure
      return {
        ...postgresMessage,
        documentId,
        compiledContent: messageData.content,
        content: messageData.content, // Keep original content for frontend
      };
    } else {
      console.log('MongoDB unavailable, using PostgreSQL virtual document tables');
      
      // Fallback to PostgreSQL-only mode
      const postgresMessage = await storage.createMessage(messageData);
      return {
        ...postgresMessage,
        compiledContent: postgresMessage.content,
      };
    }
  }

  // Get messages by user with content compilation
  async getMessagesByUser(userId: number): Promise<ServiceMessage[]> {
    console.log('MongoDB not available, using PostgreSQL fallback');
    
    // Fetch metadata from PostgreSQL
    const postgresMessages = await storage.getMessagesByUser(userId);

    // Compile with MongoDB content in parallel
    const compiledMessages = await Promise.all(
      postgresMessages.map(msg => this.compileMessage(msg))
    );

    console.log(`Fetched ${compiledMessages.length} compiled messages for applicant user ${userId}`);
    return compiledMessages;
  }

  // Update message with content coordination
  async updateMessage(messageId: number, updates: { content?: string }): Promise<ServiceMessage> {
    const mongoAvailable = await this.isMongoDBAvailable();
    
    // Get existing message
    const existingMessage = await storage.getMessage(messageId);
    if (!existingMessage) {
      throw new Error('Message not found');
    }

    if (mongoAvailable && updates.content) {
      console.log(`Updated message ${messageId} with MongoDB storage for applicant user ${existingMessage.userId}`);
      
      const documentId = existingMessage.content;
      
      // If content is MongoDB ObjectId, update MongoDB document
      if (ObjectId.isValid(documentId)) {
        await this.updateContentDocument(documentId, updates.content);
        
        // Update PostgreSQL metadata if needed
        const updatedMessage = await storage.updateMessage(messageId, {
          updatedAt: new Date(),
        });
        
        return {
          ...updatedMessage,
          documentId,
          compiledContent: updates.content,
          content: updates.content,
        };
      }
    }
    
    // Fallback to PostgreSQL-only update
    console.log(`Updated message ${messageId} with MongoDB storage for applicant user ${existingMessage.userId}`);
    const updatedMessage = await storage.updateMessage(messageId, updates);
    return {
      ...updatedMessage,
      compiledContent: updatedMessage.content,
    };
  }

  // Delete message with cleanup
  async deleteMessage(messageId: number): Promise<boolean> {
    const mongoAvailable = await this.isMongoDBAvailable();
    
    // Get existing message for MongoDB cleanup
    const existingMessage = await storage.getMessage(messageId);
    if (!existingMessage) {
      return false;
    }

    if (mongoAvailable) {
      const documentId = existingMessage.content;
      
      // Delete MongoDB document if it exists
      if (ObjectId.isValid(documentId)) {
        try {
          const db = mongoConnection.getDatabase();
          const collection = db.collection('message_documents');
          await collection.deleteOne({ _id: new ObjectId(documentId) });
        } catch (error) {
          console.error('Error deleting MongoDB document:', error);
        }
      }
    }

    // Delete PostgreSQL record
    return await storage.deleteMessage(messageId);
  }

  // Health check for both databases
  async healthCheck(): Promise<{ postgres: boolean; mongodb: boolean; serviceLayer: boolean }> {
    const postgresHealth = await storage.healthCheck();
    const mongoHealth = await this.isMongoDBAvailable();
    
    return {
      postgres: postgresHealth,
      mongodb: mongoHealth,
      serviceLayer: postgresHealth && mongoHealth,
    };
  }
}

// Export singleton instance
export const messageService = MessageService.getInstance();