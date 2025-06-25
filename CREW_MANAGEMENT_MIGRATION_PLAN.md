# Staff Management Migration Plan

## Overview

This plan outlines the complete migration of staff management functionality to align with CrewPlots' schema-first architecture, user module structure, and unified navigation system. The current staff management page is non-compliant and requires complete rebuilding rather than fixing.

## Current State Analysis

### Database Schema Issues
- **Staff Table Mismatch**: Current `staff` table has separate fields (`user_id`, `first_name`, `last_name`) instead of following user-centric approach
- **Schema Inconsistency**: Staff should be users with role="crew_member" or role="crew_manager", not separate entities
- **Single Location Limitation**: Current `users.location_id` only supports single location assignment, but crew members need multi-location capability
- **Missing Junction Table**: Need `user_locations` matrix structure for crew member assignment to multiple locations
- **Missing Competencies**: No competencies table exists but code references competency system

### Architecture Violations
- **Wrong Directory**: Located in `/pages/` instead of `/modules/users/`
- **Duplicate Layout**: Creates own sidebar/navigation instead of using AppLayout
- **Non-Schema-First**: Uses separate Staff types instead of @shared/schema.User
- **Legacy API**: Direct fetch calls instead of established query patterns

### User Module Compliance
- **Not Integrated**: Should be part of user module following applicant management pattern
- **Missing Navigation**: Not included in unified navigation system
- **Role Confusion**: Treats staff as separate entity instead of user workflow

## Migration Strategy

### Phase 1: Database Schema & Types (Foundation)
**Goal**: Establish proper database foundation for staff management

#### 1.1 Schema Analysis & Design
- [ ] Audit current `staff` table structure vs schema.ts definitions
- [ ] Design user-centric staff management (users with role="staff"/"crew_member")
- [ ] Define competencies system requirements (if needed)
- [ ] Plan migration strategy for existing staff data

#### 1.2 Database Schema Updates
- [x] Create `user_locations` junction table for multi-location crew assignment
- [x] Update `shared/schema.ts` with crew member extensions to User type  
- [x] Create user_competencies junction table (replacing staff_competencies)
- [x] Update shifts table to use userId instead of staffId
- [x] Remove staff and staffCompetencies from schema exports
- [x] Update storage interface to use crew member methods instead of staff
- [ ] Implement crew member storage methods in DatabaseStorage
- [ ] Create competencies table (if required for functionality) 
- [ ] Design migration script for existing staff → users + user_locations conversion
- [ ] Remove redundant staff table after successful migration

#### 1.3 Storage Layer Updates
- [ ] Update storage interfaces to use User-based crew member queries
- [ ] Add multi-location query methods (getCrewMembersByLocation, getUserLocations)
- [ ] Implement junction table queries for user-location assignments
- [ ] Update role-based filtering for crew member workflows
- [ ] Add caching for location-filtered crew member queries
- [ ] Test storage layer with new schema and multi-location support

### Phase 2: User Module Integration (Architecture)
**Goal**: Integrate staff management into user module structure

#### 2.1 Module Structure Creation
```
/client/src/modules/users/
├── components/
│   ├── staff/
│   │   ├── StaffList.tsx
│   │   ├── StaffCard.tsx
│   │   ├── StaffForm.tsx
│   │   └── StaffActions.tsx
│   └── workflows/ (existing)
├── hooks/
│   ├── use-staff-data.ts
│   └── use-staff-actions.ts
├── pages/
│   ├── StaffManagement.tsx
│   └── (existing user pages)
└── types/
    └── staff.ts (extends @shared/schema.User)
```

#### 2.2 Component Development
- [ ] Create StaffList component using schema-first approach
- [ ] Build StaffCard with user data integration
- [ ] Develop StaffForm extending user creation/editing
- [ ] Implement StaffActions with proper permissions

#### 2.3 Hooks & Data Layer
- [ ] Create use-staff-data hook with role-based filtering
- [ ] Build use-staff-actions for CRUD operations
- [ ] Integrate with existing user query patterns
- [ ] Add staff-specific caching strategies

### Phase 3: Navigation & Permissions (Integration)
**Goal**: Integrate staff management into unified navigation system

#### 3.1 Navigation Integration
- [ ] Add staff management to `/shared/navigation/config/workflow-sections.ts`
- [ ] Configure permission-based access (crew workflow permissions)
- [ ] Update mobile navigation inclusion
- [ ] Test navigation consistency

#### 3.2 Permission System
- [ ] Map staff management permissions to workflow system
- [ ] Define role-based access (manager, administrator, crew_manager)
- [ ] Integrate with existing permission checks
- [ ] Test access control across user roles

#### 3.3 Route Configuration
- [ ] Update App.tsx with new staff management route
- [ ] Remove old staff-management.tsx from pages
- [ ] Ensure AppLayout integration
- [ ] Test route protection and navigation

