# DevDoc 06_01 - Database Schema Foundation

**Document ID:** 06_01  
**Title:** Database Schema Foundation  
**Version:** 2.0  
**Updated:** June 26, 2025  
**Status:** Current ✅  
**Last Schema Migration:** June 25, 2025

## Overview

CrewPlots uses a hybrid database architecture with PostgreSQL as the primary relational database and MongoDB for rich content storage. This document describes the complete current schema state after all migrations through June 2025.

## PostgreSQL Schema (Primary Database)

### Core User Management

#### Users Table
Central user authentication and profile management with 6-role hierarchical system.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  public_id TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  name TEXT NOT NULL, -- Backward compatibility
  role TEXT NOT NULL CHECK (role IN (
    'administrator', 'owner', 'manager', 'app_manager', 
    'crew_chief', 'crew_manager', 'crew_member', 'applicant'
  )),
  location_id INTEGER REFERENCES locations(id),
  phone_number TEXT,
  status TEXT CHECK (status IN (
    'new', 'contacted', 'interviewed', 'hired', 'rejected', 'short-listed'
  )) DEFAULT 'new',
  resume_url TEXT,
  notes TEXT,
  workflow_permissions JSONB,
  blocked_permissions JSONB,
  unique_code TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Roles Table
Hierarchical role definitions supporting 6-level role system.

```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### Permissions Table
Granular permission definitions for workflow-based access control.

```sql
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### Role Permissions Junction Table
Many-to-many mapping between roles and permissions.

```sql
CREATE TABLE role_permissions (
  role_id INTEGER REFERENCES roles(id) NOT NULL,
  permission_id INTEGER REFERENCES permissions(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);
```

### Location Management

#### Locations Table
Multi-location support with public IDs and MongoDB content references.

```sql
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  public_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  welcome_content TEXT, -- MongoDB ObjectId reference
  status TEXT DEFAULT 'active',
  timezone TEXT DEFAULT 'Europe/Amsterdam',
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  owner_id INTEGER REFERENCES users(id)
);
```

### Crew Management System

#### User Locations Junction Table
Multi-location crew member assignments with role-per-location support.

```sql
CREATE TABLE user_locations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  location_id INTEGER REFERENCES locations(id) NOT NULL,
  role_at_location TEXT NOT NULL CHECK (role_at_location IN (
    'crew_member', 'crew_manager', 'floor_manager'
  )),
  position TEXT,
  department TEXT,
  hire_date TIMESTAMP,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  wanted_hours INTEGER,
  notes TEXT, -- Motivation and assignment notes
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, location_id)
);

-- Performance indexes
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_location_id ON user_locations(location_id);
CREATE INDEX idx_user_locations_active ON user_locations(location_id, status);
```

#### Competencies Table
Location-specific skill definitions for crew assessment.

```sql
CREATE TABLE competencies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location_id INTEGER REFERENCES locations(id) NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### Positions Table
Location-specific job positions defined by crew managers.

```sql
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location_id INTEGER REFERENCES locations(id) NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### Position Competencies Junction Table
Required competencies mapping for positions with minimum skill levels.

```sql
CREATE TABLE position_competencies (
  position_id INTEGER REFERENCES positions(id) NOT NULL,
  competency_id INTEGER REFERENCES competencies(id) NOT NULL,
  minimum_level INTEGER DEFAULT 1 NOT NULL, -- 0-5 scale
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (position_id, competency_id)
);
```

#### User Competencies Table
Individual crew member skill assessments with location context.

```sql
CREATE TABLE user_competencies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  competency_id INTEGER REFERENCES competencies(id) NOT NULL,
  level INTEGER NOT NULL, -- 0-5 scale
  assessed_by INTEGER REFERENCES users(id),
  assessed_at TIMESTAMP,
  location_id INTEGER REFERENCES locations(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, competency_id, location_id)
);

-- Performance indexes
CREATE INDEX idx_user_competencies_user_id ON user_competencies(user_id);
CREATE INDEX idx_user_competencies_competency_id ON user_competencies(competency_id);
CREATE INDEX idx_user_competencies_location_id ON user_competencies(location_id);
```

### Scheduling System

#### Schedule Templates Table
Reusable schedule templates per location.

