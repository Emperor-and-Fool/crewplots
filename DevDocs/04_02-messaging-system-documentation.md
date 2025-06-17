# Messaging System Documentation

## Overview

The messaging system provides dual-mode functionality for user communications within the ShiftPro platform. It operates in two distinct modes: **Notes** and **Messages**, each serving different purposes and user workflows.

## System Architecture

### Dual-Mode Operation

The messaging system supports two operational modes:

1. **Note Mode**: For personal notes, motivational content, and individual documentation
2. **Message Mode**: For inter-user communication and team messaging

### Mode Selection

Mode is determined by the `mode` prop in the MessagingSystem component:
```typescript
<MessagingSystem 
  userId={user.id} 
  mode="note"  // or "messages"
  title="My Motivational Notes" 
/>
```

## Current Implementation Status

### Working Features

#### Notes Mode
- **Rich Text Editing**: Full TipTap-based rich text editor with formatting toolbar
- **Auto-Save**: Automatic saving with draft management
- **Hybrid Storage**: PostgreSQL metadata + MongoDB rich content
- **Dynamic Height**: Editor grows with content automatically
- **Real-time Preview**: Live preview of formatted content

#### Message Mode
- **Placeholder**: Basic structure in place for future development
- **API Endpoints**: Prepared for messaging functionality

### Technical Implementation

#### Frontend Component Structure
```
MessagingSystem
├── Mode Detection (note vs messages)
├── Rich Text Editor Integration
├── Form Handling with React Hook Form
├── Query Management with TanStack Query
└── UI Components (Cards, Buttons, Scrollable Areas)
```

#### API Integration
- **Notes Endpoint**: `/api/messaging/notes`
- **CRUD Operations**: Create, Read, Update, Delete
- **User-specific**: All operations scoped to authenticated user

#### Data Flow
1. User creates/edits note in rich text editor
2. Content auto-saves with debouncing
3. PostgreSQL stores metadata (ID, timestamps, user reference)
4. MongoDB stores rich HTML content
5. Service layer compiles data for display

## Use Cases

### Primary Use Case: Applicant Motivational Notes
- Applicants write and maintain personal motivational content
- Rich text formatting for emphasis and structure
- Private notes visible only to the note creator
- Auto-save prevents data loss during editing

### Future Use Cases
- Team messaging between staff members
- Notifications and system announcements
- Document collaboration and feedback
- Workflow-specific communications

## API Reference

### Notes Endpoints

#### GET /api/messaging/notes
Retrieves all notes for the authenticated user
- **Authentication**: Required
- **Response**: Array of compiled note objects with rich content

#### POST /api/messaging/notes
Creates a new note
- **Authentication**: Required
- **Body**: Note content and metadata
- **Response**: Created note object

#### PUT /api/messaging/notes/:id
Updates existing note
- **Authentication**: Required
- **Body**: Updated note content
- **Response**: Updated note object

#### DELETE /api/messaging/notes/:id
Deletes a note
- **Authentication**: Required
- **Response**: Success confirmation

## Component Configuration

### MessagingSystem Props

```typescript
interface MessagingSystemProps {
  userId: number;                    // Required: User ID
  mode?: 'note' | 'messages';       // Default: 'messages'
  title?: string;                    // Custom title
  placeholder?: string;              // Editor placeholder
  maxHeight?: string;                // Max container height
  workflow?: string;                 // Workflow categorization
  enableRichText?: boolean;          // Rich text toggle
  allowMessageDeletion?: boolean;    // Delete permission
  className?: string;                // Custom styling
}
```

### Rich Text Editor Features

- **Bold/Italic**: Text formatting
- **Lists**: Bullet and numbered lists
- **Links**: URL embedding
- **Undo/Redo**: Action history
- **Color**: Text coloring (future enhancement)
- **Dynamic Sizing**: Auto-height adjustment

## Data Storage Strategy

### PostgreSQL (Metadata)
- Note references and relationships
- User associations
- Timestamps and versioning
- Access permissions

### MongoDB (Content)
- Rich HTML content
- Large text documents
- Content versioning
- Document metadata

### No Fallback Policy
The system fails explicitly when MongoDB is unavailable rather than falling back to PostgreSQL storage. This ensures data consistency and prevents mixed storage states.

## Security and Permissions

### Authentication
All messaging operations require valid user authentication through the session system.

### Authorization
- Users can only access their own notes
- Future: Role-based access for team messaging
- Private notes remain user-specific

### Data Validation
- Content length restrictions
- HTML sanitization
- Input validation on all endpoints

## Performance Considerations

### Optimization Features
- Debounced auto-save (prevents excessive API calls)
- Efficient query patterns with TanStack Query
- Lazy loading for large note collections
- Optimistic updates for better UX

### Caching Strategy
- Client-side caching of note data
- Invalidation on mutations
- Background refresh for stale data

## Development Status

### Completed Features
- ✅ Notes mode fully functional
- ✅ Rich text editing with TipTap
- ✅ Hybrid database storage
- ✅ Auto-save functionality
- ✅ User authentication integration

### In Development
- 🔄 Message mode implementation
- 🔄 File attachment support
- 🔄 Enhanced rich text features

### Future Enhancements
- 📋 Real-time messaging
- 📋 Team collaboration features
- 📋 Notification system
- 📋 Advanced formatting options