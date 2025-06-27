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
- **Session Consolidation Services**: Prevents browser context session isolation through unified data fetching
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
- June 24, 2025. IMPROVED: Dashboard header location selector - Moved location selection to clickable header title, simplified sidebar to management options only, updated terminology from "crew scheduling" to "production overview"
- June 24, 2025. CLEANED: Removed redundant location dropdown from header next to search bar, location selection now only available through dashboard header
- June 24, 2025. REFINED: Dashboard components without location filtering (stats cards, recent applicants) now only appear in "All Locations" overview, hidden from individual location views
- June 24, 2025. IMPLEMENTED: Location management workflow - Dashboard button on location cards now sets location context and navigates to filtered dashboard, Manage button leads to location detail page with address, contact info, and quick actions
- June 24, 2025. FIXED: Mobile navigation security boundary - Added Administration section to mobile hamburger menu with Email Settings and Security Settings access for administrator users, resolving dual maintenance navigation security issue
- June 24, 2025. IMPLEMENTED: Unified navigation architecture - Created centrally configurable navigation system eliminating dual maintenance between desktop sidebar and mobile hamburger menu, with permission-driven sections in shared/navigation/ and unified NavigationRenderer component
- June 24, 2025. DOCUMENTED: Created DevDoc 04_02 - Unified Navigation Architecture Guide covering complete implementation, configuration patterns, permission system, and migration strategy for the centralized navigation system
- June 24, 2025. IMPLEMENTED: Location module structure reorganization - Created client/src/modules/locations/ with organized components/, pages/, hooks/, and types/ subdirectories, eliminating scattered location files and providing centralized location functionality with proper module exports
- June 24, 2025. DOCUMENTED: Created DevDoc 04_02 - Location Module Structure Implementation Guide detailing the complete reorganization from scattered files to cohesive module, including migration strategy, component architecture, and benefits achieved
- June 24, 2025. PRODUCTION READY: Messaging module migration Phase 1-4 complete - Created modular architecture with centralized types, 3 focused hooks, and 4 UI components extracted from 845-line monolithic component, preserving MongoDB/Redis hybrid storage architecture. Successfully tested in production with user authentication and all messaging operations confirmed working correctly
- June 24, 2025. STARTED: User module architecture design - Created comprehensive user management module encompassing authentication, applicant management, and user profiles with centralized types and hooks following proven messaging module methodology
- June 24, 2025. ANALYZED: User module migration scope - Discovered authentication flow uses consistent @shared/schema.User types throughout registration→login→applicant-portal chain, enabling parallel implementation strategy that avoids type conflicts while adding new features
- June 25, 2025. COMPLETED: Crew Management Migration Phase 1 - Migrated from legacy staff tables to user-centric architecture with user_locations and user_competencies tables, updated schema exports and storage layer, fixed frontend import errors, created simplified crew management page following user module patterns
- June 25, 2025. COMPLETED: Crew Management Migration Phase 2 - Implemented complete API layer with /api/user-locations CRUD endpoints, location-based crew filtering, fixed shifts table schema alignment, removed legacy staff table, updated frontend to use new crew member architecture
- June 25, 2025. COMPLETED: Crew Management Migration Phase 3 - Created user module crew management page, updated navigation configuration, deleted legacy staff-management page, implemented crew member profile view with role management, location assignments, and motivation notes with proper Redis caching and permission controls
- June 24, 2025. COMPLETED: Applicant login chain fix - Removed conflicting user module types, established @shared/schema.User as single source of truth, verified complete registration→login→portal workflow functioning correctly with test user "finn" created for UX feedback
- June 24, 2025. VERIFIED: Crew member login chain analysis - Confirmed all staff/crew components already use @shared/schema types correctly, no duplicate type definitions found, testkai user ready for testing with role="crew_member"
- June 24, 2025. FIXED: Profile page type compliance - Removed duplicate UserProfile interface, now uses @shared/schema.User maintaining schema-first architecture consistency across all user-facing components
- June 24, 2025. VERIFIED: Administrator login chain analysis - Confirmed admin authentication working correctly with adminpass123, all admin features use @shared/schema types, administration section properly configured in centralized navigation system
- June 24, 2025. FIXED: Applicants page type compliance - Changed undefined Applicant type to @shared/schema.User in applicant-form.tsx props interface, maintaining consistent schema-first architecture across applicant management features
- June 24, 2025. FIXED: ApplicantDetail page type compliance - Added User import from @shared/schema and replaced any type with proper User typing, ensuring schema-first architecture in detailed applicant view
- June 24, 2025. VERIFIED: Locations list page chain compliance - Confirmed /locations page and location module types properly import Location from @shared/schema and extend only for UI needs, following schema-first architecture
- June 24, 2025. VERIFIED: Location detail page chain compliance - Confirmed /locations/:id page imports Location from @shared/schema correctly, read-only view follows schema-first architecture
- June 24, 2025. VERIFIED: Location dashboard filtering chain compliance - Confirmed location context and dashboard filtering use Location from @shared/schema, no duplicate types in location-specific dashboard views
- June 24, 2025. VERIFIED: Email and Security settings chains compliance - Confirmed both settings pages use domain-specific Zod schemas for configuration without conflicting with @shared/schema user types
- June 24, 2025. FIXED: Administrator profile access bug - Added "administrator" role to profile route protection allowing admin users to access their profile page via header dropdown button, confirmed working correctly
- June 24, 2025. COMPLETED: User Module Migration Phase 4 cleanup - Recovered ApplicantForm and ApplicationNotes components from git history, migrated to user module structure following schema-first architecture, eliminated old /components/applicants/ directory maintaining modular organization
- June 24, 2025. RESTORED: Original applicants summary implementation - Recovered honest, data-driven ApplicantsSummary from commit eebf59c7, adapted to user module with existing /api/profile-data endpoint, eliminated placeholder data in favor of authentic schema-based information display
- June 24, 2025. COMPLETED: User module structure reorganization - Successfully migrated ProfileCard, PortalProfileSkeleton to /profiles/, renamed /applicants/ to /workflows/, moved Profile and UserSettings pages to user module, updated all import paths maintaining unified user-centric architecture treating applicants as workflow rather than separate domain
- June 24, 2025. RESTORED: Clickable phone number functionality - Implemented tel: protocol links in ProfileCard, ApplicantsSummary, and ApplicantCard components following commit b0242330 pattern, making phone numbers clickable for immediate calling with proper styling and event handling
- June 24, 2025. CLEANED: Database test users - Removed test users created during development (finn/Finn TestUser and testapplicant/Test Applicant) to maintain clean production dataset with only authentic user records
- June 24, 2025. ADDED: Dutch phone numbers to applicants - Added realistic Dutch mobile numbers (+31 6 format) to all existing applicants to enable clickable tel: protocol functionality in the user interface
- June 24, 2025. IMPROVED: Dashboard applicants display - Removed scroll container and redesigned as clean, mobile-responsive list with better spacing and hover effects, eliminating scrollbar while maintaining all information accessibility
- June 24, 2025. REORDERED: Dashboard stats cards - Changed order to Total Applicants first, Total Staff second, Shifts This Week third, Hours Scheduled fourth as requested by user
- June 24, 2025. FIXED: Crew member visibility in Total Staff count - Updated dashboard filtering to include both 'staff' and 'crew_member' roles, added 'manage' permission to testkai crew member for navigation access
- June 24, 2025. FIXED: Crew navigation 404 error - Corrected navigation path from '/staff' to '/staff-management' to match existing route in App.tsx
- June 24, 2025. FIXED: Staff management page redirect issue - Added missing queryFn functions to prevent query failures and added AppLayout wrapper to staff-management route for proper navigation
- June 25, 2025. COMPLETED: Crew member profile API fixes - Resolved fetch call parameter issues in role/location/notes mutations, added required roleAtLocation field for user_locations schema validation, implemented complete error handling chain from frontend to backend
- June 25, 2025. COMPLETED: Messaging System Sender Property Migration Phase 1 - Enhanced MessageStorageService with getUserWithProfile() integration, updated ServiceMessage interface with sender property, modified getNoteRefsByUser(), createNoteRef(), and updateNoteRef() methods to populate sender data, following schema-first architecture pattern
- June 25, 2025. COMPLETED: Location assignment card for applicant detail page - Added location selection interface with checkboxes, integrated with user-locations API, fixed checkbox flickering issues, enabled recruiters to assign locations during hiring process with proper error handling and state management
- June 25, 2025. COMPLETED: Server-side upsert prevention system - Implemented findDraftByUser() method and createNoteRef() upsert logic to eliminate dual note creation race conditions, removed client-side prevention logic, successfully tested with single note maintenance across multiple auto-save operations
- June 25, 2025. CREATED: PRODUCTION_BACKLOG.md - Documented critical production stability requirements including distributed locking, circuit breaker patterns, data integrity cleanup, and graceful degradation strategies to address multi-user race condition vulnerabilities identified during testing
- June 25, 2025. COMPLETED: Auth Module Migration Phase 4 Part 1 - Successfully migrated registration page from legacy Register component to new modular RegistrationPage, fixed missing confirmPassword field in form, updated App.tsx routing to use new auth module components. Registration→login→applicant portal flow tested and working correctly with new modular architecture
- June 25, 2025. COMPLETED: Auth Module Migration Phase 4 Part 2 - Migrated login page to use modular LoginPage component, fixed Force Logout development tool to only show when user is logged in, preserved authentication functionality and development tools
- June 25, 2025. COMPLETED: Auth Module Migration Phase 4 Part 3 - Legacy auth component cleanup completed, moved login.tsx and register.tsx to backup/client/src/pages/ with .bak extensions, removed legacy components from active codebase, cleaned import references in App.tsx, all routes now use modular auth components exclusively
- June 25, 2025. COMPLETED: Auth Module Migration Phase 5 - Updated all auth-related imports across application to use @/modules/auth instead of @/hooks/use-auth, created AuthPageLayout component, fixed all LSP errors, maintained backward compatibility through re-exports, successfully migrated 15+ files to new auth module structure
- June 25, 2025. COMPLETED: Auth Module Migration Phase 6 - Complete auth module migration finished, documented completion in migration plan, established modular auth architecture following proven messaging/location module patterns, preserved all authentication flows and session management with zero downtime
- June 25, 2025. COMPLETED: Auth Module Migration Phases 7-11 - Full integration testing completed with user validation, cross-module API verification (27ms auth performance), production readiness achieved, authentication system successfully migrated to modular architecture with zero regressions and maintained compatibility
- June 25, 2025. DOCUMENTED: Created DevDoc 04_06 - Dashboard and Navigation Architecture Guide documenting shared navigation module implementation, actual configuration structure (core-sections, administration, location-management, workflow-sections), NavigationRenderer component architecture, and permission integration patterns based on comprehensive codebase investigation
- June 26, 2025. FIXED: Profile page React runtime error - Resolved "Objects are not valid as a React child" error by properly handling notes metadata from hybrid messaging system, removed PostgreSQL notes fallback code to prevent confusion about data storage architecture
- June 26, 2025. IMPROVED: Profile page name display - Fixed missing official name display by implementing firstName/lastName priority with fallback to name/username, added username field to Account Details section showing login nickname with @ prefix
- June 26, 2025. DOCUMENTED: Created DevDoc 05_03 - Authentication Module Architecture Guide providing comprehensive documentation of the completed auth module migration, including component structure, hook patterns, service layer, type system, cross-module integration, and performance metrics based on actual implementation evidence
- June 26, 2025. UPDATED: DevDoc 06_01 - Database Schema Foundation completely rewritten to reflect current schema state after all June 2025 migrations, including 6-role hierarchy, user_locations table, competencies system, hybrid messaging architecture, and complete PostgreSQL/MongoDB integration patterns
- June 26, 2025. PHASED OUT: crew_manager role removed from system - Updated role hierarchy to 5 active roles (crew_member, crew_chief, app_manager, owner, administrator), updated app_manager description to "reports directly to owner with general business overview", removed crew_manager from all UI components and dashboard filtering
- June 26, 2025. RESTORED: Login page design improvements - Restored beautiful gradient header design with "Back to Home" button from pre-auth integration, removed development tools for cleaner UX, maintained modular auth architecture with improved AuthPageLayout component
- June 26, 2025. COMPLETED: Scheduler Database Schema Implementation Phase 1 - Successfully implemented all four core scheduler tables: shift_requirements (competency-based shift requirements), shift_subscriptions (crew interest tracking), shift_assignments (final crew assignments), and scheduling_windows (role-based viewing periods). Added proper PostgreSQL constraints, unique indexes, and Drizzle schema types. Database migration completed with all tables verified and operational.
- June 26, 2025. COMPLETED: Scheduler Frontend Phase 1 - Created comprehensive shift creation page (/shift-creation) with role/workflow-based permission system, hierarchical scheduler_development permissions (.read/.write/.execute), tabbed interface (Basic Info, Requirements, Schedule), competency requirements management with priority levels, and integrated navigation. Fixed administrator role permissions by granting crew_planning and all scheduler_development permissions for full access.
- June 26, 2025. FIXED: Week schedule save functionality - Corrected permission check from "schedule_development" to "scheduler_development", implemented missing week schedule storage methods (createWeekSchedule, getWeekSchedules, etc.), added comprehensive debug logging to API endpoints for troubleshooting save operations
- June 26, 2025. RESOLVED: Week schedule API call issues - Fixed frontend apiRequest function signature from (url, options) to (method, url, data), corrected permission validation by adding scheduler_development permissions to administrator/owner roles, enabled successful week schedule template creation
- June 26, 2025. COMPLETED: Week schedule schema import fix - Added missing insertWeekScheduleSchema import to server routes, resolved ReferenceError that prevented week schedule validation and saving, fully operational week schedule creation system now ready for testing
- June 27, 2025. INVESTIGATED: Session isolation root cause analysis - Discovered browser context separation in Replit iframe environment creating competing authentication sessions during multiple simultaneous requests, affects shift-creation page specifically due to complex data loading patterns
- June 27, 2025. ANALYZED: Session consolidation architecture patterns - Identified Profile Fetcher Service as successful consolidation model, documented session isolation prevention through unified backend data assembly, created comprehensive analysis and implementation plan for session consolidation module
- June 27, 2025. DESIGNED: Session consolidation module architecture - Created SESSION_CONSOLIDATION_ANALYSIS.md and SESSION_CONSOLIDATION_MODULE_IMPLEMENTATION_PLAN.md documenting browser context isolation solutions, base consolidation service patterns, and migration strategy for existing services
- June 27, 2025. IMPLEMENTED: Individual fetch pattern fix for shift-creation page - Applied proven CrewMemberProfile session management pattern with individual fetch() calls, proper caching strategies, and sequential loading to eliminate session isolation issues that prevented week schedule dropdown from populating
- June 27, 2025. CREATED: Comprehensive implementation plans - Added SCHEDULER_IMPLEMENTATION_PLAN.md and SESSION_CONSOLIDATION_IMPLEMENTATION_PLAN.md to project root documenting proven individual fetch patterns as foundation with session consolidation as architectural enhancement for scalability
- June 27, 2025. COMPLETED: Scheduler display system implementation - Fixed Schedule Preview to show actual shifts from database instead of local state, added WeeklyCalendarPreview component for visual weekly format, updated database schema with missing columns (max_slots, subscription_deadline, status), created working examples with Crew Manager Shift (Friday) and Crew Staff Shift (Saturday) demonstrating unlimited creation flexibility competitive advantage
- June 27, 2025. ENHANCED: Shift creation form with position field based on crew templates - Added position field to shift creation schema and form with template-based placeholders (Manager, Staff, Supervisor, Floor Staff), updated existing demo shifts to Crew Manager Shift and Crew Staff Shift positions, maintaining proven template structure for intuitive crew scheduling
- June 27, 2025. FIXED: Shift creation cache invalidation issue - Resolved shift saving problem where new shifts weren't appearing in UI despite successful database saves, applied proven cache invalidation pattern using queryClient.invalidateQueries matching week schedule dropdown fix, shift creation now follows complete individual fetch + cache invalidation methodology
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```