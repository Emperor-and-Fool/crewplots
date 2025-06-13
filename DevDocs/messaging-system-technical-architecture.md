# Messaging System Technical Architecture

## Overview
The messaging system implements a hybrid database architecture with rich text editing capabilities, combining PostgreSQL for metadata management and MongoDB for content storage. This document details the technical implementation of the editor components and the frontend-backend integration.

## Architecture Components

### Hybrid Database Strategy
- **PostgreSQL**: Stores message metadata, user permissions, timestamps, document references
- **MongoDB**: Stores rich text content, document versions, content metadata
- **Reference Pattern**: PostgreSQL records contain MongoDB ObjectIds as content references

## Frontend Components

### 1. RichTextEditor Component
**File**: `client/src/components/ui/rich-text-editor.tsx`

#### Core Technologies
- **TipTap Editor**: React wrapper for ProseMirror
- **Extensions Used**:
  - `StarterKit`: Basic editing functionality
  - `Placeholder`: Editor placeholder text
  - `Link`: URL link handling
  - `TextStyle` + `Color`: Text formatting
  - `Bold`, `Italic`: Basic text styling

#### Component Structure
```typescript
interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  maxHeight?: string;
}
```

#### Key Features
- **MenuBar**: Formatting toolbar with bold, italic, lists, links
- **Auto-update**: `onUpdate` callback triggers `onChange` with HTML content
- **Read-only Mode**: `editable={false}` for display purposes
- **Responsive Height**: Configurable `maxHeight` with scroll

#### Editor Initialization
```typescript
const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder }),
    Link.configure({ openOnClick: false }),
    TextStyle,
    Color,
  ],
  content,
  editable,
  onUpdate: ({ editor }) => {
    onChange(editor.getHTML())
  }
})
```

### 2. MessageDisplay Component
**File**: `client/src/components/ui/rich-text-editor.tsx`

#### Purpose
Read-only wrapper for displaying saved messages with rich text formatting.

```typescript
export function MessageDisplay({ content, className }: { 
  content: string; 
  className?: string 
}) {
  return (
    <RichTextEditor
      content={content}
      onChange={() => {}}
      editable={false}
      className={cn("border-0 bg-transparent", className)}
    />
  )
}
```

### 3. MessagingSystem Component
**File**: `client/src/components/ui/messaging-system.tsx`

#### State Management
```typescript
// Auto-save state
const [isAutoSaving, setIsAutoSaving] = useState(false);
const [hasSaveError, setHasSaveError] = useState(false);
const [draftMessageId, setDraftMessageId] = useState<number | null>(null);
const [lastSavedContent, setLastSavedContent] = useState('');

// Editor state
const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
const [editContent, setEditContent] = useState('');
```

#### Auto-save Implementation
```typescript
React.useEffect(() => {
  if (editContent.trim() && editContent !== lastSavedContent) {
    const timeoutId = setTimeout(() => {
      if (isNoteMode) {
        // Note mode: ensure only one note per user
        if (filteredMessages.length > 0) {
          setDraftMessageId(filteredMessages[0].id);
        }
      }
      autoSaveDraftMutation.mutate(editContent);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }
}, [editContent, lastSavedContent, draftMessageId, filteredMessages, isNoteMode]);
```

#### Mutation Functions
```typescript
// Create new message
const createMessageMutation = useMutation({
  mutationFn: async (data: MessageFormData): Promise<Message> => {
    const response = await fetch('/api/applicant-portal/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return response.json();
  }
});

// Auto-save draft
const autoSaveDraftMutation = useMutation({
  mutationFn: async (content: string): Promise<Message> => {
    if (draftMessageId) {
      // Update existing draft
      const response = await fetch(`/api/applicant-portal/messages/${draftMessageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include',
      });
      return response.json();
    } else {
      // Create new draft
      const response = await fetch('/api/applicant-portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, priority: 'normal', isPrivate: false }),
        credentials: 'include',
      });
      return response.json();
    }
  }
});
```

## Backend Architecture

### 1. API Routes
**File**: `server/routes/applicant-portal.ts`

#### Message Endpoints
```typescript
// GET /api/applicant-portal/messages
router.get('/messages', isApplicant, async (req: any, res) => {
  const userId = req.user.id;
  const messages = await messageService.getNoteRefsByUser(userId);
  res.json(messages);
});

