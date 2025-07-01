# Location Management Implementation Plan

## Overview
Create a comprehensive location management system with hybrid database architecture (PostgreSQL + MongoDB + Redis) for storing location profiles, logos, and rich welcome content.

## Database Architecture

### PostgreSQL Schema Changes
Enhanced `locations` table with:
- `public_id`: Unique identifier for public-facing URLs
- `logoUrl`: File path for uploaded logo images
- `welcomeContent`: MongoDB ObjectId reference for rich text content
- `status`: Location status (active, inactive, archived)
- `timezone`: Location-specific timezone
- `settings`: JSONB for location-specific configurations
- `updatedAt`: Track last modification

### MongoDB Collections

#### 1. Location Welcome Content Collection
```javascript
// Collection: "location_content"
{
  _id: ObjectId("..."),
  locationId: 1,                    // Reference to PostgreSQL locations.id
  contentType: "welcome",           // Type of content
  content: {
    html: "<p>Welcome to...</p>",   // Rich HTML content
    delta: {...},                   // Quill.js delta format
    plainText: "Welcome to..."      // Plain text version
  },
  metadata: {
    lastEditedBy: 1,               // User ID who last edited
    editHistory: [...],            // Optional: edit history
    version: 1                     // Content version
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. Location Assets Collection
```javascript
// Collection: "location_assets"
{
  _id: ObjectId("..."),
  locationId: 1,
  assetType: "logo",              // logo, banner, gallery
  fileName: "logo.png",
  filePath: "/uploads/locations/1/logo.png",
  mimeType: "image/png",
  fileSize: 45632,
  metadata: {
    width: 200,
    height: 100,
    uploadedBy: 1
  },
  createdAt: Date
}
```

## Implementation Steps

### 1. Database Migration
- Run `npm run db:push` to apply PostgreSQL schema changes
- No MongoDB migration needed (schema-less)

### 2. Storage Layer Updates (`server/storage.ts`)
Add location CRUD operations:
- `createLocation(locationData: InsertLocation)`
- `getLocation(id: number)`
- `getAllLocations()`
- `updateLocation(id: number, updates: Partial<InsertLocation>)`
- `deleteLocation(id: number)`
- `getLocationByPublicId(publicId: string)`

### 3. Hybrid Content Management
- Location welcome content stored in MongoDB
- Referenced via ObjectId in PostgreSQL `welcomeContent` field
- Redis caching for frequently accessed location data

### 4. API Routes (`server/routes.ts`)
```
GET    /api/locations              - List all locations
POST   /api/locations              - Create new location
GET    /api/locations/:id          - Get specific location
PATCH  /api/locations/:id          - Update location
DELETE /api/locations/:id          - Delete location
POST   /api/locations/:id/logo     - Upload location logo
GET    /api/locations/:id/content  - Get location welcome content
PATCH  /api/locations/:id/content  - Update welcome content
```

### 5. Frontend Components

#### Location Management Pages
- `/locations` - List all locations with cards
- `/locations/new` - Create new location form
- `/locations/:id` - Location detail/edit page
- `/locations/:id/content` - Rich text editor for welcome content

#### Location-Specific Dashboard
- URL pattern: `/location/:publicId/dashboard`
- Filter all data by location context
- Maintain same UI structure but location-scoped

### 6. Location Context System
- React Context Provider for current location
- Location switcher in navigation
- Persistent location selection in session storage

### 7. File Upload Integration
- Logo upload with image resizing
- File storage in `/uploads/locations/:id/`
- Integration with existing multer setup

## Key Features

### Location Profile Management
- Basic info: name, address, contact details
- Logo upload with preview
- Rich text welcome message editor
- Location-specific settings (timezone, preferences)
- Status management (active/inactive)

### Location-Scoped Dashboard
- Same dashboard structure as current system
- All data filtered by selected location
- Applicants, crew, shifts, schedules specific to location
- Location switcher for multi-location managers

### Hybrid Storage Benefits
- PostgreSQL: Structured location data, relationships
- MongoDB: Rich content, logos metadata, flexible assets
- Redis: Cached location data, session-based location context

## Technical Considerations

### Performance
- Redis caching for location lists and frequently accessed data
- Lazy loading of location content
- Image optimization for logos

### Security
- Location-based access control
- Public ID obfuscation instead of sequential IDs
- File upload validation and sanitization

### Scalability
- Horizontal scaling ready with hybrid architecture
- Location-specific data partitioning possible
- CDN-ready asset storage structure

## Next Steps Priority
1. Database schema updates and migration
2. Storage layer location CRUD operations
3. Basic location management API routes
4. Location list and creation UI
5. Location context integration
6. Logo upload functionality
7. Rich content editor integration
8. Location-scoped dashboard filtering

Would you like me to start implementing any specific part of this plan?