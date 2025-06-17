# Service Layer Implementation Guide

## Service Layer Patterns

### Singleton Pattern Implementation
```typescript
export class MessageService {
  private static instance: MessageService;
  
  private constructor() {}
  
  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }
}

// Export singleton instance
export const messageService = MessageService.getInstance();
```

### Database Coordination Methods

#### Cross-Database Transaction Flow
```typescript
async createMessage(messageData: InsertMessage & { workflow?: string }): Promise<ServiceMessage> {
  // Step 1: Store rich content in MongoDB
  const documentId = await this.storeContentDocument(messageData.content, {
    contentType: 'rich-text',
    workflow: messageData.workflow as WorkflowType,
  });

  // Step 2: Create relational record in PostgreSQL
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
  };
}
```

#### Data Compilation Strategy
```typescript
async getMessagesByUser(userId: number): Promise<ServiceMessage[]> {
  // Fetch metadata from PostgreSQL
  const postgresMessages = await storage.getMessagesByUser(userId);

  // Compile with MongoDB content in parallel
  const compiledMessages = await Promise.all(
    postgresMessages.map(msg => this.compileMessage(msg))
  );

  return compiledMessages;
}

private async compileMessage(postgresMessage: Message): Promise<ServiceMessage> {
  const documentId = postgresMessage.content;
  
  // Fetch rich content from MongoDB
  const document = await this.getMongoDocument(documentId);
  
  return {
    ...postgresMessage,
    documentId,
    compiledContent: document.content,
    content: document.content, // Replace for frontend
  };
}
```

## MongoDB Document Operations

### Document Storage with Metadata
```typescript
private async storeContentDocument(
  content: string, 
  options: { 
    contentType: 'rich-text' | 'plain-text' | 'markdown';
    workflow?: WorkflowType;
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
```

### Document Updates and Versioning
```typescript
private async updateContentDocument(documentId: string, newContent: string): Promise<void> {
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
```

## API Integration Patterns

### RESTful Endpoint Implementation
```typescript
// GET /api/applicant-portal/messages
router.get('/messages', isApplicant, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Service layer handles all database coordination
    const messages = await messageService.getMessagesByUser(userId);
    
    console.log(`Fetched ${messages.length} compiled messages for user ${userId}`);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/applicant-portal/messages
router.post('/messages', isApplicant, async (req: any, res) => {
  try {
    const messageSchema = z.object({
      content: z.string().min(1).max(10000),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      isPrivate: z.boolean().default(false),
    });
    
    const validatedData = messageSchema.parse(req.body);
    
    // Service layer coordinates dual-database storage
    const newMessage = await messageService.createMessage({
      content: validatedData.content,
      messageType: 'rich-text',
      userId: req.user.id,
      priority: validatedData.priority,
      isPrivate: validatedData.isPrivate,
      isRead: false,
      workflow: 'application',
    });
    
    res.status(201).json(newMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create message' });
  }
});
```

### Frontend Integration
```typescript
// Frontend receives unified data structure
interface ServiceMessage {
  id: number;
  content: string;              // Compiled rich content from MongoDB
  messageType: string;
  userId: number;
  priority: string;
  isRead: boolean;
  workflow: string;
  createdAt: string;
  updatedAt: string;
  documentId?: string;          // MongoDB reference (optional)
  compiledContent?: string;     // Explicit compiled content field
}

// React Query implementation
const { data: messages, isLoading } = useQuery({
  queryKey: ['/api/applicant-portal/messages'],
  queryFn: async () => {
    const response = await fetch('/api/applicant-portal/messages');
    return response.json() as ServiceMessage[];
  }
});
```

## Error Handling and Resilience

### Connection Health Monitoring
```typescript
private async isMongoDBAvailable(): Promise<boolean> {
  try {
    const db = mongoConnection.getDatabase();
    await db.admin().ping();
    return true;
  } catch (error) {
    console.log('MongoDB unavailable, service will handle gracefully');
    return false;
  }
}
```

### Graceful Degradation
```typescript
async createMessage(messageData: InsertMessage): Promise<ServiceMessage> {
  const mongoAvailable = await this.isMongoDBAvailable();
  
  if (mongoAvailable) {
    // Full dual-database implementation
    return await this.createWithMongoDB(messageData);
  } else {
    // Fallback to PostgreSQL-only mode
    return await this.createWithPostgreSQLOnly(messageData);
  }
}
```

