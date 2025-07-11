# DevDoc 07_01 - ValidationEngine30 REST API Reference

**Document ID:** 07_01  
**Title:** ValidationEngine30 REST API Reference  
**Version:** 2.0  
**Created:** July 9, 2025  
**Status:** Production Ready ✅  
**Last Updated:** July 9, 2025

## Overview

CrewPlots Pro provides a comprehensive REST API built on ValidationEngine30 architecture. The API uses a modern validation-first approach with centralized permission mapping, hybrid storage integration, and generic CRUD operations supporting all entity types.

## Core Architecture

### ValidationEngine30 Framework
- **5-Thread Validation**: Data Assembly → Schema Validation → Permission Validation → Business Rules → Database Transaction
- **Generic CRUD Interface**: Universal entity operations (user, location, competency, scheduleBlock, weekSchedule, shift, kbCategory, kbArticle)
- **Hybrid Storage Integration**: PostgreSQL metadata + MongoDB content + Redis caching
- **Centralized Permission Mapping**: Unified conversion of workflow permissions to validation permissions
- **Package Registry System**: External package registration enabling zero-engine-change extensions

### Authentication System
Session-based authentication with centralized middleware and atomic redirect patterns.

#### Authentication Status
```http
GET /api/validation/v3/auth
Authorization: Session Cookie
```

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "administrator"
  }
}
```

#### Login Endpoint
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "adminpass123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "administrator"
  },
  "redirectScript": "window.location.replace('/dashboard');"
}
```

## ValidationEngine30 Core API

### Generic CRUD Execution Endpoint
The primary endpoint for all entity operations using ValidationEngine30 validation framework.

```http
POST /api/validation/v3/execute
Content-Type: application/json
Authorization: Session Cookie

{
  "operation": "read|create|update|delete|list",
  "entityType": "user|location|competency|scheduleBlock|weekSchedule|shift|kbCategory|kbArticle|userManagement|userSingle|userList|userBulk|messaging|motivationNote",
  "data": {
    // Entity-specific data based on operation and entityType
  },
  "context": {
    // Optional additional context
  }
}
```

**Standard Response Structure:**
```json
{
  "packageId": "uuid-v4",
  "operation": "read",
  "entityType": "userManagement",
  "overall": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "metadata": {
      "validationTime": 52,
      "rulesApplied": ["authentication", "permissions", "businessRules"],
      "packageId": "uuid-v4",
      "usedAggregation": false,
      "engine": "ValidationEngine30"
    }
  },
  "threads": {
    "dataAssembly": {
      "success": true,
      "errors": [],
      "data": { /* assembled data */ }
    },
    "schema": {
      "success": true,
      "errors": [],
      "data": { /* validated data */ }
    },
    "permission": {
      "success": true,
      "errors": [],
      "permissions": ["user.read", "user.manage"]
    },
    "businessRules": {
      "success": true,
      "errors": [],
      "warnings": []
    },
    "transaction": {
      "success": true,
      "errors": [],
      "data": { /* operation result */ }
    }
  }
}
```

### Supported Entity Types

#### User Management Operations
**Entity Types:** `userManagement`, `userSingle`, `userList`, `userBulk`

**userManagement** - Administrative user operations:
```json
{
  "operation": "read",
  "entityType": "userManagement",
  "data": { "id": 1 }
}
```

**userSingle** - Individual user profile fetch:
```json
{
  "operation": "read",
  "entityType": "userSingle",
  "data": { "userId": 2 }
}
```

**userList** - User listing with filters:
```json
{
  "operation": "read",
  "entityType": "userList",
  "data": { "filters": { "role": "crew_member" } }
}
```

#### Location Operations
**Entity Type:** `location`

```json
{
  "operation": "create",
  "entityType": "location",
  "data": {
    "locationData": {
      "name": "Main Restaurant",
      "address": "123 Main St",
      "city": "Amsterdam",
      "country": "Netherlands"
    }
  }
}
```

#### Messaging Operations
**Entity Type:** `messaging`

**Create Message:**
```json
{
  "operation": "create",
  "entityType": "messaging",
  "data": {
    "content": "Message content",
    "workflow": "application",
    "messageType": "rich-text",
    "priority": "normal",
    "isPrivate": false
  }
}
```

