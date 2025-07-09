# VE30 Migration Plan - Legacy /api/users Endpoints

## Scope: 6 Files Need VE30 Migration

### Files to Migrate:
1. `client/src/modules/users/hooks/useUserManagement.tsx` - Hook with multiple endpoints
2. `client/src/pages/applicants.tsx` - Direct fetch calls (2 locations)
3. `client/src/pages/applicant-detail.tsx` - Direct fetch call (1 location)
4. `client/src/modules/users/components/workflows/ApplicantForm.tsx` - Direct fetch calls (2 locations)
5. `client/src/modules/users/pages/CrewMemberProfile.tsx` - Direct fetch calls (2 locations)
6. `client/src/pages/profile.tsx` - Direct fetch call (broken endpoint)

## Migration Strategy

### Phase 1: Hook Migration (Foundation)
**Target:** `useUserManagement.tsx`
- Replace `/api/users` with `/api/validation/v3/execute`
- Use VE30 pattern from working examples (ProfileCard, applicants pages)
- Maintain existing hook interface for components

### Phase 2: Component Direct Calls
**Targets:** Pages and components with direct fetch
- Pattern: Replace `fetch('/api/users/...')` with VE30 structure
- Use ValidationEngine30 request format
- Maintain existing component interfaces

### Phase 3: Cleanup
- Remove legacy `management.ts` routes
- Fix broken `index.ts` import
- Clean up unused route files

## VE30 Pattern Template

```typescript
// Replace this:
const response = await fetch('/api/users', { credentials: 'include' });

// With this:
const response = await fetch('/api/validation/v3/execute', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation: 'read',
    entityType: 'userList',
    data: { filters: {} },
    context: {
      userId: userId,
      userRole: 'authenticated',
      permissions: ['user.read']
    }
  })
});
```

## Success Criteria
- All 6 files use VE30 endpoints
- No frontend calls to `/api/users/*`
- Legacy route files can be safely deleted
- Profile page loop issue resolved
- Authentication integration maintained

## Implementation Order
1. useUserManagement.tsx (impacts multiple components)
2. profile.tsx (fixes broken endpoint)
3. applicants.tsx, applicant-detail.tsx (already partially migrated)
4. ApplicantForm.tsx, CrewMemberProfile.tsx (module components)
5. Legacy route cleanup

## Validation
- Test each component after migration
- Verify authentication works
- Check data consistency
- Confirm cache invalidation works