```sql
CREATE TABLE schedule_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location_id INTEGER REFERENCES locations(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### Template Shifts Table
Template shift definitions for weekly patterns.

```sql
CREATE TABLE template_shifts (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES schedule_templates(id),
  day_of_week INTEGER, -- 0-6 for Sunday-Saturday
  start_time TEXT,
  end_time TEXT,
  position TEXT,
  notes TEXT
);
```

#### Weekly Schedules Table
Actual weekly schedule instances.

```sql
CREATE TABLE weekly_schedules (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES locations(id) NOT NULL,
  week_start_date TIMESTAMP NOT NULL,
  template_id INTEGER REFERENCES schedule_templates(id),
  is_published BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### Shifts Table
Individual shift assignments for crew members.

```sql
CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES weekly_schedules(id),
  user_id INTEGER REFERENCES users(id),
  location_id INTEGER REFERENCES locations(id),
  date TIMESTAMP,
  start_time TEXT,
  end_time TEXT,
  position TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Financial Management

#### Cash Counts Table
Daily cash management with opening/midday/closing counts.

```sql
CREATE TABLE cash_counts (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES locations(id) NOT NULL,
  count_type TEXT NOT NULL CHECK (count_type IN ('opening', 'midday', 'closing')),
  count_date TIMESTAMP NOT NULL,
  cash_amount DECIMAL(10,2) NOT NULL,
  card_amount DECIMAL(10,2) NOT NULL,
  float_amount DECIMAL(10,2) NOT NULL,
  expected_amount DECIMAL(10,2),
  discrepancy DECIMAL(10,2),
  notes TEXT,
  verified_by INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Knowledge Base System

#### KB Categories Table
Knowledge base organization by location.

```sql
CREATE TABLE kb_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location_id INTEGER REFERENCES locations(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### KB Articles Table
Knowledge base content with rich text support.

```sql
CREATE TABLE kb_articles (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES kb_categories(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images JSON,
  created_by INTEGER REFERENCES users(id) NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP
);
```

### Document Management

#### User Notes Table
User document references with upload tracking.

```sql
CREATE TABLE user_notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  note_name TEXT NOT NULL,
  note_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,
  verified_at TIMESTAMP,
  notes TEXT
);
```

#### Uploaded Files Table
File metadata tracking for all uploads.

```sql
CREATE TABLE uploaded_files (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### Document Attachments Table
Generic file attachment system for linking files to entities.

```sql
CREATE TABLE document_attachments (
  id SERIAL PRIMARY KEY,
  file_id INTEGER REFERENCES uploaded_files(id) NOT NULL,
  entity_type TEXT NOT NULL, -- 'user', 'location', 'shift', etc.
  entity_id INTEGER NOT NULL,
  attachment_type TEXT, -- 'resume', 'id_card', 'contract', etc.
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Session Management

#### Sessions Table
Hybrid Redis/PostgreSQL session storage with expiration.

```sql
CREATE TABLE sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  expires BIGINT NOT NULL,
  data TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Performance index for cleanup
CREATE INDEX idx_sessions_expires ON sessions(expires);
```

## MongoDB Schema (Rich Content Storage)

### Hybrid Messaging System

CrewPlots uses a hybrid messaging architecture where PostgreSQL stores metadata and MongoDB stores rich content.

#### Note References Collection (PostgreSQL Managed)
PostgreSQL manages note references that point to MongoDB content:

```javascript
// Managed via MessageStorageService
{
  id: Number, // PostgreSQL primary key
  userId: Number,
  receiverId: Number,
  workflow: String,
  contentId: String, // MongoDB ObjectId reference
  createdAt: Date,
  updatedAt: Date
}
```

#### Rich Content Collection (MongoDB)
MongoDB stores the actual note content with rich text formatting:

```javascript
// Collection: note_content
{
  _id: ObjectId,
  content: String, // Rich text content
  sender: {
    id: Number,
    name: String,
    username: String,
    role: String
  },
  metadata: {
    workflow: String,
    permissions: Array<String>,
    tags: Array<String>
  },
  createdAt: Date,
  updatedAt: Date
}
```

### GridFS File Storage

#### GridFS Files (fs.files)
Encrypted document storage for sensitive content.

```javascript
{
  _id: ObjectId,
  filename: String,
  contentType: String,
  length: Number,
  chunkSize: Number,
  uploadDate: Date,
  metadata: {
    userId: Number,
    documentType: String, // 'id_card', 'passport', 'resume', 'contract'
    encryptionKey: String,
    checksumSHA256: String,
    isEncrypted: Boolean,
    tags: Array<String>
  }
}
```

#### GridFS Chunks (fs.chunks)
Binary data storage chunks.

```javascript
{
  _id: ObjectId,
  files_id: ObjectId,
  n: Number,
  data: BinData
}
```

## Hybrid Storage Architecture

### PostgreSQL Responsibilities
- User authentication and authorization
- Role-based permission system
- Location and crew management
- Scheduling and shift assignments
- Financial data and cash counts
- Relational data integrity
- Session management
- File metadata tracking

### MongoDB Responsibilities
- Rich text message content
- Encrypted sensitive documents
- File binary storage via GridFS
- Content versioning
- Large text fields

### Cross-Database Integration
- **Reference Storage**: PostgreSQL stores MongoDB ObjectId references
- **Service Layer**: MessageStorageService coordinates between databases
- **Graceful Degradation**: System fails explicitly when MongoDB unavailable
- **Cache Layer**: Redis provides performance optimization
- **Transaction Safety**: Operations designed for eventual consistency

## Performance Indexes

### PostgreSQL Critical Indexes
```sql
-- User management
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_location_id ON users(location_id);

-- Crew management
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_location_id ON user_locations(location_id);
CREATE INDEX idx_user_locations_active ON user_locations(location_id, status);

-- Competencies
CREATE INDEX idx_user_competencies_user_id ON user_competencies(user_id);
CREATE INDEX idx_competencies_location_id ON competencies(location_id);

-- Sessions
CREATE INDEX idx_sessions_expires ON sessions(expires);

-- Scheduling
CREATE INDEX idx_shifts_user_id ON shifts(user_id);
CREATE INDEX idx_shifts_location_id ON shifts(location_id);
CREATE INDEX idx_shifts_date ON shifts(date);
```

### MongoDB Indexes
```javascript
// Rich content
db.note_content.createIndex({ "sender.id": 1 });
db.note_content.createIndex({ "metadata.workflow": 1 });
db.note_content.createIndex({ "createdAt": -1 });

// GridFS
db.fs.files.createIndex({ "metadata.userId": 1 });
db.fs.files.createIndex({ "metadata.documentType": 1 });
db.fs.files.createIndex({ "uploadDate": -1 });
```

## Security Architecture

### PostgreSQL Security
- **Password Security**: bcrypt hashing with salt rounds
- **Role-Based Access**: Hierarchical 6-role permission system
- **SQL Injection Prevention**: Prepared statements and Drizzle ORM
- **Session Security**: Secure cookie configuration with SameSite
- **Data Isolation**: Location-based data filtering

### MongoDB Security
- **Document Encryption**: AES-256 encryption for sensitive content
- **Unique Keys**: Per-document encryption keys
- **Integrity Verification**: SHA-256 checksums
- **Access Control**: MongoDB user authentication
- **Network Security**: Replit proxy for development environment

### Cross-Database Security
- **Reference Validation**: ObjectId format validation
- **Service Layer Authorization**: Permission checks at service level
- **Audit Logging**: Comprehensive operation tracking
- **Error Handling**: Secure error messages without data exposure

## Migration History

### Completed Migrations (June 2025)
1. **Role System Migration** - Added roles, permissions, role_permissions tables
2. **User Schema Enhancement** - Added firstName, lastName, phoneNumber fields
3. **Crew Management Migration** - Added user_locations, competencies, positions tables
4. **Legacy Staff Table Removal** - Migrated to user-centric architecture
5. **Messaging System Hybrid Architecture** - PostgreSQL metadata + MongoDB content
6. **Session Store Enhancement** - Hybrid Redis/PostgreSQL session management

### Current Schema State
- **Total Tables**: 20+ PostgreSQL tables
- **User Management**: Complete 6-role hierarchical system
- **Multi-Location Support**: Full crew assignment across locations
- **Hybrid Storage**: PostgreSQL + MongoDB + Redis integration
- **Performance Optimized**: Strategic indexing for production workloads

## Data Relationships

### Primary Relationships
- **Users ↔ Locations**: Many-to-many via user_locations
- **Users ↔ Competencies**: Many-to-many via user_competencies
- **Roles ↔ Permissions**: Many-to-many via role_permissions
- **Locations ↔ Schedules**: One-to-many relationship
- **Users ↔ Shifts**: Many-to-many via assignments

### Cross-Database Relationships
- **PostgreSQL → MongoDB**: ObjectId references in text fields
- **MongoDB → PostgreSQL**: User ID references in metadata
- **Redis ↔ PostgreSQL**: Session data synchronization
- **Service Layer**: Coordinates cross-database operations

## Development Considerations

### Schema Changes
- **Migration Strategy**: Use `npm run db:push` for development
- **Production Changes**: Carefully planned migrations with data preservation
- **Backward Compatibility**: Legacy fields maintained during transitions
- **Type Safety**: Drizzle ORM ensures compile-time schema validation

### Performance Optimization
- **Query Patterns**: Optimized for location-based filtering
- **Index Strategy**: Covering indexes for common query patterns
- **Cache Integration**: Redis layer for frequently accessed data
- **Connection Pooling**: Optimized database connection management

This schema foundation supports CrewPlots' complete feature set including multi-location crew management, role-based permissions, hybrid messaging, and comprehensive scheduling capabilities.