**Read Messages:**
```json
{
  "operation": "read",
  "entityType": "messaging",
  "data": {
    "readOnlyMode": true,
    "userId": 2
  }
}
```

#### Scheduler Operations
**Entity Types:** `scheduleBlock`, `weekSchedule`, `shift`

**Create Schedule Block:**
```json
{
  "operation": "create",
  "entityType": "scheduleBlock",
  "data": {
    "name": "Summer Schedule",
    "description": "High season scheduling",
    "locationId": 1,
    "isActive": true
  }
}
```

**Create Shift:**
```json
{
  "operation": "create",
  "entityType": "shift",
  "data": {
    "weekScheduleId": 1,
    "title": "Morning Staff",
    "position": "Server",
    "startTime": "09:00",
    "endTime": "17:00",
    "maxSlots": 3,
    "competencyRequirements": [
      {
        "competencyId": 1,
        "priority": "required"
      }
    ]
  }
}
```

### Data Aggregation API

#### Aggregate Data Across Storage Systems
```http
POST /api/validation/v3/aggregate
Content-Type: application/json
Authorization: Session Cookie

{
  "entityType": "user",
  "entityId": 1,
  "requiredData": {
    "postgresql": ["user"],
    "mongodb": ["notes"],
    "redis": ["cache-keys"]
  },
  "compilationRules": {
    "enhance": true,
    "permissions": true,
    "metadata": true
  },
  "cacheStrategy": {
    "category": "user-profile",
    "ttl": 300,
    "connectionId": "user-1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "role": "administrator",
    "aggregatedNotes": [
      {
        "id": 1,
        "content": "User profile note",
        "workflow": "application"
      }
    ],
    "displayName": "Administrator",
    "permissions": ["user.read", "user.manage", "schedule.create"]
  },
  "metadata": {
    "aggregatedAt": "2025-07-09T21:30:00.000Z",
    "taskType": "user",
    "sources": ["postgresql", "mongodb", "redis"]
  }
}
```

### Cache Management

#### Clear Entity Cache
```http
DELETE /api/validation/v3/cache/:entityType/:entityId
Authorization: Session Cookie
```

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared for user:1"
}
```

### System Testing Endpoints

#### ValidationEngine30 System Test
```http
GET /api/validation/v3/test
Authorization: Session Cookie
```

**Response:**
```json
{
  "success": true,
  "message": "ValidationEngine 3.0 operational",
  "testResult": {
    "responseTime": 124,
    "aggregatedData": true,
    "cacheHit": false
  }
}
```

#### Direct Validation Test
```http
POST /api/validation/v3/validation30/test
Authorization: Session Cookie
```

#### Orchestration Test
```http
POST /api/validation/v3/orchestrator3/test
Authorization: Session Cookie
```

### Legacy Compatibility

#### Messaging System Integration
```http
POST /api/validation/v3/messaging/test
Authorization: Session Cookie
```

#### Motivation Notes
```http
POST /api/validation/v3/motivation-notes
Content-Type: application/json
Authorization: Session Cookie

{
  "userId": 2,
  "content": "Motivation note content"
}
```

```http
PUT /api/validation/v3/motivation-notes/:userId
Content-Type: application/json
Authorization: Session Cookie

{
  "content": "Updated motivation note"
}
```

### Public Endpoints

#### Public Registration Validation
```http
POST /api/validation/v3/public
Content-Type: application/json

