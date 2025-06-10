# CrewPlotsManager - Technical Documentation

## Overview
CrewPlotsManager is a comprehensive hospitality management system with role-based authentication designed for restaurant and bar operations. The application provides an applicant portal for job applications, staff management, scheduling, cash management, knowledge base functionality, and multi-location support.

## Documentation Structure

### Core Documentation
- **[Architecture Overview](./architecture.md)** - System architecture, technology stack, and design patterns
- **[Database Schema](./database-schema.md)** - Complete database structure, relationships, and data models
- **[API Reference](./api-reference.md)** - All API endpoints, request/response formats, and authentication
- **[Component Library](./components.md)** - UI components, custom components, and usage patterns

### Feature Documentation
- **[Authentication System](./authentication.md)** - Role-based auth, session management, and security
- **[Applicant Management](./applicant-management.md)** - Complete applicant workflow and features
- **[Messaging System](./messaging-system.md)** - Real-time messaging functionality
- **[File Upload System](./file-uploads.md)** - Document handling and storage

### Development Guides
- **[Development Setup](./development-setup.md)** - Environment setup and development workflow
- **[Deployment Guide](./deployment.md)** - Production deployment instructions
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

## System Architecture

### Current Architecture Overview

**Frontend Layer (React + TypeScript)**
- Single-page application with component-based architecture
- Wouter for client-side routing
- Tanstack Query for server state management and caching
- Tailwind CSS + shadcn/ui for consistent styling
- React Hook Form + Zod for form validation

**API Layer (Express.js)**
- RESTful API with modular route organization
- Service layer pattern for business logic separation
- Route structure:
  - `/api/messages/notes/*` - Notes-specific endpoints
  - `/api/messages/conversations/*` - Chat/conversation endpoints
  - Authentication middleware for protected routes

**Service Layer**
- `MessagingService` - Centralized business logic for messaging operations
- Clean separation between route handlers and database operations
- Role-based permission filtering at service level

**Data Layer (PostgreSQL + Drizzle ORM)**
- Relational database with type-safe ORM
- Schema-first approach with Zod validation
- Session-based authentication with PostgreSQL session store

**File Structure:**
```
├── client/src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Route-level components
│   └── hooks/         # Custom React hooks
├── server/
│   ├── routes/        # API route handlers (thin controllers)
│   ├── services/      # Business logic layer
│   ├── middleware/    # Authentication & validation
│   └── db.ts         # Database connection
├── shared/
│   └── schema.ts     # Shared type definitions
```

### Technology Stack

**Frontend**
- React.js with TypeScript
- Wouter (routing)
- Tailwind CSS + shadcn/ui
- Tanstack Query (data fetching)
- React Hook Form + Zod (forms)

**Backend**
- Node.js + Express.js
- Passport.js (authentication)
- PostgreSQL + Drizzle ORM
- Session-based authentication

**Build & Development**
- Vite (build tool)
- TypeScript (type safety)
- ESBuild (bundling)

## Quick Start
1. Install dependencies: `npm install`
2. Set up PostgreSQL database
3. Configure environment variables
4. Run migrations: `npm run db:push`
5. Start development server: `npm run dev`

## Key Features
- Role-based authentication (administrator, manager, crew_manager, crew_member, applicant)
- Applicant management with 4-stage workflow
- Real-time messaging system
- Document upload and management
- Multi-location support
- Responsive design with dark mode support

## Admin Credentials
- Username: `admin`
- Password: `adminpass123`
- Role: `manager`

---

### Future Implementation Approach

**Scalable Architecture for Privacy-Sensitive Content**

For handling sensitive documents (IDs, legal documents) and multimedia content, the system is designed to evolve toward a hybrid storage architecture:

**Phase 1: Current Setup** ✓
- PostgreSQL for all data and metadata
- Single database architecture with role-based access control

**Phase 2: Document Storage Enhancement**
- MongoDB integration for encrypted document storage
- PostgreSQL retains metadata and permission control
- Reference-based linking between databases

**Phase 3: Search Infrastructure**
- Elasticsearch layer for unified search across all content types
- Search index combining metadata (PostgreSQL) and content (MongoDB)
- Advanced text extraction and document classification capabilities

**Target Architecture:**
```
Frontend → API Layer → Service Layer → {
                                         PostgreSQL (metadata, permissions)
                                         MongoDB (encrypted documents, media)
                                         Elasticsearch (search index)
                                       }
```

This approach ensures scalability for sensitive data handling while maintaining current functionality and security requirements.