# Database Schema Documentation

## PostgreSQL Schema

### Users Table
Stores user account information and authentication data.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  username VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  role VARCHAR NOT NULL CHECK (role IN ('administrator', 'manager', 'crew_manager', 'crew_member', 'applicant')),
  profile_picture VARCHAR,
  phone VARCHAR,
  address TEXT,
  emergency_contact VARCHAR,
  location VARCHAR,
  department VARCHAR,
  position VARCHAR,
  extra_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Messages Table
Stores notes and conversation messages with workflow categorization.

```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  workflow VARCHAR CHECK (workflow IN ('onboarding', 'training', 'performance', 'general')),
  visible_to_roles TEXT[],
  document_reference TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## MongoDB Collections

### GridFS Files (fs.files)
Stores encrypted document metadata for sensitive content.

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
    documentType: String, // 'id_card', 'passport', 'resume', 'reference', 'contract', 'other'
    encryptionKey: String,
    checksumSHA256: String,
    isEncrypted: Boolean,
    tags: Array<String>
  }
}
```

### GridFS Chunks (fs.chunks)
Stores encrypted binary data chunks.

```javascript
{
  _id: ObjectId,
  files_id: ObjectId,
  n: Number,
  data: BinData
}
```

## Hybrid Storage Strategy

### PostgreSQL Responsibilities
- User authentication and profile data
- Message metadata and permissions
- Workflow categorization
- Role-based access control
- Timestamps and audit trails
- Foreign key relationships

### MongoDB Responsibilities
- Encrypted sensitive document content
- Large text content (note bodies)
- Binary file storage
- Document versioning
- Content integrity verification

### Reference Linking
- PostgreSQL `document_reference` field stores MongoDB document IDs
- Backend service layer handles cross-database queries
- Graceful degradation when MongoDB unavailable

## Indexes and Performance

### PostgreSQL Indexes
```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_workflow ON messages(workflow);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

### MongoDB Indexes
```javascript
db.fs.files.createIndex({ "metadata.userId": 1 });
db.fs.files.createIndex({ "metadata.documentType": 1 });
db.fs.files.createIndex({ "uploadDate": -1 });
```

## Data Relationships

### User → Messages (1:N)
- One user can create multiple messages/notes
- Foreign key: `messages.user_id → users.id`

### User → User (N:N via Messages)
- Users can send messages to other users
- Foreign key: `messages.receiver_id → users.id`

### Messages → Documents (1:1)
- Each message can reference one MongoDB document
- Reference: `messages.document_reference → MongoDB ObjectId`

## Security Considerations

### PostgreSQL Security
- No sensitive personal data stored
- Password hashing with bcrypt
- Role-based access control
- Prepared statements prevent SQL injection

### MongoDB Security
- All sensitive content encrypted with AES-256
- Unique encryption keys per document
- SHA-256 checksums for integrity verification
- GridFS chunking for large files

## Migration Strategy

### Schema Updates
- Use Drizzle ORM migrations for PostgreSQL
- MongoDB schema is flexible, no migrations needed
- Document structure versioning in metadata

### Data Consistency
- Referential integrity maintained in application layer
- Cleanup jobs for orphaned references
- Backup strategy covers both databases