# User Entity Structure

## Overview
The application uses a unified user system where all users (regardless of role) are stored in a single `users` table. There is no separation between different user types at the database level - only the `role` field distinguishes between administrators, managers, crew members, and applicants.

## Core Users Table

### Table: `users`
**Purpose**: Single source of truth for all user data across all roles

#### Core User Fields
- `id` (serial, primary key)
- `username` (text, unique, not null)
- `password` (text, not null) 
- `email` (text, unique, not null)
- `name` (text, not null) - Full display name
- `firstName` (text, nullable) - Individual first name
- `lastName` (text, nullable) - Individual last name
- `role` (enum: "administrator", "manager", "crew_manager", "crew_member", "applicant")
- `phoneNumber` (text, nullable) - Format: +xx xxxxxxx
- `uniqueCode` (text, unique, nullable) - Unique reference code
- `locationId` (integer, nullable) - References locations.id
- `createdAt` (timestamp, not null)

#### Role-Specific Fields (All in Same Table)
When `role = "applicant"`, these additional fields are relevant:
- `status` (enum: "new", "contacted", "interviewed", "hired", "rejected", "short-listed", default: "new")
- `resumeUrl` (text, nullable) - Path to uploaded resume file
- `notes` (text, nullable) - Internal notes about the user/applicant
- `extraMessage` (text, nullable) - Additional message from applicant

**Important**: These fields exist for ALL users but are primarily used when the user has role="applicant".

## Related Tables

### Table: `applicant_documents`
**Purpose**: Document uploads for users with applicant role

- `id` (serial, primary key)
- `userId` (integer, not null) - References users.id (NOT applicants.id)
- `documentName` (text, not null)
- `documentUrl` (text, not null)
- `fileType` (text, nullable)
- `uploadedAt` (timestamp, default now)
- `verifiedAt` (timestamp, nullable)
- `notes` (text, nullable)

**Note**: This table references `users.id` directly. Documents are linked to users regardless of role.

### Table: `user_locations`
**Purpose**: Junction table for multi-location access (future expansion)

- `userId` (integer, not null) - References users.id
- `locationId` (integer, not null) - References locations.id  
- `roleId` (integer, not null) - References roles.id
- `createdAt` (timestamp, default now)

## Code References

### Schema Definition
File: `shared/schema.ts`
- Unified users table definition with all role-specific fields
- No separate applicants table
- Foreign key relationships point to users table

### Backend Storage
File: `server/storage.ts`
- Storage methods should work with users table directly
- Role-based filtering using `WHERE role = 'applicant'` instead of separate table joins
- Methods like `getApplicantByUserId()` should be replaced with `getUserById()` with role checking

### API Endpoints
File: `server/routes/applicant-portal.ts`
- Should query users table with role filtering
- Document operations reference users.id not applicants.id

## Migration Summary
- ✅ Database: Consolidated applicants data into users table
- ✅ Schema: Updated to reflect unified structure
- ⏳ Backend: Storage layer needs updating to use users table
- ⏳ Frontend: Components may need updating to work with user entities instead of applicant entities

## Key Principles
1. **Single Source of Truth**: All user data in one table
2. **Role-Based Logic**: Use role field for business logic, not separate tables
3. **Extensible**: Additional role-specific fields can be added to users table
4. **Consistent Relations**: All foreign keys point to users.id regardless of role
5. **No Duplication**: No separate tables for different user types

## Example Queries

### Get all applicants:
```sql
SELECT * FROM users WHERE role = 'applicant';
```

### Get applicant with documents:
```sql
SELECT u.*, ad.* 
FROM users u 
LEFT JOIN applicant_documents ad ON u.id = ad.userId 
WHERE u.role = 'applicant' AND u.id = ?;
```

### Update applicant status:
```sql
UPDATE users SET status = 'interviewed' WHERE id = ? AND role = 'applicant';
```