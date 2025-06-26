# Role Migration Implementation Plan
**Date:** June 25, 2025  
**Context:** Post-Auth Module Migration Role Enhancement  
**Strategy:** Gradual Migration with Dual Support

## Migration Overview

This plan implements the migration from the current 5-role system to a new 6-role hierarchical structure:

**Migration Mapping:**
- `administrator` → `administrator` (unchanged)
- `manager` → `owner` (unused role repurposed)
- `crew_manager` → `crew_chief` (rename)
- `crew_member` → `crew_member` (unchanged)
- `applicant` → `applicant` (unchanged)
- NEW: `app_manager` (available for assignment)

## Phase 1A: Database Schema Extension

### Duration: 1 hour
### Risk Level: Medium

#### Step 1: Add New Roles to Enum
```sql
-- Connect to database and execute:
ALTER TYPE user_role ADD VALUE 'owner';
ALTER TYPE user_role ADD VALUE 'app_manager';
ALTER TYPE user_role ADD VALUE 'crew_chief';
```

#### Step 2: Update Schema Definition
File: `shared/schema.ts`
```typescript
// Update line 86 from:
role: text("role", { enum: ["administrator", "manager", "crew_manager", "crew_member", "applicant"] }).notNull(),

// To:
role: text("role", { enum: ["administrator", "owner", "manager", "app_manager", "crew_chief", "crew_manager", "crew_member", "applicant"] }).notNull(),
```

#### Step 3: Verify Schema Update
```sql
-- Verify new roles are available:
SELECT enum_range(NULL::user_role);
```

## Phase 1B: Permission System Dual Support

### Duration: 2 hours
### Risk Level: Low

#### Step 1: Create Role Alias System
File: `client/src/hooks/use-workflow-permissions.ts`

Add role normalization function:
```typescript
// Add after imports, before hook definition
const ROLE_MIGRATION_ALIASES = {
  'manager': 'owner',
  'crew_manager': 'crew_chief'
} as const;

function normalizeRole(role: string): string {
  return ROLE_MIGRATION_ALIASES[role as keyof typeof ROLE_MIGRATION_ALIASES] || role;
}
```

#### Step 2: Update Role Checking Logic
In `useWorkflowPermissions` hook:
```typescript
// Update hasWorkflowAccess function to normalize roles
const hasWorkflowAccess = (workflow: WorkflowName): boolean => {
  if (!user?.role) {
    console.log('🔍 WORKFLOW ACCESS: No user role');
    return false;
  }

  // Normalize role for migration compatibility
  const normalizedRole = normalizeRole(user.role);

  // Admin fallback: owner/administrator without permissions gets full access
  if (normalizedRole === 'administrator' || (normalizedRole === 'owner' && !user.workflowPermissions)) {
    // ... rest of logic unchanged
  }
  
  // Use normalized role throughout the rest of the function
};
```

#### Step 3: Update Auth Operations Hook
File: `client/src/modules/auth/hooks/useAuthOperations.tsx`
```typescript
// Update hasRole function to support aliases
const hasRole = (role: string): boolean => {
  const normalizedUserRole = normalizeRole(user?.role || '');
  const normalizedCheckRole = normalizeRole(role);
  return normalizedUserRole === normalizedCheckRole;
}
```

## Phase 1C: Route Protection Updates

### Duration: 4 hours
### Risk Level: Medium

#### Step 1: Update App.tsx Route Protection Arrays
File: `client/src/App.tsx`

**Dashboard Route (line 158):**
```typescript
// From:
requiredRoles={["manager", "crew_member", "crew_manager", "administrator"]}

// To:
requiredRoles={["owner", "crew_member", "crew_chief", "administrator"]}
```

**Locations Routes (lines 178, 189, 200):**
```typescript
// From:
requiredRoles={["manager", "administrator"]}

// To:
requiredRoles={["owner", "administrator"]}
```

**Crew Management Routes (lines 211, 222):**
```typescript
// From:
requiredRoles={["manager", "floor_manager", "administrator"]}

// To:
requiredRoles={["owner", "crew_chief", "administrator"]}
```

**Scheduling Routes (lines 232, 241):**
```typescript
// From:
requiredRoles={["manager", "floor_manager", "administrator"]}

// To:
requiredRoles={["owner", "crew_chief", "administrator"]}
```

**Applicants Routes (lines 250, 259):**
```typescript
// From:
requiredRoles={["manager", "crew_manager", "administrator"]}

// To:
requiredRoles={["owner", "app_manager", "crew_chief", "administrator"]}
```

**Knowledge Base Route (line 268):**
```typescript
// From:
requiredRoles={["manager", "floor_manager", "administrator"]}

// To:
requiredRoles={["owner", "crew_chief", "administrator"]}
```

**Reports Route (line 278):**
```typescript
// From:
requiredRoles={["manager", "floor_manager", "administrator"]}

// To:
requiredRoles={["owner", "crew_chief", "administrator"]}
```

#### Step 2: Update Server Middleware
File: `server/middleware/auth.ts` - No changes needed (accepts role arrays)

#### Step 3: Update Server Route Protection
File: `server/routes/uploads.ts` (line ~140):
```typescript
// From:
router.delete('/file/:id', authenticateUser, checkRole(['manager', 'floor_manager']), ...)

// To:
router.delete('/file/:id', authenticateUser, checkRole(['owner', 'crew_chief']), ...)
```

#### Step 4: Update Navigation Configuration
File: `shared/navigation/config/administration.ts`:
```typescript
// Update role restrictions from:
permission: { role: ['administrator'] }

// To (if needed):
permission: { role: ['administrator', 'owner'] }
```

