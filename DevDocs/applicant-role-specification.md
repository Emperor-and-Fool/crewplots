# Applicant Role Specification

## Overview
The applicant role represents users who are applying for positions within the hospitality organization. Unlike other user roles, applicants have additional workflow states, document requirements, and specific data fields that track their application journey.

## Role Definition
- **Role Value**: `"applicant"` (stored in users.role field)
- **Primary Purpose**: Job application and hiring workflow management
- **Access Level**: Limited to own profile and application data
- **Workflow**: Application → Review → Interview → Hiring Decision

## Applicant-Specific Data Fields

### Status Tracking
**Field**: `users.status`
**Type**: Enum
**Values**:
- `"new"` - Recently applied, not yet contacted
- `"contacted"` - Initial contact made
- `"interviewed"` - Interview completed
- `"hired"` - Accepted for position
- `"rejected"` - Application declined
- `"short-listed"` - Selected for next round

### Application Data
**Field**: `users.resumeUrl`
**Type**: Text (nullable)
**Purpose**: Path to uploaded resume/CV file

**Field**: `users.notes`
**Type**: Text (nullable) 
**Purpose**: Internal notes from hiring managers/HR

**Field**: `users.extraMessage`
**Type**: Text (nullable)
**Purpose**: Additional message provided by applicant during application

## Document Management

### Table: `applicant_documents`
**Purpose**: File attachments for applicant users

**Key Fields**:
- `userId` - References users.id (WHERE role = 'applicant')
- `documentName` - Human-readable document name
- `documentUrl` - File system path to uploaded document
- `fileType` - MIME type of uploaded file
- `uploadedAt` - Upload timestamp
- `verifiedAt` - When document was verified (nullable)
- `notes` - Internal notes about document

**Supported File Types**:
- PDF documents
- Image files (JPEG, PNG)
- Word documents (DOC, DOCX)

## Backend Components

### ApplicantProfileScanner
**Purpose**: Handles applicant profile data operations
**Location**: Backend service layer
**Key Functions**:
- Profile data retrieval for applicant users
- Status updates and workflow transitions
- Document management operations
- Application history tracking

### API Endpoints
**Base Route**: `/api/applicant-portal/`

**Key Endpoints**:
- `GET /my-profile` - Retrieve applicant's own profile data
- `PUT /message` - Update applicant's extra message
- `POST /documents` - Upload application documents
- `GET /documents` - List applicant's uploaded documents
- `DELETE /documents/:id` - Remove uploaded document

## Database Queries

### Get Applicant Profile
```sql
SELECT id, username, email, name, firstName, lastName, phoneNumber, 
       status, resumeUrl, notes, extraMessage, locationId, createdAt
FROM users 
WHERE id = ? AND role = 'applicant';
```

### Get Applicant with Documents
```sql
SELECT u.*, ad.id as doc_id, ad.documentName, ad.documentUrl, 
       ad.fileType, ad.uploadedAt, ad.verifiedAt
FROM users u
LEFT JOIN applicant_documents ad ON u.id = ad.userId
WHERE u.id = ? AND u.role = 'applicant';
```

### Update Applicant Status
```sql
UPDATE users 
SET status = ?, notes = ?
WHERE id = ? AND role = 'applicant';
```

## Access Control

### Authentication
- Standard user authentication via username/password
- Session-based authentication with role verification
- Access restricted to own profile data only

### Authorization Rules
- Can view/edit own profile information
- Can upload/manage own documents
- Cannot access other applicants' data
- Cannot modify status field (admin/manager only)
- Cannot access internal notes field

## Frontend Components

### Applicant Portal
**Route**: `/applicant-portal`
**Access**: Role-protected (applicant only)
**Features**:
- Profile information display
- Application status indicator
- Document upload interface
- Message/note input area

### Profile Context
- Manages applicant profile state
- Handles profile data fetching and caching
- Provides profile data to child components

## File Upload Specifications

### Upload Constraints
- Maximum file size: 10MB
- Allowed MIME types: PDF, JPEG, PNG, DOC, DOCX
- Files stored in `/uploads/documents/` directory
- Unique filename generation with timestamp prefix

### File Management
- Automatic cleanup on document deletion
- Verification workflow for uploaded documents
- File type validation and security checks

## Status Workflow

### Typical Application Flow
1. **New** → User creates application
2. **Contacted** → HR reaches out to applicant
3. **Interviewed** → Interview process completed
4. **Short-listed** → Selected for final consideration
5. **Hired** / **Rejected** → Final decision made

### Status Change Authority
- **Applicant**: Cannot change own status
- **Manager/Admin**: Full status modification rights
- **System**: Automatic status updates for certain triggers

## Integration Points

### Location Assignment
- Applicants can be assigned to specific locations
- Location determines which managers can view application
- Multi-location applicants supported via locationId field

### User Transition
- Hired applicants can be converted to crew_member role
- Profile data preserved during role transition
- Historical application data maintained

## Security Considerations

### Data Privacy
- Applicant data access restricted by role
- Document URLs not directly accessible without authentication
- Personal information protected in API responses

### File Security
- Upload directory outside web root
- File type validation prevents executable uploads
- Unique filenames prevent enumeration attacks