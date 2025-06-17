# Dual-Database Service Layer Architecture

## Overview
The service layer implements a sophisticated dual-database architecture where PostgreSQL handles relational metadata while MongoDB stores rich document content. This pattern provides optimal data storage for different data types while maintaining unified access through the service layer.

## Architecture Design

### Database Responsibilities

#### PostgreSQL - Relational Metadata
- User relationships and authentication
- Message metadata (timestamps, priorities, read status)
- Workflow categorization
- References to MongoDB documents
- Foreign key constraints and data integrity

#### MongoDB - Rich Document Storage
- HTML/Markdown content
- Document metadata (word counts, character counts)
- Content versioning
- Rich text formatting
- Large document storage via GridFS

### Service Layer Coordination
The `MessageService` acts as the orchestration layer:

```typescript
class MessageService {
  // Coordinates between PostgreSQL and MongoDB
  // Compiles unified data for frontend consumption
  // Handles cross-database transactions
}
```

## Data Flow Architecture

### Creating Messages
```mermaid
sequenceDiagram
    Frontend->>+Service: createMessage(content, metadata)
    Service->>+MongoDB: storeContentDocument(richContent)
    MongoDB-->>-Service: documentId
    Service->>+PostgreSQL: createMessage(metadata, documentId)
    PostgreSQL-->>-Service: messageRecord
    Service->>MongoDB: updateDocumentReference(messageId)
    Service-->>-Frontend: compiledMessage
```

### Retrieving Messages
```mermaid
sequenceDiagram
    Frontend->>+Service: getMessagesByUser(userId)
    Service->>+PostgreSQL: getMessageMetadata(userId)
    PostgreSQL-->>-Service: messageRecords[]
    Service->>+MongoDB: getDocumentContent(documentIds[])
    MongoDB-->>-Service: richContent[]
    Service->>Service: compileMessages()
    Service-->>-Frontend: unifiedMessages[]
```

## Implementation Details

