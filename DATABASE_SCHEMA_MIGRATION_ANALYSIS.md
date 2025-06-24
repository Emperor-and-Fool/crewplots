# Database Schema Migration Analysis - User Module

## Investigation Summary

**Date**: June 24, 2025  
**Context**: User Module Migration Phase 2 - Schema alignment investigation  
**Goal**: Determine database migration needs for user module integration

## Current Database Schema Structure

### Users Table (from migration snapshots)
```sql
users: {
  id: serial (primary key)
  public_id: text (unique, nullable)
  username: text (unique, not null)
  password: text (not null)
  email: text (unique, not null)
  first_name: text (nullable)        -- Already exists
  last_name: text (nullable)         -- Already exists
  name: text (not null)              -- Kept for backward compatibility
  role: text (enum constraint)
  location_id: integer (foreign key)
  phone_number: text (nullable)
  status: text (enum for applicants)
  resume_url: text (nullable)
  notes: text (nullable)
  workflow_permissions: jsonb
  blocked_permissions: jsonb
  unique_code: text (unique)
  created_at: timestamp
  updated_at: timestamp
}
```

### Related Tables
- **`user_locations`** - Many-to-many user/location/role relationships
- **`user_documents`** - Document storage per user (with cascade delete)
- **`roles`** - Role definitions table
- **`permissions`** - Permission definitions table  
- **`role_permissions`** - Role-permission junction table
- **`sessions`** - Session storage with expire index

## Migration Assessment

### ✅ No Database Migration Required

**Reasons:**
1. **Schema Already Complete**: All required fields exist (`first_name`, `last_name`, `phone_number`, etc.)
2. **Backward Compatibility**: Existing `name` field preserved for auth system
3. **Role System Ready**: Full RBAC system with junction tables implemented
4. **Document Support**: User documents table with proper foreign key constraints

### Type System Alignment Strategy

**Single Source of Truth Approach:**
- Use `@shared/schema.ts` generated types as canonical source
- Extend schema types for UI-specific needs without duplication
- All modules import from same schema source
- Prevents accidental type duplication across modules

## Schema-Generated Types Benefits

### Solves "One Source Per Module" Problem
```typescript
// PROBLEM: Multiple type sources create confusion
import { User } from '@/modules/users/types'     // Option 1
import { User } from '@/modules/messaging/types' // Option 2  
import { User } from '@/shared/schema'           // Option 3

// SOLUTION: Only one canonical source
import { User } from '@/shared/schema'           // Only option
```

### Future-Proof Architecture
- New modules automatically use existing schema types
- Database changes propagate to all TypeScript definitions
- Eliminates "which User type should I use?" decisions
- Maintains consistency with existing authentication flow

## Conclusion

**No database migration needed** - existing schema supports all user module requirements. Focus migration efforts on **type system consolidation** using schema-generated types as single source of truth.

## Next Steps

1. Create applicant login chain sub-plan
2. Implement authentication flow fixes using existing schema
3. Proceed with user module development using schema-generated types