### Data Consistency Validation
```typescript
async validateMessageConsistency(messageId: number): Promise<boolean> {
  // Get PostgreSQL record
  const pgMessage = await storage.getMessage(messageId);
  if (!pgMessage) return false;

  // Verify MongoDB document exists
  const documentId = pgMessage.content;
  if (!ObjectId.isValid(documentId)) return false;

  const mongoDoc = await this.getMongoDocument(documentId);
  return !!mongoDoc;
}
```

## Performance Optimization

### Batch Operations
```typescript
async getMultipleMessagesCompiled(messageIds: number[]): Promise<ServiceMessage[]> {
  // Fetch all PostgreSQL records
  const pgMessages = await storage.getMessagesBatch(messageIds);
  
  // Extract MongoDB document IDs
  const documentIds = pgMessages.map(msg => msg.content).filter(ObjectId.isValid);
  
  // Batch fetch MongoDB documents
  const mongoDocuments = await this.getMultipleMongoDocuments(documentIds);
  
  // Create lookup map for efficiency
  const docMap = new Map(mongoDocuments.map(doc => [doc._id.toString(), doc]));
  
  // Compile results
  return pgMessages.map(pgMsg => {
    const doc = docMap.get(pgMsg.content);
    return {
      ...pgMsg,
      documentId: pgMsg.content,
      compiledContent: doc?.content || 'Content unavailable',
      content: doc?.content || pgMsg.content,
    };
  });
}
```

### Caching Strategy
```typescript
private documentCache = new Map<string, { content: string; expiry: number }>();

private async getCachedDocument(documentId: string): Promise<string | null> {
  const cached = this.documentCache.get(documentId);
  if (cached && cached.expiry > Date.now()) {
    return cached.content;
  }
  return null;
}

private setCachedDocument(documentId: string, content: string, ttl: number = 300000): void {
  this.documentCache.set(documentId, {
    content,
    expiry: Date.now() + ttl
  });
}
```

## Testing Strategies

### Unit Testing Service Methods
```typescript
describe('MessageService', () => {
  let messageService: MessageService;
  let mockStorage: jest.Mocked<IStorage>;
  let mockMongoConnection: jest.Mocked<MongoDBConnection>;

  beforeEach(() => {
    messageService = MessageService.getInstance();
    mockStorage = createMockStorage();
    mockMongoConnection = createMockMongoConnection();
  });

  test('should create message with MongoDB storage', async () => {
    const messageData = {
      content: '<p>Rich content</p>',
      userId: 1,
      messageType: 'rich-text' as const
    };

    const result = await messageService.createMessage(messageData);
    
    expect(result.compiledContent).toBe('<p>Rich content</p>');
    expect(result.documentId).toBeDefined();
    expect(mockStorage.createMessage).toHaveBeenCalled();
  });
});
```

### Integration Testing
```typescript
describe('Service Layer Integration', () => {
  test('should handle full message lifecycle', async () => {
    // Create message
    const created = await messageService.createMessage(testData);
    
    // Retrieve message
    const retrieved = await messageService.getMessagesByUser(testUserId);
    expect(retrieved).toContainEqual(expect.objectContaining({
      id: created.id,
      compiledContent: testData.content
    }));
    
    // Update message
    const updated = await messageService.updateMessage(created.id, {
      content: 'Updated content'
    });
    expect(updated.compiledContent).toBe('Updated content');
    
    // Delete message
    const deleted = await messageService.deleteMessage(created.id);
    expect(deleted).toBe(true);
  });
});
```

## Deployment Configuration

### Environment Setup
```typescript
// server/config/database.ts
export const databaseConfig = {
  postgres: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === 'production'
  },
  mongodb: {
    url: process.env.MONGODB_URL!,
    database: process.env.MONGODB_DATABASE || 'crew_plots_documents'
  }
};
```

### Service Initialization
```typescript
// server/index.ts
async function initializeServices() {
  // Initialize PostgreSQL connection
  await checkDatabaseConnection();
  
  // Initialize MongoDB connection
  await mongoConnection.connect();
  
  // Initialize service layer
  const serviceHealth = await messageService.healthCheck();
  console.log('Service layer initialized:', serviceHealth);
}
```

This implementation guide provides the foundation for building robust service layer architectures that coordinate between multiple database systems while maintaining clean interfaces for API consumers.