# Service Layer Implementation Guide

## Overview

The service layer provides abstraction between API routes and database operations, specifically designed to handle hybrid PostgreSQL/MongoDB data compilation for the messaging and notes system.

## Current Implementation

### MessageService Class

The `MessageService` class is the primary service handling hybrid database operations for notes and messaging functionality.

#### Location and Structure
- **File**: `server/services/message-service.ts`
- **Purpose**: Compile PostgreSQL metadata with MongoDB rich content
- **Pattern**: Service layer abstraction with explicit error handling

#### Core Methods

```typescript
class MessageService {
  // Create new note with hybrid storage
  async createNoteRef(messageData: InsertNoteRef): Promise<ServiceMessage>
  
  // Retrieve compiled notes for specific user
  async getNoteRefsByUser(userId: number): Promise<ServiceMessage[]>
  
  // Update existing note content and metadata
  async updateNoteRef(messageId: number, updates: { content?: string }): Promise<ServiceMessage>
  
  // Delete note from both databases
  async deleteNoteRef(messageId: number): Promise<boolean>
  
  // Private method: Compile PostgreSQL metadata with MongoDB content
  private async compileMessage(postgresMessage: NoteRef): Promise<ServiceMessage>
}
```

### Data Compilation Process

#### compileMessage Method
The core compilation logic that merges PostgreSQL and MongoDB data:

1. **Extract MongoDB Reference**: Parse ObjectId from PostgreSQL content field
2. **Validate ObjectId**: Ensure valid MongoDB ObjectId format
3. **Fetch MongoDB Document**: Retrieve rich content using ObjectId
4. **Merge Data**: Combine PostgreSQL metadata with MongoDB content
5. **Return Compiled Object**: Unified data structure for frontend consumption

```typescript
private async compileMessage(postgresMessage: NoteRef): Promise<ServiceMessage> {
  // Extract MongoDB ObjectId from PostgreSQL content field
  const contentId = postgresMessage.content;
  
  // Validate ObjectId format
  if (!ObjectId.isValid(contentId)) {
    throw new Error(`Invalid ObjectId: ${contentId}`);
  }
  
  // Fetch MongoDB document
  const mongoDocument = await mongoCollection.findOne({ _id: new ObjectId(contentId) });
  
  if (!mongoDocument) {
    throw new Error(`MongoDB document not found: ${contentId}`);
  }
  
  // Compile and return merged data
  return {
    ...postgresMessage,
    compiledContent: mongoDocument.content,
    // Additional MongoDB metadata
  };
}
```

### Error Handling Strategy

#### Explicit Failure Design
The service layer implements explicit failure handling:

- **No Fallback Mechanisms**: System fails when MongoDB unavailable
- **Clear Error Messages**: Specific error types for different failure scenarios
- **Referential Integrity**: Validates MongoDB document existence
- **Service Health**: Proactive error detection and reporting

#### Error Types
1. **MongoDB Connection Errors**: Service unavailable
2. **Invalid ObjectId**: Data corruption or invalid reference
3. **Missing Documents**: Referential integrity failure
4. **Authentication Errors**: Database access denied

### API Integration

#### Notes Routes Implementation
The service layer integrates with API routes in `server/routes/notes.ts`:

```typescript
// GET /api/messaging/notes
app.get('/api/messaging/notes', async (req, res) => {
  const userId = req.user.id;
  const notes = await messageStorageService.getNoteRefsByUser(userId);
  res.json(notes);
});

// POST /api/messaging/notes
app.post('/api/messaging/notes', async (req, res) => {
  const noteData = { ...req.body, userId: req.user.id };
  const note = await messageStorageService.createNoteRef(noteData);
  res.json(note);
});

// PUT /api/messaging/notes/:id
app.put('/api/messaging/notes/:id', async (req, res) => {
  const messageId = parseInt(req.params.id);
  const updates = req.body;
  const note = await messageStorageService.updateNoteRef(messageId, updates);
  res.json(note);
});

// DELETE /api/messaging/notes/:id
app.delete('/api/messaging/notes/:id', async (req, res) => {
  const messageId = parseInt(req.params.id);
  const success = await messageStorageService.deleteNoteRef(messageId);
  res.json({ success });
});
```

