# Messaging System Documentation

## Overview
The CrewPlotsManager includes a sophisticated, extensible messaging system designed for communication between different user types (admins, managers, applicants) with support for conversations, individual messages, and customizable views.

## Database Schema

### Messages Table
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  userId INTEGER NOT NULL REFERENCES users(id),
  applicantId INTEGER REFERENCES applicants(id),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  messageType TEXT DEFAULT 'text',
  isPrivate BOOLEAN DEFAULT false,
  isRead BOOLEAN DEFAULT false,
  attachmentUrl TEXT,
  metadata JSON,
  createdAt TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Key Features
- **User Association**: Every message is linked to a user (who wrote it)
- **Applicant Conversations**: Optional applicantId for applicant-specific conversations
- **Priority System**: Support for low, normal, high, urgent priority levels
- **Message Types**: Extensible messageType field (text, rich-text, system, notification)
- **Privacy Control**: isPrivate flag for internal/private messages
- **Read Status**: isRead tracking for message status
- **Attachments**: Support for file attachments via attachmentUrl
- **Metadata**: JSON field for extensible message data

### Type Definitions
```typescript
export type Message = {
  id: number;
  content: string;
  userId: number;
  applicantId: number | null;
  priority: "low" | "normal" | "high" | "urgent" | null;
  messageType: string | null;
  isPrivate: boolean | null;
  isRead: boolean | null;
  attachmentUrl: string | null;
  metadata: any | null;
  createdAt: Date;
};

export type InsertMessage = {
  content: string;
  userId: number;
  applicantId?: number | null;
  priority?: "low" | "normal" | "high" | "urgent" | null;
  messageType?: string | null;
  isPrivate?: boolean | null;
  isRead?: boolean | null;
  attachmentUrl?: string | null;
  metadata?: any | null;
};
```

## Storage Layer (server/storage.ts)

### Available Methods
```typescript
interface IStorage {
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessages(): Promise<Message[]>;
  getMessagesByUser(userId: number): Promise<Message[]>;
  getMessagesByApplicant(applicantId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message | undefined>;
  deleteMessage(id: number): Promise<boolean>;
  userHasAccessToApplicant(userId: number, applicantId: number): Promise<boolean>;
}
```

### Implementation Details
- **Database Integration**: Uses Drizzle ORM with PostgreSQL
- **Ordering**: Messages ordered by createdAt timestamp
- **Access Control**: Built-in permission checking for applicant access
- **Error Handling**: Comprehensive error handling with proper return types

## API Routes (server/routes/messages.ts)

### GET /api/messages/:identifier?
**Purpose**: Fetch messages for user or specific applicant

**Authentication**: Required (uses requireAuth middleware)

**Parameters**:
- `identifier` (optional): If provided and numeric, treated as applicantId
- If no identifier: returns messages for current authenticated user
- If identifier provided: returns messages for that applicant

**Response**: Array of Message objects ordered by creation time

**Examples**:
```javascript
// Get messages for current user
GET /api/messages

// Get messages for applicant with ID 5
GET /api/messages/5
```

### POST /api/messages
**Purpose**: Create a new message

**Authentication**: Required

**Request Body**: InsertMessage object (minus userId which is auto-populated)

**Validation**: 
- Uses insertMessageSchema for validation
- Verifies applicant exists if applicantId provided
- Automatically sets userId from authenticated user

**Response**: Created Message object

**Example**:
```javascript
POST /api/messages
{
  "content": "Great interview! Looking forward to having you on the team.",
  "applicantId": 5,
  "priority": "normal",
  "messageType": "text"
}
```

### PATCH /api/messages/:messageId/read
**Purpose**: Mark a message as read

**Authentication**: Required

**Access Control**: 
- Message author can mark own messages as read
- Users with applicant access can mark applicant messages as read

**Response**: Updated Message object

### DELETE /api/messages/:messageId
**Purpose**: Delete a message

**Authentication**: Required

**Access Control**: Only message author can delete their own messages

