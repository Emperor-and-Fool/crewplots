# API Reference Documentation

## Overview
CrewPlotsManager provides a RESTful API built with Express.js and secured with session-based authentication. All endpoints require authentication unless specified otherwise.

## Authentication

### Session-Based Authentication
The API uses Passport.js with local strategy for authentication. Sessions are stored in PostgreSQL using connect-pg-simple.

#### Login Endpoint
```http
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin&password=adminpass123
```

**Response (Success):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "name": "Admin User",
    "role": "manager",
    "locationId": null,
    "phoneNumber": null,
    "uniqueCode": null,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### Logout Endpoint
```http
GET /api/auth/logout
```

#### Check Authentication Status
```http
GET /me
```

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "manager"
  }
}
```

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

### Get My Profile
```http
GET /api/applicant-portal/my-profile
```

**Authentication:** Requires applicant role

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "status": "short-listed",
  "resumeUrl": "/uploads/john_doe_resume.pdf",
  "notes": null,
  "extraMessage": "Available weekends",
  "locationId": 1,
  "userId": 2,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

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

// 2. Get own profile
const profileResponse = await fetch('/api/applicant-portal/my-profile');
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