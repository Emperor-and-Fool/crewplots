// Phase 1: Storage interface type definitions
// Will be populated in Phase 2 with hybrid storage types

export interface HybridStorageMessage {
  // PostgreSQL metadata storage
  postgresMetadata: MessageMetadata;
  // MongoDB content storage
  mongoContent: MessageContent;
  // Redis cache layer
  redisCache?: CachedMessageData;
}

export interface MessageMetadata {
  id: number;
  userId: number;
  receiverId?: number;
  workflow: string;
  messageType: string;
  priority: string;
  isPrivate: boolean;
  mongoObjectId: string; // Reference to MongoDB document
  createdAt: string;
  updatedAt: string;
}

export interface MessageContent {
  _id: string; // MongoDB ObjectId
  messageId?: number; // Reference back to PostgreSQL
  content: string;
  contentType: 'rich-text' | 'plain-text' | 'markdown';
  metadata: ContentMetadata;
}

export interface ContentMetadata {
  wordCount: number;
  characterCount: number;
  htmlLength: number;
}

export interface CachedMessageData {
  compiledContent: string;
  cachedAt: string;
  ttl: number;
}

// Phase 2 TODO: Extract and consolidate storage types from:
// - server/services/message-storage-service.ts (lines 31-40)
// - server/routes/mongodb-messages.ts (lines 24-37)