**Response**: Success confirmation

## Existing Messaging Component (client/src/components/ui/messaging-system.tsx)

### Current Component Interface
```typescript
interface MessagingSystemProps {
  applicantId: number;
  currentUserId: number;
  messages: Message[];
  onMessageSave: (content: string) => void;
}
```

### Key Features Implemented
1. **Text Formatting Functions**:
   - `insertFormatting(before, after)`: Adds formatting around selected text
   - `insertEmoji(emoji)`: Inserts emoji at cursor position
   - `renderMessageContent(content)`: Renders **bold** and *italic* formatting

2. **Rich Text Toolbar**:
   - Bold button (wraps selection with `**`)
   - Italic button (wraps selection with `*`)
   - Emoji buttons (😊, 👍, ❤️)

3. **Message Display**:
   - Conversation-style layout
   - Author identification (You vs Admin)
   - Timestamp formatting
   - Different styling for own vs other messages

4. **Form Handling**:
   - Character count (0/1000)
   - Loading states
   - Form validation
   - Toast notifications

### Current Limitations
The component appears to be designed for a different data flow than the current API structure. It expects:
- Messages to be passed as props
- A callback function for saving messages
- Manual message list management

## Integration Requirements

To properly integrate the existing messaging system with the applicant management workflow, the following adjustments need to be made:

### 1. Update Component to Use API Directly
The component should:
- Use `useQuery` to fetch messages from `/api/messages/:applicantId`
- Use `useMutation` to create messages via `POST /api/messages`
- Handle loading/error states appropriately
- Automatically refresh message list after sending

### 2. Proper Data Flow Integration
For applicant detail pages:
```typescript
// In applicant-detail.tsx
<MessagingSystem
  applicantId={applicant.id}
  currentUserId={currentUser.id}
  // Remove messages prop - component should fetch directly
  // Remove onMessageSave prop - component should handle API calls
/>
```

### 3. Support Different Message Types
Extend the component to support:
- Internal notes (messageType: "text", isPrivate: true)
- Communications (messageType: "text", isPrivate: false)
- System notifications (messageType: "system")
- Priority indicators

### 4. Access Control Integration
Ensure the component respects:
- User roles and permissions
- Private vs public message visibility
- Applicant-specific access rights

## Usage Patterns

### For Applicant Management
```typescript
// Admin/Manager viewing applicant messages
<MessagingSystem
  applicantId={applicant.id}
  currentUserId={currentUser.id}
  showPrivateMessages={true}
  allowPrivateNotes={true}
  enablePriority={true}
/>
```

### For Applicant Portal
```typescript
// Applicant viewing their own messages
<MessagingSystem
  applicantId={applicant.id}
  currentUserId={currentUser.id}
  showPrivateMessages={false}
  allowPrivateNotes={false}
  enablePriority={false}
/>
```

## Security Considerations

1. **Authentication**: All API endpoints require valid authentication
2. **Authorization**: Users can only access messages they have permission for
3. **Data Validation**: All inputs validated via Zod schemas
4. **SQL Injection**: Protected by Drizzle ORM parameterized queries
5. **XSS Protection**: Message content should be sanitized when rendering HTML

## Extension Points

The messaging system is designed to be highly extensible:

1. **Message Types**: Add new messageType values for different use cases
2. **Priority Levels**: Extend priority enum for more granular control
3. **Metadata**: Use JSON metadata field for custom message data
4. **Attachments**: File attachment system already scaffolded
5. **Real-time Updates**: WebSocket integration points available
6. **Custom Rendering**: Component supports different view modes

## Next Steps for Integration

1. **Analyze Current Component**: Understand the exact data flow expectations
2. **Update API Calls**: Modify component to use direct API integration
3. **Test Message Flow**: Verify end-to-end message creation and display
4. **Add Rich Text**: Ensure formatting buttons actually work
5. **Implement Access Control**: Add proper permission checking
6. **Add Real-time Updates**: Consider WebSocket integration for live updates