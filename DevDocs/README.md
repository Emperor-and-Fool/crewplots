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

## Technology Stack

### Frontend
- React.js with TypeScript
- Wouter (routing)
- Tailwind CSS + shadcn/ui
- Tanstack Query (data fetching)
- React Hook Form + Zod (forms)

### Backend
- Node.js + Express.js
- Passport.js (authentication)
- PostgreSQL + Drizzle ORM
- Session-based authentication

### Build & Development
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