# Crew Member Login Chain Sub-Plan

## Investigation Summary

**Date**: June 24, 2025  
**Context**: User Module Migration - Crew member authentication flow analysis  
**Goal**: Align testkai's crew-member login chain using existing schema types  
**Learning**: Applicant chain required only removal of conflicting duplicate types

## Crew Member Login Chain Analysis

### Expected Flow Sequence
1. **Registration/Creation**: Admin creates crew member user with role="crew_member"
2. **Login**: `client/src/pages/login.tsx` → Authenticates user via Passport.js
3. **Dashboard Access**: Role-based routing to crew member features
4. **Crew Features**: Access to scheduling, shifts, location-specific content

### Files to Investigate
- **Authentication**: `contexts/auth-context.tsx`, `hooks/use-auth.ts` (same as applicant)
- **User Creation**: Admin user management or crew registration flow
- **Dashboard**: Role-based access control for crew members
- **Crew Features**: Scheduling, shift management, location assignment

## Investigation Tasks

### Task 1: Verify Current Crew Member User
- Check if testkai user exists in database
- Verify role assignment and permissions
- Test login functionality

### Task 2: Trace Crew Member Access Flow
- Follow authentication → role check → dashboard routing
- Identify crew-specific pages and components
- Check for any crew member type conflicts

### Task 3: Identify Type System Conflicts
- Search for scattered crew member type definitions
- Check if same pattern as applicant (duplicate User types)
- Verify all components use `@shared/schema.User`

## Expected Issues (Based on Applicant Pattern)

### Likely Type Conflicts
- Duplicate crew member interface definitions
- Scattered role type definitions
- Conflicting imports in crew-specific components

### Likely Working Components
- Core authentication system (`@shared/schema.User`)
- Login flow (same Passport.js system)
- Session management (same hybrid architecture)

## Success Criteria

**Crew Member Login Chain Working:**
- ✅ testkai can login successfully with crew_member role
- ✅ Proper dashboard/features access based on role
- ✅ All crew components use `@shared/schema.User`
- ✅ No TypeScript type conflicts
- ✅ Location-based permissions working

## Implementation Strategy

### Phase 1: Investigate Current State
- Test testkai login functionality
- Map crew member user journey
- Identify any broken components or access issues

### Phase 2: Remove Conflicting Types (If Found)
- Apply same pattern as applicant fix
- Remove duplicate type definitions
- Ensure single source of truth: `@shared/schema.User`

### Phase 3: Verify Complete Workflow
- Test complete crew member authentication and access
- Verify role-based permissions
- Document working pattern

## Next Steps After Investigation

1. Create testkai crew member user if needed
2. Test complete crew member workflow
3. Fix any type conflicts using applicant chain pattern
4. Document successful implementation