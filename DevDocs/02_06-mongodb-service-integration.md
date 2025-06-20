# MongoDB Service Integration

## Overview

The MongoDB service integration provides document storage capabilities for rich content and messaging within the CrewPlots application. This service operates under strict explicit failure policies to ensure data integrity.

## Service Architecture

### Current Implementation Status
- **Status**: Actively used by messaging system
- **Purpose**: Rich content storage for notes and messaging
- **Integration**: Direct connection with MessageService for hybrid storage
- **Management**: On-demand startup and connection handling

### MongoDB Instance Management
The service manages local MongoDB instances for development and testing:
- **Automatic Startup**: MongoDB started when needed by messaging system
- **Port Management**: Handles MongoDB port allocation and binding (default: 27017)
- **Connection Pooling**: Efficient connection management for messaging service
- **Data Directory**: Automatic creation and management of `mongodb_data/`

## Integration with Messaging System

### Current Usage Patterns
The messaging system actively uses MongoDB for:
- **Rich Content Storage**: HTML content from TipTap editor
- **Document References**: ObjectId-based content linking from PostgreSQL
- **Metadata Storage**: Additional document information and versioning
- **GridFS Support**: File attachment storage for large documents

### Service Activation Flow
MongoDB service is activated when:
1. **Messaging System Startup**: Automatic connection establishment
2. **Note Operations**: Create, read, update, delete operations
3. **Content Compilation**: When PostgreSQL references need MongoDB content
4. **File Operations**: GridFS file upload/download operations

### Hybrid Storage Architecture
```
PostgreSQL (Authoritative)     MongoDB (Document Store)
├── User sessions             ├── Rich HTML content
├── Message metadata          ├── TipTap editor documents
├── ObjectId references   ────┤ ├── File attachments (GridFS)
├── Conversation threads      ├── Document versioning
└── System configuration      └── Content metadata
```

## Technical Implementation

### Connection Management
```typescript
class MongoDBConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private gridFS: GridFSBucket | null = null;

  async connect(): Promise<void> {
    // Establish connection with retry logic
    // Initialize GridFS bucket
    // Set up connection monitoring
  }

  async disconnect(): Promise<void> {
    // Graceful connection cleanup
    // Resource deallocation
  }
}
```

### Document Operations
```typescript
// Content storage
const document = await mongoService.insertDocument({
  content: '<p>Rich HTML content</p>',
  author: userId,
  type: 'note',
  createdAt: new Date()
});

// Reference storage in PostgreSQL
await db.messages.insert({
  id: generateId(),
  mongoDocumentId: document.insertedId.toString(),
  conversationId,
  userId
});
```

### GridFS File Handling
```typescript
// File upload
const uploadStream = gridFS.openUploadStream(filename, {
  metadata: { 
    originalName: filename,
    contentType: mimeType,
    uploadedBy: userId 
  }
});

// File retrieval
const downloadStream = gridFS.openDownloadStream(fileId);
```

## Error Handling and Reliability

### Explicit Failure Design
**Critical**: MongoDB follows strict explicit failure policies:
- **No Silent Fallbacks**: System MUST fail clearly when MongoDB unavailable
- **No PostgreSQL Fallback**: Never attempt to store documents in PostgreSQL
- **Visible Failures**: Clear error messages displayed to users
- **Fail Fast**: Immediate failure when MongoDB connection lost

### Service Health Management
```typescript
async checkMongoDBHealth(): Promise<ServiceStatus> {
  try {
    await this.db.admin().ping();
    return { status: 'healthy', lastCheck: new Date() };
  } catch (error) {
    return { 
      status: 'error', 
      error: error.message,
      lastCheck: new Date() 
    };
  }
}
```

### Connection Recovery
- **Automatic Retry**: Limited retry attempts on connection loss
- **Circuit Breaker**: Fail fast after consecutive failures
- **Status Monitoring**: Continuous health check monitoring
- **User Notification**: Clear error messages for service unavailability