{
  "operation": "validate",
  "entityType": "userRegistration",
  "data": {
    "username": "newuser",
    "email": "user@example.com",
    "password": "securepassword",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

## Permission System

### Role-Based Permissions
ValidationEngine30 uses a centralized permission mapping system converting workflow permissions to validation permissions.

**Administrator Role Permissions:**
- `schedule.create`, `schedule.read`, `schedule.update`, `schedule.delete`
- `location.access_all`, `location.access_assigned`
- `message.read`, `message.create`, `message.update`, `message.delete`
- `user.read`, `user.manage`, `user.create`

**Crew Member Role Permissions:**
- `schedule.read`, `location.access_assigned`
- `message.read`, `message.create`
- `user.read` (own profile only)

**Permission Validation Flow:**
1. User workflow permissions extracted from session
2. Centralized mapper converts to validation permissions
3. Entity package defines required permissions
4. ValidationEngine30 validates user permissions against requirements
5. Business rules apply additional access controls

### Error Handling

#### Common Error Responses

**Authentication Required:**
```json
{
  "overall": {
    "isValid": false,
    "errors": ["Authentication required for user management"],
    "warnings": []
  }
}
```

**Insufficient Permissions:**
```json
{
  "overall": {
    "isValid": false,
    "errors": ["Missing permissions: user.manage"],
    "warnings": []
  }
}
```

**Schema Validation Error:**
```json
{
  "overall": {
    "isValid": false,
    "errors": ["userId: Required"],
    "warnings": []
  }
}
```

**Business Rule Violation:**
```json
{
  "overall": {
    "isValid": false,
    "errors": ["Cannot delete your own account"],
    "warnings": ["Operation may affect system stability"]
  }
}
```

## Performance Metrics

### Response Time Benchmarks
- **Generic CRUD Operations**: 45-80ms
- **Data Aggregation**: 120-180ms
- **Messaging Operations**: 45-52ms
- **User Profile Fetch**: 50-70ms

### Cache Strategy
- **Redis Primary**: Session data, user profiles
- **PostgreSQL Fallback**: Persistent session storage
- **MongoDB**: Rich content storage with metadata references
- **Connection Pooling**: Optimized for Replit environment

## Implementation Notes

### Zero-Risk Deployment
ValidationEngine30 operates alongside legacy systems without conflicts. All endpoints use `/api/validation/v3/` prefix maintaining backward compatibility.

### Generic CRUD Advantages
- **Universal Operations**: Single endpoint handles all entity types
- **Consistent Validation**: All operations follow 5-thread validation
- **Centralized Permissions**: Unified permission model across entities
- **Hybrid Storage**: Automatic PostgreSQL/MongoDB/Redis integration

### External Package Registry
New entity types can be added through external package registration without modifying ValidationEngine30 core:

```typescript
// Register new entity package
packageRegistry30.newEntity = newEntityPackage;
```

### Migration from Legacy APIs
ValidationEngine30 provides migration paths for existing endpoints:

**Legacy Pattern:**
```javascript
// Old approach - direct storage calls
app.get('/api/users/:id', (req, res) => {
  const user = await storage.getUser(req.params.id);
  res.json(user);
});
```

**ValidationEngine30 Pattern:**
```javascript
// New approach - validation-first with consistent error handling
const result = await validationEngine30.validateAndExecute(
  'read',
  'userSingle',
  { userId: req.params.id },
  context
);
```

## Development Workflow

### Adding New Entity Types

1. **Create Validation Package:**
```typescript
// server/modules/newentity/validation/newEntityPackage.ts
export const newEntityPackage: VE30Package = {
  entityType: 'newEntity',
  validateSchema: (data, operation) => VE30PackageBuilder.validateSchema(data, operation, schema),
  getRequiredPermissions: (operation) => ['entity.read'],
  validateBusinessRules: (data, context) => VE30PackageBuilder.validateBusinessRules(data, context, rules),
  assemblePackage: (data, user, operation) => VE30PackageBuilder.assemblePackage(data, user, operation, assembly)
};
```

2. **Register Package:**
```typescript
// server/services/validation/packageRegistry30.ts
import { newEntityPackage } from '../../modules/newentity/validation/newEntityPackage';

export const packageRegistry30 = {
  // ... existing packages
  newEntity: newEntityPackage,
};
```

3. **Add Generic CRUD Support:**
```typescript
// server/services/validation/ValidationEngine30.ts
const entityMethods = {
  // ... existing entities
  newEntity: {
    create: (data: any) => storage.createNewEntity(data),
    read: (data: any) => storage.getNewEntity(data.id),
    update: (data: any) => storage.updateNewEntity(data.id, data),
    delete: (data: any) => storage.deleteNewEntity(data.id),
    list: () => storage.getNewEntities()
  }
};
```

### Testing New Packages

```bash
# Test new entity validation
curl -X POST http://localhost:5000/api/validation/v3/execute \
  -H "Content-Type: application/json" \
  -b session_cookies.txt \
  -d '{
    "operation": "read",
    "entityType": "newEntity",
    "data": { "id": 1 }
  }'
```

### Debug Logging

Enable comprehensive logging for troubleshooting:

```typescript
// Add to validation package for debugging
console.log('🔍 ENTITY VALIDATION:', JSON.stringify(data, null, 2));
console.log('🔐 PERMISSIONS:', permissions);
console.log('📋 BUSINESS RULES:', businessRules);
```

## Security Considerations

### Authentication Requirements
- All endpoints require valid session cookies
- Session validation through centralized middleware
- Permission checks at entity and operation level
- Business rule validation for access control

### Data Validation
- Schema validation prevents malformed requests
- Business rule validation enforces domain logic
- Permission validation ensures authorized access
- Input sanitization through Zod schemas

### Error Information Disclosure
- Detailed error messages only for authorized users
- Generic error responses for unauthorized access
- No sensitive data in error messages
- Comprehensive logging for security auditing

## Troubleshooting

### Common Issues

**Permission Denied Errors:**
1. Check user role has required permissions
2. Verify centralized permission mapping
3. Validate business rule conditions
4. Review session authentication status

**Schema Validation Failures:**
1. Confirm request data format matches entity schema
2. Check field naming conventions (userId vs id)
3. Verify required fields are present
4. Validate data types match schema

**Performance Issues:**
1. Monitor Redis cache hit rates
2. Check database connection pool utilization
3. Review hybrid storage query patterns
4. Optimize business rule validation logic

### Monitoring Endpoints

```http
GET /api/validation/v3/test
```
System health check with performance metrics

```http
GET /api/validation/v3/cache/stats
```
Cache utilization and hit rate statistics

## Architecture Evolution

### July 2025 Enhancements
- Generic CRUD interface implementation
- Centralized permission mapping system
- Hybrid storage transaction handlers
- External package registry architecture
- Zero-risk parallel deployment patterns

### Future Roadmap
- Dynamic package loading
- Real-time validation caching
- Multi-tenant validation isolation
- Advanced business rule engines
- GraphQL validation integration

This documentation reflects the current production state of ValidationEngine30 as of July 9, 2025, with all endpoints tested and operational in the CrewPlots Pro environment.

## Applicant Management

### Get All Applicants
```http
GET /api/applicants
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "status": "new",
    "resumeUrl": "/uploads/john_doe_resume.pdf",
    "notes": null,
    "extraMessage": "Available weekends",
    "locationId": null,
    "userId": null,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
]
```

### Get Single Applicant
```http
GET /api/applicants/:id
```

**Parameters:**
- `id` (integer) - Applicant ID

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "status": "new",
  "resumeUrl": "/uploads/john_doe_resume.pdf",
  "notes": null,
  "extraMessage": "Available weekends",
  "locationId": null,
  "userId": null,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

### Update Applicant
```http
PATCH /api/applicants/:id
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "short-listed",
  "reviewerNotes": "Good communication skills",
  "locationId": 1
}
```

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "status": "short-listed",
  "resumeUrl": "/uploads/john_doe_resume.pdf",
  "notes": "Good communication skills",
  "extraMessage": "Available weekends",
  "locationId": 1,
  "userId": null,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

### Delete Applicant
```http
DELETE /api/applicants/:id
```

**Response:**
```json
{
  "success": true
}
```

## Applicant Portal

*Note: Applicant portal functionality now uses ValidationEngine30 endpoints instead of dedicated routes.*

## Message Management

### Get Messages for Applicant
```http
GET /api/messages/:applicantId
```

**Parameters:**
- `applicantId` (integer) - Applicant ID

**Response:**
```json
[
  {
    "id": 1,
    "applicantId": 1,
    "userId": 1,
    "content": "Thank you for your application. We'll be in touch soon.",
    "messageType": "communication",
    "createdAt": "2025-01-15T14:30:00.000Z",
    "userName": "Admin User"
  }
]
```

### Create Message
```http
POST /api/messages
Content-Type: application/json
```

**Request Body:**
```json
{
  "applicantId": 1,
  "content": "Following up on the interview process.",
  "messageType": "communication"
}
```

**Response:**
```json
{
  "id": 2,
  "applicantId": 1,
  "userId": 1,
  "content": "Following up on the interview process.",
  "messageType": "communication",
  "createdAt": "2025-01-15T15:45:00.000Z"
}
```

## Location Management

### Get All Locations
```http
GET /api/locations
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Downtown Restaurant",
    "address": "123 Main Street, City, State 12345",
    "contactPerson": "Jane Manager",
    "contactEmail": "jane@restaurant.com",
    "contactPhone": "+1-555-0199",
    "ownerId": 1,
    "createdAt": "2025-01-01T08:00:00.000Z"
  }
]
```

### Get Single Location
```http
GET /api/locations/:id
```

**Response:**
```json
{
  "id": 1,
  "name": "Downtown Restaurant",
  "address": "123 Main Street, City, State 12345",
  "contactPerson": "Jane Manager",
  "contactEmail": "jane@restaurant.com",
  "contactPhone": "+1-555-0199",
  "ownerId": 1,
  "createdAt": "2025-01-01T08:00:00.000Z"
}
```

## File Upload

### Upload Document
```http
POST /api/upload
Content-Type: multipart/form-data
```

**Form Data:**
- `document` (file) - PDF, DOC, or DOCX file
- `documentName` (string) - Display name for the document

**Response:**
```json
{
  "success": true,
  "fileUrl": "/uploads/documents/unique_filename.pdf",
  "originalName": "resume.pdf"
}
```

## Error Responses

### Standard Error Format
All API errors follow this format:

```json
{
  "error": "Error message",
  "details": "Additional error details if available"
}
```

### Common HTTP Status Codes

#### 400 Bad Request
```json
{
  "error": "Invalid request data",
  "details": "Missing required field: email"
}
```

#### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

#### 404 Not Found
```json
{
  "error": "Resource not found",
  "details": "Applicant with ID 999 does not exist"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "Database connection failed"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. In production, consider implementing rate limiting for:
- Login attempts: 5 attempts per 15 minutes
- File uploads: 10 uploads per hour
- API requests: 1000 requests per hour per user

## Request/Response Headers

### Required Headers
```http
Content-Type: application/json  # For JSON requests
Content-Type: multipart/form-data  # For file uploads
```

### Security Headers (Automatically Set)
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## Authentication Flow Examples

### Admin Login and Applicant Management
```javascript
// 1. Login as admin
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'username=admin&password=adminpass123'
});