File: `shared/navigation/config/location-management.ts`:
```typescript
// Update role restrictions from:
permission: { role: ['administrator', 'manager'] }

// To:
permission: { role: ['administrator', 'owner'] }
```

## Phase 1D: Data Migration

### Duration: 30 minutes
### Risk Level: Low

#### Step 1: Update Existing User Roles
```sql
-- Migrate crew_manager to crew_chief
UPDATE users SET role = 'crew_chief' WHERE role = 'crew_manager';

-- Verify migration
SELECT username, role FROM users ORDER BY role, username;
```

#### Step 2: Verify User Access
Test that `testkai` user can still access all previous functionality with new `crew_chief` role.

#### Step 3: Manual app_manager Assignment (Optional)
```sql
-- Assign app_manager role to specific user if needed
-- UPDATE users SET role = 'app_manager' WHERE username = 'specific_username';
```

## Phase 1E: Cleanup and Finalization

### Duration: 2 hours
### Risk Level: Low

#### Step 1: Remove Role Migration Aliases
Remove the dual support code from Phase 1B:
- Delete `ROLE_MIGRATION_ALIASES` constant
- Delete `normalizeRole` function
- Restore original role checking logic

#### Step 2: Update Schema Enum (Optional)
```sql
-- Remove old enum values (complex process)
-- This step is optional as having extra enum values doesn't hurt
-- Can be done in future maintenance window if needed
```

#### Step 3: Final Schema State
File: `shared/schema.ts`
```typescript
// Final role enum:
role: text("role", { enum: ["administrator", "owner", "app_manager", "crew_chief", "crew_member", "applicant"] }).notNull(),
```

#### Step 4: Update Navigation Labels
Update any UI labels that reference old role names:
- "Crew Manager" → "Crew Chief"
- Add "App Manager" to any role selection interfaces

## Testing Strategy

### Phase 1A Testing
- Verify database connection after schema changes
- Test enum constraint accepts new values
- Verify existing users unchanged

### Phase 1B Testing
- Test role normalization function with sample inputs
- Verify workflow permissions still work for existing users
- Test auth operations with alias support

### Phase 1C Testing
- Test all route protections with existing users
- Verify navigation system works with new roles
- Test backend middleware with updated role arrays

### Phase 1D Testing
- Verify `testkai` user access after role change
- Test all workflows `testkai` previously had access to
- Verify applicant workflows still function

### Phase 1E Testing
- Complete system test with all new roles
- Verify removal of migration code doesn't break anything
- Performance test to ensure no regression

## Rollback Procedures

### Phase 1A Rollback
```sql
-- Cannot easily remove enum values, but data is preserved
-- Revert schema.ts to original state
-- Restart application
```

### Phase 1B Rollback
- Revert hook changes to original code
- Remove role alias code
- Restart application

### Phase 1C Rollback
- Revert all route protection arrays to original values
- Revert navigation configuration changes
- Deploy previous version

### Phase 1D Rollback
```sql
-- Revert user role changes
UPDATE users SET role = 'crew_manager' WHERE role = 'crew_chief';
```

## New Role Assignment Guide

### app_manager Role Assignment
The `app_manager` role is designed for users who specialize in application workflow management:

```sql
-- Assign to specific user
UPDATE users SET role = 'app_manager' WHERE username = 'target_username';

-- Set workflow permissions for app_manager
UPDATE users SET workflow_permissions = '{
  "application": ["view", "hire", "delete", "edit", "status_update"],
  "crew": ["view"],
  "scheduling": ["view"],
  "location": ["view"]
}'::jsonb WHERE role = 'app_manager';
```

### owner Role Assignment
The `owner` role represents business ownership level access:
```sql
-- Assign to business owner
UPDATE users SET role = 'owner' WHERE username = 'business_owner_username';

-- Owners typically get full workflow access
UPDATE users SET workflow_permissions = '{
  "application": ["view", "hire", "delete", "edit", "status_update", "manage"],
  "crew": ["view", "manage", "schedule", "assign"],
  "financial": ["view", "edit", "reports", "approve"],
  "scheduling": ["view", "create", "edit", "delete", "assign"],
  "location": ["view", "edit", "create", "delete", "manage_users"]
}'::jsonb WHERE role = 'owner';
```

## Post-Migration Validation

### User Access Verification
1. **administrator** - Verify full system access
2. **testkai (crew_chief)** - Verify all previous access maintained
3. **applicants** - Verify portal access unchanged
4. **New roles** - Test assignment and access patterns

### System Functionality Check
1. Authentication flows work correctly
2. Route protection functions properly
3. Navigation system displays appropriate options
4. Workflow permissions operate as expected
5. Database operations complete successfully

### Performance Validation
1. Authentication performance unchanged
2. Route loading times normal
3. Database query performance stable
4. No memory leaks from migration code

## Success Criteria

- [ ] All existing users maintain their current access levels
- [ ] New role hierarchy properly implemented
- [ ] Route protection updated and functional
- [ ] Navigation system reflects new roles
- [ ] Database migration completed successfully
- [ ] No system downtime during migration
- [ ] All tests pass after each phase
- [ ] Documentation updated to reflect changes

## Emergency Contacts

- **Database Issues**: Check connection and rollback schema changes
- **Auth Issues**: Revert auth module changes and restart
- **Route Issues**: Deploy previous version of App.tsx
- **User Issues**: Manual role assignment via SQL

This migration plan provides a safe, methodical approach to implementing the new role hierarchy while maintaining system stability and user access throughout the process.