## Development and Production Considerations

### Local Development
- **On-Demand Startup**: MongoDB starts automatically when needed
- **Data Persistence**: Local `mongodb_data/` directory for development data
- **Resource Management**: Efficient resource usage during development
- **Testing Support**: Reliable service availability for testing

### Production Deployment
- **External MongoDB**: Connection to production MongoDB clusters
- **Replica Sets**: Support for MongoDB replica set configurations
- **Authentication**: MongoDB authentication and authorization
- **SSL/TLS**: Secure connections in production environments

### Performance Optimization
- **Connection Pooling**: Optimized connection pool configuration
- **Index Management**: Automatic index creation for query optimization
- **Batch Operations**: Efficient bulk document operations
- **Memory Management**: Optimized memory usage for large documents

## Proxy Architecture (Legacy)

### MongoDB Proxy Server
The legacy proxy server (`mongo-proxy-server.js`) provides:
- **Process Management**: MongoDB process lifecycle management
- **API Endpoints**: RESTful API for MongoDB operations
- **Development Support**: Simplified MongoDB access during development

**Note**: The proxy is being phased out in favor of direct MongoDB integration.

## API Usage Examples

### Document Creation
```typescript
// Create rich content document
const result = await mongoConnection.getDatabase()
  .collection('documents')
  .insertOne({
    content: richHtmlContent,
    metadata: {
      author: userId,
      type: 'note',
      version: 1
    },
    createdAt: new Date()
  });

// Store reference in PostgreSQL
await db.insert(messages).values({
  id: generateId(),
  mongoDocumentId: result.insertedId.toString(),
  conversationId: conversationId,
  userId: userId
});
```

### Content Retrieval
```typescript
// Get document from MongoDB using PostgreSQL reference
const message = await db.query.messages.findFirst({
  where: eq(messages.id, messageId)
});

if (message.mongoDocumentId) {
  const document = await mongoConnection.getDatabase()
    .collection('documents')
    .findOne({ _id: new ObjectId(message.mongoDocumentId) });
  
  return {
    ...message,
    content: document.content
  };
}
```

### File Upload with GridFS
```typescript
// Upload file to GridFS
const uploadStream = mongoConnection.getGridFS()
  .openUploadStream(filename, {
    metadata: {
      originalName: filename,
      contentType: mimeType,
      uploadedBy: userId,
      conversationId: conversationId
    }
  });

const fileId = await new Promise((resolve, reject) => {
  uploadStream.end(fileBuffer);
  uploadStream.on('finish', () => resolve(uploadStream.id));
  uploadStream.on('error', reject);
});
```

## Monitoring and Health Checks

### Service Health Endpoints
```typescript
// MongoDB health check
app.get('/api/health/mongodb', async (req, res) => {
  try {
    const result = await mongoConnection.checkConnection();
    res.json({ 
      status: 'healthy', 
      connected: result,
      timestamp: new Date() 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date() 
    });
  }
});
```

### Performance Metrics
```typescript
const metrics = {
  connections: {
    active: await getActiveConnections(),
    pool: await getPoolStats()
  },
  operations: {
    insertsPerSecond: await getInsertRate(),
    queriesPerSecond: await getQueryRate()
  },
  storage: {
    documentsCount: await getDocumentCount(),
    totalSize: await getDatabaseSize()
  }
};
```

## Future Enhancements

### Planned Improvements
- **Advanced Indexing**: Optimized indexes for content search
- **Full-Text Search**: MongoDB text search capabilities
- **Document Versioning**: Advanced version control for content
- **Backup Integration**: Automated backup and restore procedures
- **Performance Analytics**: Advanced performance monitoring and optimization

### Scalability Considerations
- **Sharding**: Horizontal scaling for large datasets
- **Read Replicas**: Read scaling for high-traffic scenarios
- **Caching Layer**: Redis integration for frequently accessed documents
- **CDN Integration**: Content delivery optimization for file attachments