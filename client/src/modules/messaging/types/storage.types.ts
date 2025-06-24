// Phase 2: Storage interface type definitions
// Extracted from hybrid storage services

// Main hybrid storage message structure (from message-storage-service.ts lines 31-33)
export interface ServiceMessage {
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
  compiledContent?: string; // MongoDB content compiled into PostgreSQL record
}

// MongoDB document structure (from message-storage-service.ts lines 36-40)
export interface MessageDocument {
  _id?: string; // MongoDB ObjectId
  messageId?: number; // Reference back to PostgreSQL
  content: string;
  contentType: 'rich-text' | 'plain-text' | 'markdown';
  metadata: ContentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

// Note document structure (from mongodb-messages.ts lines 24-37)
export interface NoteDocument {
  _id?: string; // MongoDB ObjectId
  userId: number;
  userPublicId: string;
  content: string;
  noteType: 'motivation' | 'bio' | 'note';
  createdAt: Date;
  updatedAt: Date;
  metadata: ContentMetadata;
}

// Content metadata (from mongodb storage services)
export interface ContentMetadata {
  wordCount: number;
  characterCount: number;
  htmlLength: number;
}

// Hybrid storage configuration
export interface HybridStorageConfig {
  usePostgreSQL: boolean; // Metadata storage
  useMongoDB: boolean; // Content storage
  useRedisCache: boolean; // Cache layer
  cacheTTL: number; // Cache time-to-live
  retryAttempts: number; // MongoDB retry configuration
}

// Cache-specific types
export interface CachedMessageData {
  compiledContent: string;
  cachedAt: string;
  ttl: number;
  sessionId?: string;
  connectionId?: string;
}

// Storage operation results
export interface StorageOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  retryCount?: number;
  duration?: number;
}