#### Authentication Integration
All service layer operations require authenticated users:

- **Session Validation**: User authentication verified before service calls
- **User Scoping**: All operations filtered by authenticated user ID
- **Authorization**: Role-based access control ready for expansion

### Database Integration Patterns

#### PostgreSQL Operations
- **Drizzle ORM**: Type-safe database operations
- **User-scoped Queries**: All queries filtered by user ID
- **Transaction Support**: Atomic operations for data consistency
- **Error Handling**: Comprehensive error catching and logging

#### MongoDB Operations
- **Native Driver**: Direct MongoDB operations for flexibility
- **ObjectId Management**: Proper ObjectId generation and validation
- **Document Validation**: Schema validation for rich content
- **Connection Pooling**: Efficient connection management

### Performance Optimizations

#### Service Layer Caching
- **Query Result Caching**: Cache compiled messages for repeated access
- **Connection Pooling**: Reuse database connections efficiently
- **Batch Operations**: Process multiple messages in single operation
- **Lazy Loading**: Compile content only when requested

#### Database Query Patterns
- **Indexed Queries**: Optimize PostgreSQL queries with proper indexing
- **Selective Fields**: Query only required fields from both databases
- **Pagination Support**: Handle large datasets efficiently
- **Query Optimization**: Minimize database round trips

### Security Implementation

#### Data Validation
- **Input Sanitization**: Clean and validate all input data
- **Content Security**: HTML sanitization for rich content
- **Type Validation**: TypeScript ensures type safety throughout
- **SQL Injection Prevention**: Parameterized queries with Drizzle

#### Access Control
- **User Authentication**: Verify user identity for all operations
- **Data Scoping**: Users can only access their own data
- **Permission Checks**: Validate user permissions before operations
- **Audit Logging**: Track all service layer operations

### Development Guidelines

#### Service Layer Patterns
- **Single Responsibility**: Each service handles specific domain logic
- **Dependency Injection**: Services receive dependencies via constructor
- **Error Propagation**: Consistent error handling and propagation
- **Testing Strategy**: Comprehensive unit tests for all service methods

#### Code Organization
- **Type Safety**: Use TypeScript interfaces for all data structures
- **Consistent Interfaces**: Standardized method signatures across services
- **Documentation**: Clear documentation for all public methods
- **Version Control**: Maintain backward compatibility when possible

### Future Enhancements

#### Planned Service Features
- **Real-time Updates**: WebSocket integration for live data sync
- **Advanced Caching**: Redis integration for improved performance
- **Search Integration**: Full-text search across compiled content
- **Analytics**: Service-level metrics and performance monitoring

#### Scalability Improvements
- **Horizontal Scaling**: Design for multiple service instances
- **Load Balancing**: Distribute service calls across instances
- **Circuit Breakers**: Fault tolerance for external dependencies
- **Health Monitoring**: Service health checks and monitoring

### Testing Strategy

#### Unit Testing
- **Service Method Testing**: Test all public service methods
- **Mock Dependencies**: Mock database connections for isolated testing
- **Error Scenario Testing**: Test error handling and edge cases
- **Integration Testing**: Test service integration with databases

#### Performance Testing
- **Load Testing**: Test service performance under load
- **Memory Usage**: Monitor memory consumption patterns
- **Query Performance**: Optimize database query performance
- **Concurrent Access**: Test concurrent user scenarios

## Implementation Examples

### Creating a New Service

```typescript
// Example: Create new service following established patterns
class DocumentService {
  constructor(
    private storage: IStorage,
    private mongoClient: MongoClient
  ) {}
  
  async createDocument(documentData: InsertDocument): Promise<CompiledDocument> {
    // Implementation following MessageService patterns
  }
  
  async getDocumentsByUser(userId: number): Promise<CompiledDocument[]> {
    // Implementation following MessageService patterns
  }
}
```

### Error Handling Pattern

```typescript
// Example: Consistent error handling across services
try {
  const result = await this.performOperation();
  return result;
} catch (error) {
  console.error('Service operation failed:', error);
  throw new ServiceError('Operation failed', error);
}
```