### Phase 4: API & Backend Compliance (Data Flow)
**Goal**: Align API endpoints with established patterns

#### 4.1 API Endpoint Updates
- [ ] Update `/api/staff` to use user-based queries
- [ ] Implement role-based filtering (?role=staff,crew_member)
- [ ] Add location-based staff filtering
- [ ] Remove separate staff entity endpoints

#### 4.2 Query Integration
- [ ] Integrate with existing user API patterns
- [ ] Use established query client configuration
- [ ] Add proper error handling and loading states
- [ ] Test API consistency

#### 4.3 Data Synchronization
- [ ] Ensure staff data appears in user management
- [ ] Integrate with applicant → staff promotion workflow
- [ ] Test user role transitions
- [ ] Verify data consistency

### Phase 5: Feature Parity & Testing (Completion)
**Goal**: Ensure new implementation matches required functionality

#### 5.1 Feature Implementation
- [ ] Staff listing with filtering and search
- [ ] Staff creation and editing
- [ ] Role assignment and management
- [ ] Integration with scheduling system
- [ ] Mobile responsiveness

#### 5.2 Testing & Validation
- [ ] Test all user roles (admin, manager, crew_member)
- [ ] Verify permission boundaries
- [ ] Test mobile navigation and functionality
- [ ] Validate data integrity

#### 5.3 Migration & Cleanup
- [ ] Migrate existing staff data to new structure
- [ ] Remove old staff-management.tsx file
- [ ] Clean up unused staff-related components
- [ ] Update documentation

## Implementation Priority

### Phase 1 (Critical): Database Foundation
- **Week 1**: Schema analysis and design
- **Week 1**: Database schema updates and migration scripts
- **Week 1**: Storage layer compliance testing

### Phase 2-3 (High): Module Integration  
- **Week 2**: User module structure and components
- **Week 2**: Navigation and permission integration

### Phase 4-5 (Medium): Feature Completion
- **Week 3**: API compliance and feature parity
- **Week 3**: Testing and final migration

## Success Criteria

### Technical Compliance
- [ ] All components use @shared/schema.User types
- [ ] Proper user module directory structure
- [ ] Unified navigation integration
- [ ] AppLayout compatibility
- [ ] Schema-first architecture compliance

### Functional Requirements
- [ ] Staff management accessible via unified navigation
- [ ] Role-based permission enforcement
- [ ] Mobile navigation functionality
- [ ] Integration with existing user workflows
- [ ] Data consistency with user management

### User Experience
- [ ] Single sidebar navigation (no duplicates)
- [ ] Consistent UI patterns with other modules
- [ ] Proper loading and error states
- [ ] Mobile-responsive design
- [ ] No navigation "flicking" or redirects

## Risk Mitigation

### Data Migration Risks
- **Risk**: Loss of existing staff data during migration
- **Mitigation**: Comprehensive backup and staged migration approach

### User Experience Risks  
- **Risk**: Disruption to current staff management workflows
- **Mitigation**: Feature parity validation and parallel development

### Integration Risks
- **Risk**: Breaking existing user management functionality
- **Mitigation**: Isolated development and comprehensive testing

## Dependencies

### Internal Dependencies
- User module architecture (completed)
- Unified navigation system (completed)
- Schema-first approach compliance (established)
- AppLayout integration (available)

### External Dependencies
- Database migration capabilities
- User role and permission testing
- Mobile navigation testing environment

## Notes

This migration represents a complete rebuild rather than a fix-in-place approach. The existing staff management page violates too many architectural principles to be efficiently repaired. A clean implementation following established patterns will be faster and more maintainable.

The migration aligns with the successful user module migration methodology and maintains consistency with the "applicants ARE users" principle by treating "crew members ARE users with crew roles."

## Multi-Location Assignment Architecture

### Junction Table Design
```sql
user_locations {
  user_id: FK → users.id
  location_id: FK → locations.id
  role_at_location: text (crew_member, crew_manager)
  hire_date: timestamp
  status: text (active, inactive)
  position: text
  department: text
  created_at: timestamp
  updated_at: timestamp
}
```

### Key Benefits
- **Matrix Structure**: Users can be assigned to multiple locations with different roles
- **PostgreSQL Optimization**: Leverages existing infrastructure and query patterns
- **Performance**: Proper indexing supports efficient location-based filtering
- **Data Integrity**: ACID compliance for crew assignment changes
- **Caching Ready**: Redis can cache location-filtered crew member lists

### Migration Strategy
1. Create user_locations junction table
2. Migrate staff table data to users table + user_locations assignments
3. Update storage layer for multi-location queries
4. Remove staff table after validation
5. Update dashboard filtering to use junction table queries