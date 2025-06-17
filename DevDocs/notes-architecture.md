# Notes Architecture

## Current Implementation

The notes system is fully operational as a personal documentation tool for users, specifically designed for applicants to write motivational content and personal notes.

### Working Features

#### Core Functionality
- **Rich Text Editing**: TipTap-based editor with formatting toolbar (bold, italic, lists, links)
- **Auto-Save**: Debounced automatic saving prevents data loss
- **Dynamic UI**: Editor height grows automatically with content
- **User-Scoped**: Each user can only access their own notes

#### Data Storage
- **Hybrid Architecture**: PostgreSQL stores metadata, MongoDB stores rich content
- **Explicit Failure**: No fallback to PostgreSQL when MongoDB unavailable
- **Content Compilation**: Service layer combines PostgreSQL references with MongoDB documents

### Technical Stack

#### Frontend Components
```
ApplicantPortal
└── MessagingSystem (mode="note")
    └── RichTextEditor (TipTap-based)
```

#### Backend Services
- **Notes API**: `/api/messaging/notes` (GET, POST, PUT, DELETE)
- **MessageService**: Handles hybrid data compilation
- **Authentication**: Session-based user verification

#### Database Schema
- **PostgreSQL**: `note_refs` table with metadata and MongoDB references
- **MongoDB**: Rich HTML content documents with ObjectId references

### Current Use Case
Primary use case is applicant motivational notes - private, personal content that users can format and edit with rich text features.

### API Endpoints
- `GET /api/messaging/notes` - Retrieve user's notes
- `POST /api/messaging/notes` - Create new note
- `PUT /api/messaging/notes/:id` - Update existing note  
- `DELETE /api/messaging/notes/:id` - Delete note

### Data Flow
1. User types in rich text editor
2. Content auto-saves with debouncing
3. PostgreSQL stores note metadata
4. MongoDB stores rich HTML content
5. Service layer compiles for display

### Security
- User authentication required for all operations
- Users can only access their own notes
- HTML content sanitization for XSS prevention

### Performance
- Debounced auto-save prevents excessive API calls
- TanStack Query provides caching and optimistic updates
- Efficient hybrid database queries