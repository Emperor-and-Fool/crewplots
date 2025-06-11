import { db } from '../db';
import { noteRefs as messages } from '@shared/schema';
import type { InsertNoteRef as InsertMessage } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface MongoDocumentContent {
  content: string;
  messageType: string;
  workflow?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface HybridMessage {
  id: number;
  userId: number;
  receiverId?: number | null;
  isPrivate: boolean;
  workflow?: string;
  documentId: string;
  createdAt: Date;
  updatedAt: Date;
  // MongoDB content
  content: string;
  messageType: string;
}

class HybridMessageService {
  private mongoProxyUrl = 'http://localhost:3001';

  /**
   * Check if MongoDB proxy is available
   */
  async isMongoDBProxyAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.mongoProxyUrl}/health`);
      const health = await response.json();
      return health.mongodb === 'connected';
    } catch {
      return false;
    }
  }

  /**
   * Create a message with metadata in PostgreSQL and content in MongoDB
   */
  async createMessage(messageData: {
    userId: number;
    content: string;
    messageType?: string;
    receiverId?: number | null;
    isPrivate?: boolean;
    workflow?: string;
    metadata?: Record<string, any>;
  }): Promise<HybridMessage> {
    const documentId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageType = messageData.messageType || 'text';
    const workflow = messageData.workflow || 'general';

    // Step 1: Store content in MongoDB via proxy
    const mongoProxyAvailable = await this.isMongoDBProxyAvailable();
    let contentStored = false;

    if (mongoProxyAvailable) {
      try {
        const mongoDocument: MongoDocumentContent = {
          content: messageData.content,
          messageType,
          workflow,
          metadata: messageData.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const response = await fetch(`${this.mongoProxyUrl}/collections/message_content/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _id: documentId,
            ...mongoDocument
          })
        });

        if (response.ok) {
          contentStored = true;
          console.log(`✅ Message content stored in MongoDB: ${documentId}`);
        } else {
          console.warn(`⚠️ MongoDB storage failed, will use PostgreSQL fallback`);
        }
      } catch (error) {
        console.warn(`⚠️ MongoDB proxy error:`, error);
      }
    }

    // Step 2: Store metadata in PostgreSQL
    const pgMessageData: InsertMessage = {
      userId: messageData.userId,
      content: contentStored ? `[MONGODB:${documentId}]` : messageData.content,
      messageType: messageType as "text" | "rich-text" | "system" | "notification",
      receiverId: messageData.receiverId || null,
      isPrivate: messageData.isPrivate || false,
      workflow,
      documentReference: contentStored ? documentId : null
    };

    const [createdMessage] = await db.insert(messages).values(pgMessageData).returning();

    // Step 3: Return hybrid message object
    return {
      id: createdMessage.id,
      userId: createdMessage.userId,
      receiverId: createdMessage.receiverId,
      isPrivate: createdMessage.isPrivate,
      workflow: createdMessage.workflow,
      documentId: createdMessage.documentReference || '',
      createdAt: createdMessage.createdAt,
      updatedAt: createdMessage.updatedAt,
      content: messageData.content, // Original content
      messageType: createdMessage.messageType
    };
  }

  /**
   * Retrieve a message with content from MongoDB if available
   */
  async getMessage(messageId: number): Promise<HybridMessage | null> {
    // Get metadata from PostgreSQL
    const [pgMessage] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!pgMessage) return null;

    let content = pgMessage.content;
    let messageType = pgMessage.messageType;

    // If content is stored in MongoDB, retrieve it
    if (pgMessage.documentReference && pgMessage.content.startsWith('[MONGODB:')) {
      const mongoProxyAvailable = await this.isMongoDBProxyAvailable();
      
      if (mongoProxyAvailable) {
        try {
          const response = await fetch(
            `${this.mongoProxyUrl}/collections/message_content/findOne?q=${encodeURIComponent(
              JSON.stringify({ _id: pgMessage.documentReference })
            )}`
          );

          if (response.ok) {
            const mongoDoc = await response.json();
            if (mongoDoc) {
              content = mongoDoc.content;
              messageType = mongoDoc.messageType || pgMessage.messageType;
              console.log(`✅ Retrieved content from MongoDB: ${pgMessage.documentReference}`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to retrieve from MongoDB, using PostgreSQL fallback:`, error);
        }
      }
    }

    return {
      id: pgMessage.id,
      userId: pgMessage.userId,
      receiverId: pgMessage.receiverId,
      isPrivate: pgMessage.isPrivate,
      workflow: pgMessage.workflow,
      documentId: pgMessage.documentReference || '',
      createdAt: pgMessage.createdAt,
      updatedAt: pgMessage.updatedAt,
      content,
      messageType
    };
  }

  /**
   * Update a message with hybrid storage
   */
  async updateMessage(messageId: number, updates: {
    content?: string;
    messageType?: string;
    metadata?: Record<string, any>;
  }): Promise<HybridMessage | null> {
    const existingMessage = await this.getMessage(messageId);
    if (!existingMessage) return null;

    // Update MongoDB content if available and content is being updated
    if (updates.content && existingMessage.documentId) {
      const mongoProxyAvailable = await this.isMongoDBProxyAvailable();
      
      if (mongoProxyAvailable) {
        try {
          const updateData: any = {
            $set: {
              content: updates.content,
              updatedAt: new Date()
            }
          };

          if (updates.messageType) {
            updateData.$set.messageType = updates.messageType;
          }

          if (updates.metadata) {
            updateData.$set.metadata = updates.metadata;
          }

          const response = await fetch(`${this.mongoProxyUrl}/collections/message_content/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: { _id: existingMessage.documentId },
              update: updateData
            })
          });

          if (response.ok) {
            console.log(`✅ Updated content in MongoDB: ${existingMessage.documentId}`);
          }
        } catch (error) {
          console.warn(`⚠️ MongoDB update failed:`, error);
        }
      }
    }

    // Update PostgreSQL metadata
    const pgUpdates: Partial<InsertMessage> = {};
    if (updates.messageType) pgUpdates.messageType = updates.messageType;
    if (updates.content && !existingMessage.documentId) {
      pgUpdates.content = updates.content; // Only update PG content if not using MongoDB
    }

    if (Object.keys(pgUpdates).length > 0) {
      await db.update(messages).set(pgUpdates).where(eq(messages.id, messageId));
    }

    // Return updated message
    return this.getMessage(messageId);
  }

  /**
   * Delete a message from both storages
   */
  async deleteMessage(messageId: number): Promise<boolean> {
    const existingMessage = await this.getMessage(messageId);
    if (!existingMessage) return false;

    // Delete from MongoDB if document exists
    if (existingMessage.documentId) {
      const mongoProxyAvailable = await this.isMongoDBProxyAvailable();
      
      if (mongoProxyAvailable) {
        try {
          const response = await fetch(
            `${this.mongoProxyUrl}/collections/message_content/delete?q=${encodeURIComponent(
              JSON.stringify({ _id: existingMessage.documentId })
            )}`,
            { method: 'DELETE' }
          );

          if (response.ok) {
            console.log(`✅ Deleted content from MongoDB: ${existingMessage.documentId}`);
          }
        } catch (error) {
          console.warn(`⚠️ MongoDB deletion failed:`, error);
        }
      }
    }

    // Delete from PostgreSQL
    await db.delete(messages).where(eq(messages.id, messageId));
    
    return true;
  }

  /**
   * Get messages for a user with hybrid content retrieval
   */
  async getMessagesForUser(userId: number, limit: number = 50): Promise<HybridMessage[]> {
    const pgMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(messages.createdAt)
      .limit(limit);

    const hybridMessages: HybridMessage[] = [];

    for (const pgMessage of pgMessages) {
      let content = pgMessage.content;
      let messageType = pgMessage.messageType;

      // Retrieve from MongoDB if applicable
      if (pgMessage.documentId && pgMessage.content.startsWith('[MONGODB:')) {
        const mongoProxyAvailable = await this.isMongoDBProxyAvailable();
        
        if (mongoProxyAvailable) {
          try {
            const response = await fetch(
              `${this.mongoProxyUrl}/collections/message_content/findOne?q=${encodeURIComponent(
                JSON.stringify({ _id: pgMessage.documentId })
              )}`
            );

            if (response.ok) {
              const mongoDoc = await response.json();
              if (mongoDoc) {
                content = mongoDoc.content;
                messageType = mongoDoc.messageType || pgMessage.messageType;
              }
            }
          } catch (error) {
            console.warn(`⚠️ Failed to retrieve MongoDB content for message ${pgMessage.id}`);
          }
        }
      }

      hybridMessages.push({
        id: pgMessage.id,
        userId: pgMessage.userId,
        receiverId: pgMessage.receiverId,
        isPrivate: pgMessage.isPrivate,
        workflow: pgMessage.workflow,
        documentId: pgMessage.documentId || '',
        createdAt: pgMessage.createdAt,
        updatedAt: pgMessage.updatedAt,
        content,
        messageType
      });
    }

    return hybridMessages;
  }
}

export const hybridMessageService = new HybridMessageService();