// POST /api/applicant-portal/messages
router.post('/messages', isApplicant, async (req: any, res) => {
  const messageData = { ...req.body, userId: req.user.id };
  const message = await messageService.createNoteRef(messageData);
  res.status(201).json(message);
});

// PUT /api/applicant-portal/messages/:id
router.put('/messages/:id', isApplicant, async (req: any, res) => {
  const messageId = parseInt(req.params.id);
  const updatedMessage = await messageService.updateNoteRef(messageId, req.body);
  res.json(updatedMessage);
});
```

### 2. MessageService Layer
**File**: `server/services/message-service.ts`

#### Hybrid Storage Coordination
```typescript
class MessageService {
  // Check MongoDB availability
  private async isMongoDBAvailable(): Promise<boolean> {
    try {
      const db = mongoConnection.getDatabase();
      await db.admin().ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Create message with dual-database coordination
  async createNoteRef(messageData: InsertNoteRef): Promise<ServiceMessage> {
    const mongoAvailable = await this.isMongoDBAvailable();
    
    if (mongoAvailable) {
      // Step 1: Store rich content in MongoDB
      const documentId = await this.storeContentDocument(messageData.content, {
        contentType: 'rich-text',
        workflow: messageData.workflow || 'application',
      });

      // Step 2: Calculate metadata for PostgreSQL
      const plainText = messageData.content.replace(/<[^>]*>/g, '');
      const metadata = {
        wordCount: plainText.trim().split(/\s+/).length,
        characterCount: plainText.length,
        htmlLength: messageData.content.length,
      };

      // Step 3: Create relational record in PostgreSQL
      const postgresMessage = await storage.createNoteRef({
        ...messageData,
        content: documentId, // Store MongoDB ObjectId as reference
        documentId: documentId,
        documentType: messageData.workflow || 'motivation',
        wordCount: metadata.wordCount,
        characterCount: metadata.characterCount,
        htmlLength: metadata.htmlLength,
      });

      // Step 4: Return compiled message
      return {
        ...postgresMessage,
        documentId,
        compiledContent: messageData.content,
        content: messageData.content,
      };
    }
    
    // Fallback to PostgreSQL-only storage
    return await this.createPostgreSQLOnlyMessage(messageData);
  }
}
```

#### Content Document Storage
```typescript
private async storeContentDocument(content: string, options: {
  contentType: 'rich-text' | 'plain-text' | 'markdown';
  workflow: string;
}): Promise<string> {
  const db = mongoConnection.getDatabase();
  const collection = db.collection<MessageDocument>('note_files');

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

#### Message Compilation
```typescript
private async compileMessage(postgresMessage: NoteRef): Promise<ServiceMessage> {
  const mongoAvailable = await this.isMongoDBAvailable();
  
  if (mongoAvailable && ObjectId.isValid(postgresMessage.content)) {
    try {
      const db = mongoConnection.getDatabase();
      const collection = db.collection<MessageDocument>('note_files');
      const document = await collection.findOne({ 
        _id: new ObjectId(postgresMessage.content) 
      });
      
      if (document) {
        return {
          ...postgresMessage,
          documentId: postgresMessage.content,
          compiledContent: document.content,
          content: document.content, // Replace for frontend consumption
        };
      }
    } catch (error) {
      console.log('MongoDB document retrieval failed:', error);
    }
  }
  
  // Fallback to PostgreSQL content
  return {
    ...postgresMessage,
    compiledContent: postgresMessage.content,
  };
}
```

### 3. Database Storage Layer
**File**: `server/storage.ts`

#### PostgreSQL Operations
```typescript
class DatabaseStorage implements IStorage {
  async getNoteRefsByUser(userId: number): Promise<NoteRef[]> {
    return await db.select()
      .from(noteRefs)
      .where(eq(noteRefs.userId, userId))
      .orderBy(noteRefs.createdAt);
  }

  async createNoteRef(message: InsertNoteRef): Promise<NoteRef> {
    const [createdMessage] = await db.insert(noteRefs)
      .values(message)
      .returning();
    return createdMessage;
  }

  async updateNoteRef(id: number, message: Partial<InsertNoteRef>): Promise<NoteRef | undefined> {
    const [updatedMessage] = await db.update(noteRefs)
      .set(message)
      .where(eq(noteRefs.id, id))
      .returning();
    return updatedMessage || undefined;
  }
}
```

## Data Flow Sequence

### 1. Message Creation Flow
1. **Frontend**: User types in RichTextEditor
2. **Auto-save**: Debounced mutation triggers after 500ms
3. **API Route**: POST/PUT to `/api/applicant-portal/messages`
4. **MessageService**: Checks MongoDB availability
5. **MongoDB**: Stores rich text content, returns ObjectId
6. **PostgreSQL**: Stores metadata with MongoDB ObjectId reference
7. **Response**: Returns compiled message with content from MongoDB

### 2. Message Retrieval Flow
1. **Frontend**: useQuery fetches `/api/applicant-portal/messages`
2. **API Route**: GET from applicant portal
3. **MessageService**: `getNoteRefsByUser(userId)`
4. **PostgreSQL**: Fetches message metadata
5. **Compilation**: For each message, retrieves content from MongoDB
6. **Response**: Returns array of compiled messages
7. **Frontend**: MessageDisplay renders rich text using TipTap

### 3. Auto-save Flow
1. **TipTap Editor**: `onUpdate` callback triggered on content change
2. **State Update**: `editContent` state updated via `onChange`
3. **Debounced Effect**: 500ms timeout before auto-save
4. **Mutation**: PUT request to update existing draft
5. **MessageService**: Updates MongoDB content and PostgreSQL metadata
6. **UI Feedback**: Green "Draft saved" indicator

## Key Technical Decisions

### Why Hybrid Architecture?
1. **Scalability**: Separates metadata queries from content storage
2. **Performance**: PostgreSQL indexing for metadata, MongoDB for document operations
3. **Access Control**: Relational constraints for permissions, flexible schema for content
4. **Enterprise Pattern**: Used by major platforms (Facebook, Google Drive, Dropbox)

### Why TipTap Editor?
1. **React Integration**: Native React components
2. **Extensibility**: Rich plugin ecosystem
3. **HTML Output**: Clean, semantic HTML generation
4. **Accessibility**: Built-in keyboard navigation and screen reader support

### Auto-save Strategy
1. **Debounced Updates**: Prevents excessive API calls
2. **Draft Management**: Single draft per user in note mode
3. **Error Handling**: Visual feedback for save failures
4. **Optimistic Updates**: Immediate UI feedback while saving

## Error Handling

### MongoDB Unavailability
- System gracefully falls back to PostgreSQL-only mode
- No data loss during MongoDB outages
- Transparent recovery when MongoDB returns

### Network Failures
- Auto-save shows red "Save failed" indicator
- User can manually retry with Save button
- Draft content preserved in browser state

### Validation Errors
- Zod schema validation on backend
- Form validation feedback on frontend
- Character limits enforced (10,000 characters)

## Performance Optimizations

### Frontend
- Debounced auto-save (500ms)
- React Query caching for message lists
- Optimistic UI updates
- Lazy loading of rich text editor

### Backend
- Connection pooling for both databases
- Query result caching (30-second TTL)
- Parallel content compilation
- Efficient ObjectId validation

This architecture provides enterprise-grade messaging capabilities with rich text editing, reliable auto-save, and robust error handling while maintaining clean separation of concerns between metadata and content storage.