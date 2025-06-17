# Messaging System Technical Architecture

## Current Implementation

The messaging system provides dual-mode functionality for user communications, with the notes mode fully operational and the messages mode prepared for future development.

## Component Architecture

### Frontend Components

#### MessagingSystem Component
- **Location**: `client/src/components/ui/messaging-system.tsx`
- **Mode Support**: Dual-mode operation (`note` | `messages`)
- **Current Status**: Notes mode fully functional, messages mode placeholder

#### Key Features
- **Rich Text Editor**: TipTap-based editor with formatting toolbar
- **Auto-Save**: Debounced automatic saving (prevents data loss)
- **Dynamic UI**: Editor height adjusts automatically to content
- **Form Management**: React Hook Form integration with validation

#### Component Props
```typescript
interface MessagingSystemProps {
  userId: number;
  mode?: 'note' | 'messages';
  title?: string;
  placeholder?: string;
  maxHeight?: string;
  workflow?: string;
  enableRichText?: boolean;
  allowMessageDeletion?: boolean;
  className?: string;
}
```

### Backend Architecture

#### API Routes
- **Base Path**: `/api/messaging/notes`
- **Methods**: GET, POST, PUT, DELETE
- **Authentication**: Session-based user verification
- **Authorization**: User-scoped access only

#### Service Layer
- **MessageService**: Handles hybrid database operations
- **Data Compilation**: Combines PostgreSQL metadata with MongoDB content
- **Error Handling**: Explicit failures when MongoDB unavailable

#### Database Integration
- **PostgreSQL**: Metadata storage in `note_refs` table
- **MongoDB**: Rich HTML content storage with ObjectId references
- **No Fallback**: System fails explicitly rather than degrading to single database

## Data Flow Architecture

### Note Creation Process
1. User types in rich text editor
2. Frontend validates content and triggers auto-save
3. API receives rich HTML content
4. PostgreSQL record created with metadata
5. MongoDB document created with content
6. PostgreSQL updated with MongoDB ObjectId reference

### Note Retrieval Process
1. API queries PostgreSQL for user's note metadata
2. MessageService extracts MongoDB document IDs
3. MongoDB content fetched using ObjectId references
4. Service layer compiles complete note objects
5. Frontend receives compiled data with rich content

### Auto-Save Mechanism
- **Debounced**: Prevents excessive API calls during typing
- **Optimistic Updates**: Immediate UI feedback
- **Error Recovery**: Graceful handling of save failures

## Technical Stack

### Frontend Technologies
- **React**: Component framework
- **TipTap**: Rich text editor
- **React Hook Form**: Form state management
- **TanStack Query**: Data fetching and caching
- **Tailwind CSS**: Styling and responsive design

### Backend Technologies
- **Express.js**: API server
- **Session Authentication**: User verification
- **PostgreSQL**: Relational metadata storage
- **MongoDB**: Document content storage
- **TypeScript**: Type safety throughout

## Security Implementation

### Authentication & Authorization
- Session-based authentication required for all operations
- Users can only access their own notes
- Role-based access control ready for future expansion

### Content Security
- HTML content sanitization to prevent XSS attacks
- Input validation on all API endpoints
- User-scoped database queries

### Data Protection
- Separate storage of metadata and content
- Referential integrity validation
- No fallback mechanisms to prevent data mixing

## Performance Optimizations

### Frontend Performance
- Debounced auto-save reduces API calls
- TanStack Query provides efficient caching
- Optimistic updates for immediate feedback
- Dynamic component rendering

### Backend Performance
- Efficient database query patterns
- Connection pooling for both databases
- Lazy compilation of content only when needed
- Indexed queries on user-specific data

### Caching Strategy
- Client-side caching of note data
- Query invalidation on mutations
- Background refresh for stale data

## Error Handling Strategy

### Explicit Failure Design
- No fallback to PostgreSQL when MongoDB unavailable
- Clear error messages for service unavailability
- Graceful degradation with user notification

### Frontend Error Handling
- Error boundaries for component failures
- Toast notifications for user feedback
- Retry mechanisms for transient failures

### Backend Error Handling
- Comprehensive error logging
- Structured error responses
- Service health monitoring

## Current Use Cases

### Primary: Applicant Motivational Notes
- Personal documentation for applicants
- Rich text formatting for emphasis and structure
- Private notes visible only to creator
- Auto-save prevents content loss

### Future: Team Messaging
- Inter-user communication (planned)
- Team collaboration features (planned)
- Notification system (planned)
- Document sharing (planned)

## Development Status

### Completed Features
- Notes mode fully operational
- Rich text editing with TipTap
- Hybrid database storage working
- Auto-save functionality active
- User authentication integrated

### Future Development
- Messages mode implementation
- File attachment support
- Real-time messaging capabilities
- Advanced rich text features
- Collaboration tools