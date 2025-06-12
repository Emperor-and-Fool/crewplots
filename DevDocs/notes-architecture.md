# Notes Architecture Documentation

## Overview
The ShiftPro application uses a hybrid database architecture for note/message management, combining PostgreSQL for metadata and MongoDB for content storage.

## Database Schema Design

### PostgreSQL Metadata Structure (`note_refs` table)

#### Essential Metadata
- `id` - Primary key (auto-increment integer)
- `userId` - Foreign key to users table (integer, required)
- `documentId` - MongoDB ObjectId reference (VARCHAR(24), required)
- `documentType` - Type classifier (VARCHAR, e.g., 'motivation', 'message', 'feedback')
- `title` - Optional short description/subject (VARCHAR, nullable)
- `status` - Document state (ENUM: 'draft', 'published', 'archived')
- `createdAt` - Timestamp when created (TIMESTAMP, auto-generated)
- `updatedAt` - Timestamp when last modified (TIMESTAMP, auto-updated)

#### Content Analytics
- `wordCount` - Number of words in content (INTEGER)
- `characterCount` - Character count excluding HTML tags (INTEGER)
- `htmlLength` - Raw HTML content length including markup (INTEGER)

#### Access Control
- `visibility` - Who can see the document (ENUM: 'private', 'admins', 'public')
- `isEditable` - Whether user can still modify content (BOOLEAN, default: true)
- `lastEditedAt` - When content was last changed (TIMESTAMP)

#### System Tracking
- `version` - Document version number for history tracking (INTEGER, default: 1)
- `tags` - JSON array for categorization and filtering (JSONB, nullable)
- `priority` - Importance level for admin review (INTEGER, default: 0)

### MongoDB Content Structure

MongoDB stores the actual rich text content with minimal metadata:

```javascript
{
  _id: ObjectId,
  content: String,        // HTML rich text content
  userId: Number,         // User reference for auth
  documentType: String,   // Type classifier
  createdAt: Date,
  updatedAt: Date,
  metadata: {
    wordCount: Number,
    characterCount: Number,
    htmlLength: Number
  }
}
```

## Architectural Principles

### Data Separation
- **PostgreSQL**: Metadata, relationships, search indexes, analytics
- **MongoDB**: Rich text content, large text blobs, flexible content structure
- **Bridge**: `documentId` field links PostgreSQL records to MongoDB documents

### Content Flow
1. User creates/edits content in TipTap rich text editor
2. Content saved to MongoDB with analytics calculated
3. Metadata extracted and stored in PostgreSQL `note_refs`
4. Both systems updated atomically or fail visibly

### Access Patterns
- **Listing/Filtering**: Query PostgreSQL metadata only
- **Content Display**: Fetch MongoDB document via `documentId`
- **Search**: Use PostgreSQL indexes on metadata fields
- **Analytics**: Aggregate from PostgreSQL analytics fields

## Implementation Notes

### No Fallback Policy
The system must fail visibly when MongoDB is unavailable rather than silently falling back to PostgreSQL-only operation. This ensures data integrity and prevents inconsistent states.

### Editability Control
The `isEditable` flag in access control allows administrators to lock documents while preserving content. This supports workflow states like "under review" or "finalized".

### Version Tracking
The `version` field enables future implementation of document history without requiring schema changes.