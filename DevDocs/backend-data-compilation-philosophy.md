# Backend Data Compilation Philosophy

## Core Principle: Complete Data Assembly

The backend must always compile complete, ready-to-render data packages before sending them to the frontend. This ensures optimal performance, security, and maintainability across our hybrid database architecture.

## Fundamental Rules

### 1. Single Request, Complete Response
- Frontend makes ONE request for a complete view
- Backend assembles data from ALL necessary sources (PostgreSQL, MongoDB, external APIs)
- Response contains everything needed to render the UI component

### 2. No Cross-Referencing on Frontend
- Never send raw IDs that require additional lookups
- Always resolve relationships and references server-side
- Include computed permissions and business logic results

### 3. Consistent Data Shape
- Maintain identical response structure regardless of underlying storage
- Abstract storage complexity from frontend consumers
- Provide predictable object shapes for TypeScript interfaces

## Implementation Patterns

### ❌ Anti-Pattern: Fragmented Data
```javascript
// BAD: Frontend needs multiple requests
GET /api/notes/123          // Returns: { id: 123, authorId: 456, content: "ref_mongo_abc" }
GET /api/users/456          // Returns: { id: 456, name: "John" }
GET /api/documents/ref_mongo_abc  // Returns encrypted content
```

### ✅ Correct Pattern: Compiled Data
```javascript
// GOOD: Single request, complete response
GET /api/notes/123
// Returns:
{
  id: 123,
  workflow: "onboarding",
  createdAt: "2025-01-15T10:30:00Z",
  author: { 
    id: 456, 
    name: "John Doe", 
    role: "manager" 
  },
  participants: [
    { id: 789, name: "Jane Smith", role: "crew_member" }
  ],
  content: "Actual decrypted note content",  // From MongoDB
  metadata: {
    lastModified: "2025-01-15T11:00:00Z",
    wordCount: 245,
    hasAttachments: true
  },
  permissions: {
    canEdit: true,
    canDelete: false,
    canShare: true
  }
}
```

## Database Strategy

### PostgreSQL: Metadata & Relationships
- User information, roles, permissions
- Timestamps, workflow states, categorization
- Foreign keys and relationship mappings
- Quick-access fields for filtering/sorting

### MongoDB: Content & Documents
- Encrypted sensitive content
- Large text fields (note content, messages)
- File attachments and binary data
- Document versions and revisions

### Service Layer Responsibilities
- Fetch metadata from PostgreSQL
- Retrieve content from MongoDB using stored references
- Decrypt sensitive data server-side
- Resolve user/role relationships
- Compute permissions based on business rules
- Assemble complete response objects

## Security Benefits

### Server-Side Decryption
- Encryption keys never exposed to frontend
- Content decryption happens in secure backend environment
- Audit trails for sensitive data access

### Permission Computing
- Business logic centralized in backend services
- Consistent permission enforcement
- No client-side security decisions

## Performance Benefits

### Reduced Network Calls
- Single HTTP request per view
- Minimized frontend-backend communication
- Better caching opportunities

### Optimized Queries
- Backend can optimize cross-database queries
- Efficient batching of related data
- Connection pooling benefits

## Development Guidelines

### Service Layer Architecture
```javascript
// Service handles complexity
class NotesService {
  async getNote(id: number, requestingUser: User): Promise<CompiledNote> {
    // 1. Fetch metadata from PostgreSQL
    const metadata = await db.select().from(messages).where(eq(messages.id, id));
    
    // 2. Fetch content from MongoDB
    const content = await documentService.getDocument(metadata.documentReference);
    
    // 3. Resolve relationships
    const author = await getUserById(metadata.authorId);
    const participants = await getUsersByIds(metadata.participantIds);
    
    // 4. Compute permissions
    const permissions = computeNotePermissions(metadata, requestingUser);
    
    // 5. Return compiled object
    return {
      ...metadata,
      content: content.decryptedData,
      author,
      participants,
      permissions
    };
  }
}
```

### Route Layer (Thin Controllers)
```javascript
// Routes stay thin
app.get('/api/notes/:id', async (req, res) => {
  try {
    const note = await notesService.getNote(req.params.id, req.user);
    res.json(note);
  } catch (error) {
    res.status(404).json({ error: 'Note not found' });
  }
});
```

### Frontend Consumption
```javascript
// Frontend receives complete data
const { data: note } = useQuery({
  queryKey: ['/api/notes', noteId],
  // No additional processing needed
});

// Direct rendering
return (
  <div>
    <h1>{note.title}</h1>
    <p>By {note.author.name} on {note.createdAt}</p>
    <div>{note.content}</div>
    {note.permissions.canEdit && <EditButton />}
  </div>
);
```

## Error Handling

### Graceful Degradation
- If MongoDB unavailable: return metadata with "content unavailable" message
- If user resolution fails: show anonymous placeholders
- Always provide usable response structure

### Consistent Error Shapes
```javascript
// Standard error response
{
  error: "Resource not found",
  code: "NOT_FOUND",
  details: {
    resource: "note",
    id: 123
  }
}
```

## Testing Strategy

### Unit Tests
- Test each service method with complete data assembly
- Mock database layers independently
- Verify permission computation logic

### Integration Tests
- Test full request-response cycle
- Verify cross-database data consistency
- Test graceful degradation scenarios

This philosophy ensures our hybrid architecture remains maintainable, performant, and secure while providing the best possible developer experience for both backend and frontend teams.