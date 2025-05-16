# Crew Plots Pro - Project Implementation Plan

## Project Overview
Crew Plots Pro is a hospitality team planning application designed for small bar-restaurants. The system provides comprehensive management tools for applicant tracking, staff scheduling, competency management, and cash handling.

## Team Structure
Our development approach will use specialized agents working in harmony:

```
      ┌──────────────────┐
      │   PM Agent       │
      │ (Task Orchestrator)
      └───┬─────────┬────┘
          │         │
      ┌───▼───┐ ┌───▼───┐
      │ FE    │ │ BE    │
      │ Agent │ │ Agent │
      └───┬───┘ └───┬───┘
          │         │
  ┌───────▼──────┐  │     ┌─────────┐
  │ DB Agent     │◄─┘     │ QA Agent│
  └───────┬──────┘        └─────────┘
          │
      ┌───▼───┐
      │DevOps │
      │Agent  │
      └───────┘
```

### Agent Responsibilities

**PM Agent**
- Coordinate development efforts
- Track overall progress
- Ensure consistency between components
- Manage requirements and priorities

**Frontend Agent**
- Implement React components and pages
- Handle authentication UI flows
- Build responsive designs using Tailwind/shadcn

**Backend Agent**
- Develop Express API endpoints
- Implement security measures
- Configure Redis session handling
- Manage file uploads

**Database Agent**
- Maintain Drizzle schema
- Optimize database performance
- Handle migrations

**DevOps Agent**
- Configure Docker environment
- Set up Redis properly
- Manage deployment pipeline

**QA Agent**
- Test functionality
- Verify security measures
- Document test cases

## Technology Stack

**Frontend**
- React + TypeScript
- Vite for building
- TanStack Query for data fetching
- Tailwind CSS + shadcn/ui for UI components

**Backend**
- Node.js + TypeScript
- Express server
- Passport.js for authentication
- Multer for file uploads
- Zod for validation

**Data Layer**
- PostgreSQL database
- Drizzle ORM
- Redis for session storage and caching

**Infrastructure**
- Docker Compose for containerization
- Future integration with Traefik

## Project Structure

```
/
├── client/                # React frontend
│   ├── Dockerfile
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (auth, etc.)
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utility functions
│   │   ├── pages/         # Page components
│   │   └── App.tsx        # Main application component
├── server/                # Express backend
│   ├── Dockerfile
│   ├── src/
│   │   ├── db.ts          # Database connection
│   │   ├── redis.ts       # Redis client setup
│   │   ├── session.ts     # Session configuration
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   └── storage.ts     # Data access layer
├── shared/                # Shared code between client and server
│   └── schema.ts          # Database schema definition
├── docker/                # Docker configuration
│   ├── redis/             # Redis configuration
│   └── postgres/          # PostgreSQL configuration
└── docker-compose.yml     # Service orchestration
```

## Implementation Phases

### Phase 1: Setup & Infrastructure
- Set up Docker Compose environment
- Configure Redis properly from the start
- Set up PostgreSQL with initial schema
- Establish basic application structure

### Phase 2: Core Authentication
- Implement Redis session storage
- Set up Passport authentication
- Create login/logout functionality
- Implement role-based authorization

### Phase 3: Core Features
- Staff management functionality
- Competency tracking system
- Location management
- User role management

### Phase 4: Scheduling & Operations
- Implement shift templates
- Create weekly scheduling system
- Set up staff availability tracking
- Add cash management features

### Phase 5: Applicant Portal
- Build applicant registration system
- Create document upload functionality
- Implement applicant tracking workflow
- Set up communication system

### Phase 6: Knowledge Base & Reporting
- Add knowledge article system
- Create reporting dashboard
- Implement analytics features