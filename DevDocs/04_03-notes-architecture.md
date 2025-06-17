# Notes Architecture

## Overview

The notes system provides personal documentation functionality for users within the ShiftPro platform. It enables rich text content creation, editing, and storage using a hybrid database architecture that separates metadata from content storage.

## Architecture Principles

### Hybrid Storage Strategy
- **PostgreSQL**: Stores note metadata, references, and relationships
- **MongoDB**: Stores rich HTML content and document data
- **No Fallback**: System fails explicitly when MongoDB is unavailable

### Content Compilation
The system uses a service layer pattern that compiles PostgreSQL references with MongoDB content to create complete note objects for frontend consumption.

## Data Flow

### Creation Process
1. User creates note via rich text editor
2. Frontend validates and sanitizes input
3. Backend creates PostgreSQL record with MongoDB document ID
4. Rich content stored in MongoDB with generated ObjectId
5. PostgreSQL record updated with MongoDB reference

### Retrieval Process
1. Query PostgreSQL for note metadata
2. Extract MongoDB document ID from content field
3. Fetch rich content from MongoDB using ObjectId
4. Compile and return complete note object

### Update Process
1. Update PostgreSQL metadata if changed
2. Update MongoDB content document
3. Maintain referential integrity between databases

## Database Schema

### PostgreSQL Note References (noteRefs table)
```sql
CREATE TABLE note_refs (
  id SERIAL PRIMARY KEY,
  content TEXT,                    -- MongoDB ObjectId reference
  message_type TEXT DEFAULT 'rich-text',
  user_id INTEGER NOT NULL,
  receiver_id INTEGER,
  is_private BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal',
  workflow TEXT DEFAULT 'general',
  document_id TEXT,               -- MongoDB ObjectId
  document_type TEXT DEFAULT 'general',
  word_count INTEGER DEFAULT 0,
  character_count INTEGER DEFAULT 0,
  html_length INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'private',
  is_editable BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### MongoDB Document Structure
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

## Service Layer Implementation

### MessageService Class
Central service managing hybrid storage operations:

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

### Error Handling Strategy
- **Explicit Failures**: No fallback to PostgreSQL when MongoDB unavailable
- **Referential Integrity**: Validates MongoDB document existence before compilation
- **Transaction Safety**: Ensures consistency across both databases

## API Implementation

### Route Structure
```
/api/messaging/notes
├── GET    /     - Retrieve user notes
├── POST   /     - Create new note
├── PUT    /:id  - Update existing note
└── DELETE /:id  - Delete note
```

### Authentication & Authorization
- All endpoints require valid user session
- Users can only access their own notes
- Role-based access for future expansion

### Request/Response Format
```typescript
// Create Note Request
{
  content: string,           // Rich HTML content
  messageType: 'rich-text',
  workflow?: string,
  isPrivate?: boolean
}

// Note Response
{
  id: number,
  content: string,           // MongoDB ObjectId reference
  compiledContent: string,   // Actual rich HTML content
  messageType: string,
  userId: number,
  workflow: string,
  wordCount: number,
  characterCount: number,
  htmlLength: number,
  createdAt: Date,
  updatedAt: Date
}
```

## Frontend Integration

### Component Architecture
```
ApplicantPortal
└── MessagingSystem (mode="note")
    ├── RichTextEditor (TipTap-based)
    ├── Form Management (React Hook Form)
    ├── Query Management (TanStack Query)
    └── Auto-save functionality
```

### Rich Text Editor Features
- **TipTap Integration**: Modern rich text editing
- **Dynamic Height**: Grows with content automatically
- **Formatting Tools**: Bold, italic, lists, links
- **Auto-save**: Debounced content preservation
- **Real-time Preview**: Live content display

### State Management
- **TanStack Query**: Caching and synchronization
- **Optimistic Updates**: Immediate UI feedback
- **Error Boundaries**: Graceful failure handling

## Performance Optimizations

### Content Compilation
- **Lazy Loading**: Compile content only when requested
- **Caching Strategy**: Cache compiled content at service layer
- **Batch Operations**: Process multiple notes efficiently

### Database Efficiency
- **Indexed Queries**: Optimized PostgreSQL queries on user_id
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Minimize database round trips

### Frontend Performance
- **Debounced Auto-save**: Prevents excessive API calls
- **Content Pagination**: Handle large note collections
- **Optimistic UI**: Immediate feedback without waiting

## Security Considerations

### Data Protection
- **HTML Sanitization**: Prevent XSS attacks in rich content
- **Input Validation**: Server-side content validation
- **Access Control**: User-scoped data access only

### Content Security
- **MongoDB Isolation**: Separate document storage
- **Referential Validation**: Verify document ownership
- **Content Encryption**: Future enhancement for sensitive data

## Scalability Architecture

### Horizontal Scaling
- **Service Separation**: Independent MongoDB/PostgreSQL scaling
- **Read Replicas**: Distribute read operations
- **Content Distribution**: MongoDB sharding for large datasets

### Performance Monitoring
- **Query Performance**: Monitor database operation timing
- **Content Size Tracking**: Monitor document growth
- **User Activity**: Track note creation and update patterns

## Future Enhancements

### Planned Features
- **Version History**: Track note revisions
- **Collaboration**: Multi-user note editing
- **Templates**: Pre-defined note structures
- **Export Options**: PDF, markdown, plain text

### Technical Improvements
- **Content Search**: Full-text search across notes
- **Real-time Sync**: WebSocket-based live updates
- **Offline Support**: Client-side content caching
- **Advanced Formatting**: Extended rich text features