### MongoDB Document Structure
```typescript
interface MessageDocument {
  _id: ObjectId;
  messageId?: number;              // Reference to PostgreSQL
  content: string;                 // Rich HTML/Markdown content
  contentType: 'rich-text' | 'plain-text' | 'markdown';
  workflow: 'application' | 'crew' | 'location' | 'scheduling' | 'knowledge';
  metadata: {
    wordCount: number;
    characterCount: number;
    htmlLength: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### PostgreSQL Message Schema
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,              -- Stores MongoDB ObjectId
  message_type TEXT DEFAULT 'rich-text',
  user_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  is_private BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal',
  workflow TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Service Layer Methods

#### Document Storage
```typescript
async storeContentDocument(content: string, options: {
  contentType: 'rich-text' | 'plain-text' | 'markdown';
  workflow?: string;
}): Promise<string> {
  // Calculate metadata
  const plainText = content.replace(/<[^>]*>/g, '');
  const wordCount = plainText.trim().split(/\s+/).length;
  
  // Store in MongoDB
  const document = await collection.insertOne({
    content,
    contentType: options.contentType,
    workflow: options.workflow,
    metadata: { wordCount, characterCount: plainText.length, htmlLength: content.length },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return document.insertedId.toString();
}
```

#### Data Compilation
```typescript
async compileMessage(postgresMessage: Message): Promise<ServiceMessage> {
  // Extract MongoDB document ID from PostgreSQL content field
  const documentId = postgresMessage.content;
  
  // Fetch rich content from MongoDB
  const document = await mongoCollection.findOne({ 
    _id: new ObjectId(documentId) 
  });
  
  // Return unified message
  return {
    ...postgresMessage,
    documentId,
    compiledContent: document.content,
    content: document.content  // Replace for frontend consumption
  };
}
```

## Benefits of Dual-Database Architecture

### Performance Optimization
- **PostgreSQL**: Fast relational queries for user lookups, filtering, sorting
- **MongoDB**: Efficient document storage and retrieval for rich content
- **Indexing**: Optimized indexes on each database for their specific use cases

### Scalability Patterns
- **Horizontal scaling**: MongoDB collections can be sharded by workflow or user
- **Vertical scaling**: PostgreSQL handles increasing relational complexity
- **Caching**: Service layer can implement Redis caching for compiled results

### Data Integrity
- **ACID compliance**: PostgreSQL ensures transactional integrity for metadata
- **Document consistency**: MongoDB handles document versioning and updates
- **Cross-database references**: Service layer maintains referential integrity

### Development Benefits
- **Type safety**: Strong typing for both relational and document data
- **Query optimization**: Use optimal query patterns for each database type
- **Maintenance**: Clear separation of concerns between data types

## Workflow-Based Storage

### Content Categorization
```typescript
enum WorkflowType {
  APPLICATION = 'application',    // Applicant motivational content
  CREW = 'crew',                 // Staff notes and communication
  LOCATION = 'location',         // Venue-specific information
  SCHEDULING = 'scheduling',     // Shift-related notes
  KNOWLEDGE = 'knowledge',       // Training and documentation
  STATISTICS = 'statistics'      // Analytics and reporting
}
```

### Storage Strategy by Workflow
- **Application**: Rich motivational text, resumes, cover letters
- **Crew**: Formatted notes, performance evaluations, feedback
- **Knowledge**: Structured documentation, training materials, SOPs
- **Location**: Venue descriptions, policies, local information

## Advanced Features

### Document Versioning
```typescript
interface DocumentVersion {
  documentId: ObjectId;
  version: number;
  content: string;
  changeType: 'created' | 'updated' | 'restored';
  changedBy: number;  // User ID
  timestamp: Date;
}
```

### Search Capabilities
```typescript
// MongoDB text search across document content
async searchDocuments(query: string, workflow?: string) {
  return await collection.find({
    $text: { $search: query },
    ...(workflow && { workflow })
  }).toArray();
}

// PostgreSQL metadata search
async searchMetadata(filters: MessageFilters) {
  return await db.select().from(messages)
    .where(and(...buildFilters(filters)));
}
```

### Bulk Operations
```typescript
async bulkUpdateWorkflow(messageIds: number[], newWorkflow: string) {
  // Update PostgreSQL metadata
  await db.update(messages)
    .set({ workflow: newWorkflow })
    .where(inArray(messages.id, messageIds));
    
  // Update MongoDB documents
  await collection.updateMany(
    { messageId: { $in: messageIds } },
    { $set: { workflow: newWorkflow, updatedAt: new Date() } }
  );
}
```

## Monitoring and Health Checks

### Database Health Monitoring
```typescript
async healthCheck(): Promise<HealthStatus> {
  const postgresHealth = await db.select().from(users).limit(1);
  const mongoHealth = await db.admin().ping();
  
  return {
    postgres: !!postgresHealth,
    mongodb: !!mongoHealth,
    serviceLayer: postgresHealth && mongoHealth
  };
}
```

### Performance Metrics
- Document retrieval latency
- Compilation time for large message sets
- Cross-database query performance
- Storage utilization by workflow type

## Error Handling and Recovery

### Transaction Management
```typescript
async createMessageTransaction(messageData: CreateMessageData) {
  const session = await mongodb.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Store document in MongoDB
      const documentId = await storeContentDocument(messageData.content);
      
      // Store metadata in PostgreSQL
      const message = await storage.createMessage({
        ...messageData,
        content: documentId
      });
      
      // Update cross-reference
      await updateDocumentReference(documentId, message.id);
    });
  } catch (error) {
    // Rollback logic for both databases
    await rollbackTransaction(session);
    throw error;
  }
}
```

### Data Consistency Checks
```typescript
async validateDataConsistency(): Promise<ConsistencyReport> {
  // Find PostgreSQL messages without MongoDB documents
  const orphanedMessages = await findOrphanedMessages();
  
  // Find MongoDB documents without PostgreSQL references
  const orphanedDocuments = await findOrphanedDocuments();
  
  return { orphanedMessages, orphanedDocuments };
}
```

## Deployment Considerations

### Environment Configuration
```env
# PostgreSQL Configuration
DATABASE_URL=postgresql://user:pass@host:5432/database

# MongoDB Configuration
MONGODB_URL=mongodb://user:pass@host:27017/database
MONGODB_DATABASE=crew_plots_documents

# Service Layer Configuration
ENABLE_DOCUMENT_VERSIONING=true
DOCUMENT_CACHE_TTL=3600
```

### Infrastructure Requirements
- **PostgreSQL**: Standard relational database hosting
- **MongoDB**: Document database with GridFS support
- **Network**: Low-latency connection between databases
- **Monitoring**: Health checks for both database connections

This dual-database architecture provides the foundation for sophisticated document management while maintaining the performance and integrity benefits of relational data structures.