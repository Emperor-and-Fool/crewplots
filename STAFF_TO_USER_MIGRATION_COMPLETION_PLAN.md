# Staff to User Migration Completion Plan

## Overview

The CrewPlots application currently has **dual implementation** of crew management - both legacy Staff system and new User-based crew system running in parallel. This creates TypeScript schema mismatches, potential runtime inconsistencies, and maintenance complexity.

**Current State:** 75 references to Staff/staff code still exist in storage.ts alongside User-based crew methods.

## Critical Issues Identified

### 1. Type System Conflicts
- Legacy Staff methods return `Staff` types
- New crew methods return `User` types  
- Mixed queries create partial User objects missing required fields (notes, workflowPermissions, blockedPermissions)

### 2. Data Source Split
- Legacy Staff system uses in-memory Maps
- New User system uses PostgreSQL database
- Inconsistent data access patterns

### 3. Schema Mismatches
- Legacy Staff schema vs current User schema
- Some queries exclude required User fields
- TypeScript errors from incomplete User objects

## Migration Completion Plan

### Phase 1: Assessment & Documentation
**Goal:** Understand current usage and dependencies

**Tasks:**
1. [ ] Audit all API routes using legacy Staff methods
2. [ ] Identify frontend components depending on Staff vs User APIs
3. [ ] Map Staff data structure to User schema equivalents
4. [ ] Verify all Staff data has been migrated to Users table

**Deliverables:**
- Staff usage audit report
- API dependency mapping
- Data migration verification

### Phase 2: API Transition
**Goal:** Replace legacy Staff APIs with User-based equivalents

**Tasks:**
1. [ ] Update routes.ts to use User-based crew methods instead of Staff methods
2. [ ] Ensure all User queries include complete schema fields
3. [ ] Update API response formats to match User schema
4. [ ] Test crew management functionality with User-based APIs

**Critical User Query Fix:**
```typescript
// BROKEN - Missing required User fields
const [user] = await db.select({
  id: users.id,
  username: users.username,
  // Missing: notes, workflowPermissions, blockedPermissions
}).from(users)

// FIXED - Complete User schema
const [user] = await db.select().from(users) // Gets all fields
```

### Phase 3: Storage Layer Cleanup
**Goal:** Remove legacy Staff implementation

**Tasks:**
1. [ ] Remove Staff/StaffCompetency classes and Maps from DatabaseStorage
2. [ ] Delete legacy Staff methods (createStaff, updateStaff, deleteStaff, etc.)
3. [ ] Keep only User-based crew management methods
4. [ ] Update method signatures to be consistent

**Methods to Remove:**
- createStaff, updateStaff, deleteStaff
- getStaffCompetency, createStaffCompetency, etc.
- All Map-based Staff storage

**Methods to Keep:**
- User-based crew methods (getStaffMembers → getUsersByRole('staff'))
- User competency methods with consistent User schema

### Phase 4: Type System Cleanup
**Goal:** Remove legacy types and fix TypeScript errors

**Tasks:**
1. [ ] Remove Staff/StaffCompetency type exports from shared/schema.ts
2. [ ] Fix TypeScript compilation errors from removed types
3. [ ] Ensure all User queries return complete User objects
4. [ ] Update import statements across codebase

### Phase 5: Testing & Validation
**Goal:** Ensure migration doesn't break functionality

**Tasks:**
1. [ ] Test crew management workflows (view, create, edit, delete)
2. [ ] Verify crew competency assignment works
3. [ ] Test crew-location assignments
4. [ ] Validate role-based permissions for crew operations

## Risk Assessment

### Critical Risks
- **Functionality Loss:** Breaking existing crew management features
- **Data Inconsistency:** Mixed Staff/User data causing runtime errors  
- **Frontend Breakage:** Components expecting Staff API responses
- **Performance Impact:** Inefficient User queries during transition

### Mitigation Strategies
- Comprehensive testing of crew workflows before cleanup
- Gradual migration with fallback mechanisms
- Database backup before removing legacy code
- Frontend API contract verification

## Success Criteria

### Technical
- [ ] Zero TypeScript compilation errors
- [ ] All User queries return complete schema objects
- [ ] No legacy Staff references in storage layer
- [ ] Clean separation of User-based crew management

### Functional  
- [ ] Crew management features work identically to before
- [ ] Role-based permissions function correctly
- [ ] Competency assignments work properly
- [ ] Location-based crew filtering operational

## Implementation Timeline

**Week 1:** Phase 1 (Assessment)
**Week 2:** Phase 2 (API Transition) 
**Week 3:** Phase 3 (Storage Cleanup)
**Week 4:** Phase 4-5 (Types & Testing)

## Notes

This migration addresses the root cause of current TypeScript schema alignment issues. The dual Staff/User implementation is creating the "missing properties" errors we're seeing in storage.ts.

**Priority:** High - Current schema mismatches are causing development friction and potential runtime bugs.

**Dependencies:** None - This is cleanup of existing technical debt.

**Impact:** Positive - Cleaner codebase, consistent type system, better maintainability.