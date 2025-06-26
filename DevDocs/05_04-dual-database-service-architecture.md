# Dual Database Service Architecture

## Overview

The ShiftPro platform implements a hybrid database architecture that leverages both PostgreSQL and MongoDB to optimize data storage and retrieval patterns for different types of content.

## Architecture Principles

### Database Separation Strategy
- **PostgreSQL**: Relational metadata, references, and structured data
- **MongoDB**: Rich content, documents, and unstructured data
- **Explicit Failure Policy**: No fallback mechanisms between databases

### Service Layer Integration
The system uses a service layer pattern to compile data from both databases, ensuring consistent data presentation while maintaining database-specific optimizations.

## Current Implementation

### Notes System Implementation
The notes system demonstrates the full hybrid architecture:

#### PostgreSQL Storage (`note_refs` table)
```sql
CREATE TABLE note_refs (
  id SERIAL PRIMARY KEY,
  content TEXT,                    -- MongoDB ObjectId reference
  user_id INTEGER NOT NULL,
  message_type TEXT DEFAULT 'rich-text',
  workflow TEXT DEFAULT 'general',
  document_id TEXT,               -- MongoDB ObjectId
  word_count INTEGER DEFAULT 0,
  character_count INTEGER DEFAULT 0,
  html_length INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'private',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### MongoDB Document Storage
```javascript
{
  _id: ObjectId("..."),
  messageId: 38,                   // Reference to PostgreSQL ID
  content: "<p>Rich HTML content...</p>",
  contentType: "rich-text",
  workflow: "general",
  metadata: {
    wordCount: 32,
    characterCount: 179,
    htmlLength: 323
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Service Layer Architecture

### MessageService Class
Central service managing hybrid database operations:

```typescript
class MessageService {
  // Compiles PostgreSQL metadata with MongoDB content
  private async compileMessage(postgresMessage: NoteRef): Promise<ServiceMessage>
  
  // Creates note with hybrid storage
  async createNoteRef(messageData: InsertNoteRef): Promise<ServiceMessage>
  
  // Retrieves compiled notes for user
  async getNoteRefsByUser(userId: number): Promise<ServiceMessage[]>
  
  // Updates note content and metadata
  async updateNoteRef(messageId: number, updates: { content?: string }): Promise<ServiceMessage>
  
  // Deletes note from both databases
  async deleteNoteRef(messageId: number): Promise<boolean>
}
```

### Data Compilation Process
1. Query PostgreSQL for structured metadata
2. Extract MongoDB document references from PostgreSQL records
3. Fetch rich content from MongoDB using ObjectId
4. Compile complete objects combining both data sources
5. Return unified data structure to frontend

## Database Connection Management

### PostgreSQL Connection
- **Driver**: Neon Serverless PostgreSQL
- **ORM**: Drizzle ORM for type-safe queries
- **Connection Pooling**: Automatic connection management
- **Schema Management**: Drizzle migrations

### MongoDB Connection
- **Driver**: Native MongoDB driver
- **Connection**: Direct connection with authentication
- **Document Storage**: Flexible schema for rich content
- **Indexing**: ObjectId-based efficient retrieval

## Error Handling Strategy

### Explicit Failure Design
The system is designed to fail explicitly when either database is unavailable:

- **No Fallback Mechanisms**: Prevents data inconsistency
- **Clear Error Messages**: Users receive specific failure notifications
- **Service Health Monitoring**: Proactive issue detection
- **Graceful Degradation**: UI shows appropriate error states

### Error Scenarios
1. **MongoDB Unavailable**: Notes creation/editing disabled with clear message
2. **PostgreSQL Unavailable**: Complete system unavailable
3. **Network Issues**: Retry mechanisms with exponential backoff
4. **Data Corruption**: Validation and integrity checks

## Performance Optimizations

### Query Optimization
- **Indexed Queries**: PostgreSQL queries optimized with proper indexing
- **Batch Operations**: Minimize database round trips
- **Connection Pooling**: Efficient resource utilization
- **Query Caching**: Strategic caching at service layer

### Data Loading Patterns
- **Lazy Loading**: Compile content only when needed
- **Pagination**: Handle large datasets efficiently
- **Selective Fields**: Load only required data fields
- **Background Sync**: Non-blocking data synchronization

## Security Implementation

### Database Access Control
- **User-Scoped Queries**: All queries filtered by user authentication
- **Connection Security**: Encrypted connections to both databases
- **Input Validation**: Prevent injection attacks across both systems
- **Audit Logging**: Track all database operations

### Data Protection
- **Content Sanitization**: HTML content sanitized before storage
- **Access Permissions**: Role-based access control
- **Data Encryption**: Sensitive data encryption at rest
- **Backup Security**: Secure backup procedures for both databases

## Scalability Considerations

### Horizontal Scaling
- **Database Separation**: Independent scaling of PostgreSQL and MongoDB
- **Read Replicas**: Distribute read operations across replicas
- **Sharding Strategy**: MongoDB sharding for large document collections
- **Load Balancing**: Distribute service layer operations

### Monitoring and Maintenance
- **Performance Metrics**: Track query performance across both databases
- **Resource Monitoring**: Monitor connection pools and memory usage
- **Health Checks**: Automated health monitoring for both services
- **Backup Strategy**: Coordinated backup procedures

## Development Guidelines

### Data Model Design
- **Clear Separation**: Define what belongs in each database
- **Reference Integrity**: Maintain consistent references between databases
- **Schema Evolution**: Plan for schema changes in both systems
- **Type Safety**: Use TypeScript for consistent data structures

### API Design Patterns
- **Service Layer Abstraction**: Hide database complexity from API routes
- **Consistent Interfaces**: Unified response formats regardless of data source
- **Error Handling**: Standardized error responses across services
- **Testing Strategy**: Comprehensive testing for both databases

## Future Enhancements

### Planned Improvements
- **Real-time Sync**: WebSocket-based real-time data synchronization
- **Advanced Caching**: Redis integration for improved performance
- **Search Integration**: Full-text search across both databases
- **Analytics**: Cross-database analytics and reporting

### Technology Evolution
- **Database Upgrades**: Plan for database version upgrades
- **Driver Updates**: Keep database drivers current
- **Performance Tuning**: Continuous optimization based on usage patterns
- **Disaster Recovery**: Enhanced backup and recovery procedures