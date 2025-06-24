# CrewPlots Application

## Overview

CrewPlots is a comprehensive day production crew scheduling system built with a modern full-stack architecture. The application provides tools for scheduling crew applications, shifts, locations, and messaging workflows for production teams across industries like festivals, film production, television, and events. It features a hybrid database architecture using PostgreSQL for metadata, MongoDB for rich content storage, and Redis for caching and session management.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite with custom configuration
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Rich Text Editor**: TipTap editor for content creation
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript (ES modules)
- **Framework**: Express.js with session-based authentication
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy and bcrypt password hashing
- **Session Management**: Hybrid Redis-PostgreSQL session store
- **File Uploads**: Multer with local filesystem storage

### Database Architecture (Hybrid Multi-Database)
- **PostgreSQL**: Primary database for metadata, user accounts, and relational data
- **MongoDB**: Document storage for rich text content and file attachments
- **Redis**: Cache layer and session storage with on-demand service management

## Key Components

### Database Schema (PostgreSQL)
- **Users**: Authentication, roles, and permissions management
- **Locations**: Multi-location support with public IDs and settings
- **Crew & Competencies**: Day production crew management with skill tracking
- **Schedules**: Template-based scheduling system
- **Applications**: Crew application workflow management
- **Knowledge Base**: Categories and articles for documentation

### Hybrid Storage Services
- **Message Storage Service**: Coordinates PostgreSQL metadata with MongoDB content storage
- **Profile Fetcher Service**: Redis-cached user profile aggregation
- **Hybrid Cache Service**: Read-through/write-through cache with PostgreSQL persistence
- **Session Store**: Redis-first with PostgreSQL fallback for session management

### Replit Adapters
- **On-Demand MongoDB**: Custom service management for Replit container limitations
- **On-Demand Redis**: Lightweight Redis implementation designed for Replit environment
- **Custom Redis Server**: 21KB C implementation with RESP-2 protocol compliance

## Data Flow

### Content Management Pattern
1. **Metadata Storage**: PostgreSQL stores entity metadata and MongoDB ObjectId references
2. **Content Storage**: MongoDB stores rich text content, files, and complex documents
3. **Cache Layer**: Redis provides fast access to frequently requested data
4. **Explicit Failure**: System fails visibly when MongoDB unavailable (no silent fallbacks)

### Session Management Flow
1. **Redis Primary**: Fast session retrieval and storage
2. **PostgreSQL Fallback**: Persistent session storage when Redis unavailable
3. **Cache Repopulation**: Automatic Redis cache warming from PostgreSQL data

### File Upload Workflow
1. **Local Storage**: Files stored in filesystem with database metadata tracking
2. **GridFS Integration**: MongoDB GridFS for sensitive document storage
3. **Encryption Support**: Built-in encryption for compliance documents

## External Dependencies

### Core Production Dependencies
- **Database**: @neondatabase/serverless, drizzle-orm, pg
- **Authentication**: passport, bcryptjs, express-session
- **Validation**: zod, drizzle-zod
- **File Handling**: multer, mongodb GridFS
- **Caching**: ioredis with custom Redis implementation

### UI Dependencies
- **React Ecosystem**: @tanstack/react-query, react-hook-form
- **UI Components**: @radix-ui components, @tiptap editor
- **Styling**: tailwindcss, autoprefixer

### Development Tools
- **Build**: vite, esbuild, tsx
- **Types**: TypeScript with strict configuration
- **Database**: drizzle-kit for migrations

## Deployment Strategy

### Current Development (Replit)
- **Modules**: nodejs-20, web, postgresql-16
- **Packages**: jq, redis, mongodb via Nix
- **Ports**: Multiple port configuration for services
- **Auto-scaling**: Configured for production deployment

### Future Production Architecture
- **Landing Page**: Separate website with own domain and deployment
- **Customer Environments**: Individual docker-compose IaC deployments per customer
- **Isolation**: Each customer gets dedicated PostgreSQL, MongoDB, Redis instances
- **Scaling**: Per-customer resource allocation and management

### Service Management
- **Development**: On-demand service management for databases
- **PostgreSQL**: Native Replit service via DATABASE_URL (dev), dedicated per customer (prod)
- **MongoDB**: Custom proxy server for Replit compatibility (dev), dedicated per customer (prod)
- **Redis**: Custom 21KB implementation with RESP-2 protocol (dev), dedicated per customer (prod)
- **File Storage**: Local filesystem with configurable upload directory

## Changelog

```
Changelog:
- June 23, 2025. Initial setup
- June 23, 2025. Applied MongoDB WiredTiger cache limit workaround (0.25GB) to resolve vm.max_map_count container limitations
- June 23, 2025. Fixed auto-save race condition by restoring debug logging and proper timing from commit 420c4446 after bad merge b2a99e33
- June 23, 2025. Schema analysis revealed workflow permission system was added after June 22 but admin user role mismatch prevents settings access
- June 23, 2025. Updated admin user role from "manager" to "administrator" in database, enabling proper access to settings and email configuration
- June 23, 2025. Migrated database to current schema: created roles, permissions, role_permissions tables, added missing columns, updated role constraints
- June 23, 2025. Fixed session/role synchronization: cleared stale sessions, removed forceEnableAll references, disabled session role caching to ensure fresh role data
- June 24, 2025. RESOLVED: Passport session persistence issue - Fixed cookie security configuration (secure: production-only) enabling proper authentication flow in development
- June 24, 2025. RESOLVED: Administrator role implementation gaps - Added administrator to all route protections matching manager permissions, ensuring full dashboard access
- June 24, 2025. IMPLEMENTED: ForceEnableAll system with Docker-aware security - Development warnings for administrator bypass, browser-safe environment detection
- June 24, 2025. FIXED: Settings page routing - Connected /settings/email path, administrator-only access for technical email configuration
- June 24, 2025. IMPROVED: Account dropdown navigation - Added Administration section for administrator users, proper Settings/User Settings separation
- June 24, 2025. FIXED: Sidebar navigation consistency - Moved Administration section to blue sidebar, made "Crew Plots Pro" clickable to Dashboard
- June 24, 2025. REBRANDED: Removed hospitality constraints - Updated from hospitality management to "day production crew" management system supporting festivals, film, television, and events
- June 24, 2025. ADDED: Professional landing page - Created marketing front-page showcasing CrewPlots as universal day production platform with industry examples and feature highlights
- June 24, 2025. UPDATED: Landing page positioning - Emphasized hospitality/bar/restaurant origins while showing natural expansion to other day-production industries
- June 24, 2025. REBRANDED: Changed "management" to "scheduling" throughout platform to better reflect core functionality
- June 24, 2025. ORGANIZED: Created home-page/ directory structure for future landing page separation and docker-compose IaC customer deployment model
- June 24, 2025. FIXED: Page loading UX issue - Emergency logout component now appears only after 15 seconds instead of immediately on every page load
- June 24, 2025. FIXED: Toast notification duration - Reduced from 16.7 minutes to 4 seconds for better UX
- June 24, 2025. ADDED: Location-based navigation system - Blue sidebar now includes location selector with individual location filtering positioned under "Manage Locations"
- June 24, 2025. IMPLEMENTED: Database-based location filtering system - Dashboard shows location-specific data with WHERE locationId clauses, location headers, and "All Locations" unfiltered overview
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```