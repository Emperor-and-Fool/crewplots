# Messaging System Component

## Overview

The MessagingSystem is a dual-mode component that provides rich text communication capabilities for the CrewPlots platform. It operates in two distinct modes: **Notes** for personal documentation and **Messages** for inter-user communication.

## Component Architecture

### Core Component
**Location**: `client/src/components/ui/messaging-system.tsx`
**Type**: React functional component with hooks
**Dependencies**: TipTap, React Hook Form, TanStack Query

### Mode-Based Operation

The component's behavior changes based on the `mode` prop:

#### Note Mode (`mode="note"`)
- **Purpose**: Personal documentation, applicant motivation content
- **Storage**: Hybrid PostgreSQL + MongoDB architecture
- **Features**: Rich text editing, auto-save, private content
- **Current Status**: Fully operational

#### Messages Mode (`mode="messages"`)
- **Purpose**: Inter-user communication, team messaging
- **Storage**: Prepared for future implementation
- **Features**: Multi-user conversations, real-time updates
- **Current Status**: Framework in place, not yet implemented

## Component Interface

### Props Schema

```typescript
interface MessagingSystemProps {
  // Core configuration
  userId: number;                              // Required: Current user ID
  receiverId?: number;                         // Optional: Message recipient
  mode?: 'note' | 'messages';                 // Default: 'messages'
  
  // UI customization
  title?: string;                              // Component title
  placeholder?: string;                        // Editor placeholder text
  maxHeight?: string;                          // Container max height
  className?: string;                          // Custom CSS classes
  compactMode?: boolean;                       // Compact UI layout
  
  // Feature toggles
  showPriority?: boolean;                      // Priority selection UI
  showPrivateToggle?: boolean;                 // Private message toggle
  showMessageTypes?: boolean;                  // Message type selection
  allowMessageDeletion?: boolean;              // Delete permissions
  enableRichText?: boolean;                    // Rich text features
  enableFileAttachments?: boolean;             // File upload support
  enableEmoji?: boolean;                       // Emoji picker
  enableMarkdown?: boolean;                    // Markdown support
  
  // Workflow integration
  workflow?: 'application' | 'crew' | 'location' | 'scheduling' | 'knowledge' | 'statistics';
  documentStorage?: boolean;                   // MongoDB document storage
  
  // Display filtering
  showOnlyUserMessages?: boolean;              // Filter to user's messages
  showSystemMessages?: boolean;                // Show system notifications
  
  // Event handlers
  onMessageSent?: (message: Message) => void;  // Message sent callback
  onMessageClick?: (message: Message) => void; // Message click handler
}
```

### Form Validation

```typescript
const messageFormSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(5000, 'Message must be less than 5000 characters'),
  messageType: z.enum(['text', 'rich-text', 'system', 'notification']).default('rich-text'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  isPrivate: z.boolean().default(false),
  receiverId: z.number().optional(),
});
```

## Rich Text Integration

### TipTap Editor Features
- **Formatting**: Bold, italic, underline, strikethrough
- **Lists**: Bullet points, numbered lists
- **Links**: URL embedding with validation
- **History**: Undo/redo functionality
- **Dynamic Height**: Auto-growing editor area

### Custom Extensions
- **Placeholder**: Context-aware placeholder text
- **Color**: Text and highlight coloring
- **Link**: Enhanced link handling with previews

## Data Flow Architecture

### Note Mode Data Flow

#### Creation Process
1. User types in rich text editor
2. Content debounced for auto-save (500ms delay)
3. Form validation with Zod schema
4. API POST to `/api/messaging/notes`
5. PostgreSQL metadata creation
6. MongoDB document storage
7. Reference linking between databases
8. Frontend cache invalidation and update

#### Retrieval Process
1. TanStack Query fetches user notes
2. API GET from `/api/messaging/notes`
3. MessageService compiles hybrid data
4. PostgreSQL metadata + MongoDB content
5. Complete note objects returned to frontend
6. Rich text editor populated with content

#### Update Process
1. Edit mode activation in UI
2. Content modification in editor
3. Auto-save triggers PUT request
4. Backend updates both databases
5. Cache invalidation and refresh
6. UI reflects updated content

### Auto-Save Implementation