// 2. Get all applicants
const applicantsResponse = await fetch('/api/applicants');
const applicants = await applicantsResponse.json();

// 3. Update applicant status
const updateResponse = await fetch('/api/applicants/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'short-listed',
    reviewerNotes: 'Excellent candidate'
  })
});
```

### Applicant Portal Access
```javascript
// 1. Login as applicant
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'username=applicant123&password=userpass'
});

// 2. Get own profile (via ValidationEngine30)
const profileResponse = await fetch('/api/validation/v3/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ entityType: 'authProfile', operation: 'read' })
});
const profile = await profileResponse.json();
```

## Data Validation

### Applicant Status Values
Valid status values for applicant updates:
- `"new"`
- `"contacted"`
- `"interviewed"`
- `"hired"`
- `"rejected"`
- `"short-listed"`

### Message Type Values
Valid message types:
- `"note"` - Internal notes
- `"communication"` - Messages sent to applicant

### File Upload Restrictions
- **Maximum file size:** 10MB
- **Allowed file types:** PDF, DOC, DOCX
- **File naming:** Automatically sanitized and made unique

## Integration Examples

### Tanstack Query Integration
```typescript
// Fetch applicants with caching
const { data: applicants, isLoading, error } = useQuery({
  queryKey: ['/api/applicants'],
  staleTime: 30000
});

// Update applicant mutation
const updateApplicant = useMutation({
  mutationFn: (data: { id: number; status: string }) => 
    fetch(`/api/applicants/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
  }
});
```

### Error Handling Pattern
```typescript
const handleApiCall = async () => {
  try {
    const response = await fetch('/api/applicants');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Request failed');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    // Show user-friendly error message
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message
    });
  }
};
```

This API provides a robust foundation for the CrewPlotsManager frontend application with proper authentication, data validation, and error handling.