```typescript
// Debounced auto-save with 500ms delay
const debouncedAutoSave = React.useCallback(
  debounce(async (content: string) => {
    if (content.trim() && content !== lastSavedContent) {
      setIsAutoSaving(true);
      try {
        if (draftMessageId) {
          // Update existing note
          await updateMessageMutation.mutateAsync({
            id: draftMessageId,
            content: content
          });
        } else {
          // Create new note
          const result = await createMessageMutation.mutateAsync({
            content: content,
            messageType: 'rich-text',
            workflow: workflow || 'general'
          });
          setDraftMessageId(result.id);
        }
        setLastSavedContent(content);
        setHasSaveError(false);
      } catch (error) {
        setHasSaveError(true);
      } finally {
        setIsAutoSaving(false);
      }
    }
  }, 500),
  [draftMessageId, lastSavedContent, workflow]
);
```

## State Management

### Component State
- **editingMessageId**: Currently edited message ID
- **editContent**: Edit mode content buffer
- **hasCreatedMessage**: Creation status tracking
- **draftMessageId**: Auto-save draft reference
- **lastSavedContent**: Change detection for auto-save
- **isAutoSaving**: Save operation status
- **hasSaveError**: Error state indication

### Query Management
```typescript
// Fetch user's notes/messages
const { data: messages = [], isLoading, error } = useQuery({
  queryKey: ['/api/messaging/notes', userId],
  enabled: !!userId,
});

// Create new message mutation
const createMessageMutation = useMutation({
  mutationFn: async (data: MessageFormData) => {
    return apiRequest(`/api/messaging/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/messaging/notes'] });
  },
});
```

## UI Components Structure

### Component Hierarchy
```
MessagingSystem
├── Card Container
│   ├── CardHeader
│   │   ├── Title with Mode Badge
│   │   └── Stats Display (message count, word count)
│   └── CardContent
│       ├── Message List (ScrollArea)
│       │   └── Message Cards
│       │       ├── Message Content (RichTextEditor display)
│       │       ├── Message Metadata (timestamp, priority)
│       │       └── Action Buttons (edit, delete)
│       └── Compose Area
│           ├── RichTextEditor
│           ├── Priority Selector
│           ├── Private Toggle
│           └── Send Button
```

### Styling System
- **Theme Support**: Light/dark mode compatibility
- **Responsive Design**: Mobile-first approach
- **Priority Colors**: Color-coded priority indicators
- **Status Indicators**: Auto-save, error, and success states

## Usage Examples

### Applicant Portal Integration
```typescript
<MessagingSystem
  userId={user.id}
  mode="note"
  title="Why you want to be part of our crew"
  placeholder="Type your note about your application..."
  showPriority={false}
  showPrivateToggle={false}
  compactMode={true}
  workflow="application"
  documentStorage={true}
  onMessageSent={(message) => {
    toast({
      title: "Note saved successfully!",
      description: "Your note has been recorded and will be reviewed.",
    });
  }}
/>
```

### Future Messages Mode
```typescript
<MessagingSystem
  userId={currentUser.id}
  receiverId={targetUser.id}
  mode="messages"
  title="Team Communication"
  showPriority={true}
  showPrivateToggle={true}
  enableFileAttachments={true}
  allowMessageDeletion={true}
  workflow="crew"
/>
```

## Error Handling

### Authentication Errors
- **Session Expiry**: Clear error messages with login prompts
- **Unauthorized Access**: User-friendly permission denied messages
- **Network Issues**: Retry mechanisms and offline indicators

### Data Validation
- **Content Length**: 5000 character limit with live counter
- **Required Fields**: Form validation with clear error messages
- **HTML Sanitization**: Server-side content cleaning

### MongoDB Integration
- **Service Unavailability**: Explicit failure per development guidelines
- **Connection Errors**: Clear error states without fallback
- **Data Integrity**: Consistent error handling across hybrid storage

## Performance Optimizations

### Frontend Optimizations
- **Debounced Auto-Save**: Prevents excessive API calls
- **Optimistic Updates**: Immediate UI feedback
- **Query Caching**: Efficient data fetching with TanStack Query
- **Lazy Loading**: Dynamic content loading for large datasets

### Backend Optimizations
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed database queries
- **Content Compilation**: Efficient hybrid data assembly
- **Caching Strategy**: Redis-based performance caching

## Future Enhancements

### Planned Features
- **Real-time Messaging**: WebSocket integration for live updates
- **File Attachments**: GridFS-based file upload system
- **Emoji Reactions**: Message reaction system
- **Message Threading**: Conversation threading and replies
- **Search Functionality**: Full-text search across messages
- **Export Capabilities**: PDF/HTML export for notes

### Technical Improvements
- **Offline Support**: Progressive Web App capabilities
- **Voice Messages**: Audio recording and playback
- **Collaborative Editing**: Real-time collaborative text editing
- **Advanced Formatting**: Tables, code blocks, mathematical expressions
- **Integration APIs**: External service integrations (calendar, tasks)