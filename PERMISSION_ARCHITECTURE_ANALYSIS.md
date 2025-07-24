# Permission Architecture Analysis

## Current Database Structure

### Database Permissions Table
```
id,name,description,created_at
1,crew_planning,Access to crew planning workflow and strategic planning features,2025-06-26 16:49:05.598269
2,scheduler_development,Base access to scheduler development workflow,2025-06-26 16:49:20.68791
3,scheduler_development.read,Read access to view shift plans and templates in development mode,2025-06-26 16:49:20.68791
4,scheduler_development.write,Write access to propose and modify shift plans,2025-06-26 16:49:20.68791
5,scheduler_development.execute,Execute access to promote templates from development to crew_planning workflow,2025-06-26 16:49:20.68791
6,schedule.create,Create new schedule blocks and scheduling templates,2025-07-01 16:08:56.153579
7,schedule.read,View existing schedule blocks and scheduling data,2025-07-01 16:08:56.153579
8,schedule.update,Modify existing schedule blocks and scheduling templates,2025-07-01 16:08:56.153579
9,schedule.delete,Remove schedule blocks and scheduling templates,2025-07-01 16:08:56.153579
10,schedule.assign_users,Assign users to shifts and schedule positions,2025-07-01 16:08:56.153579
```

### User Workflow Permissions Structure
```json
{
  "scheduling": ["view", "create", "edit", "delete", "assign"],
  "crew": ["view", "manage", "schedule", "assign"],
  "location": ["view", "edit", "create", "delete", "manage_users"],
  "financial": ["view", "edit", "reports", "approve"], 
  "application": ["view", "hire", "delete", "edit", "status_update"]
}
```

## Permission Architecture Formula

**CORRECT PERMISSION FORMULA:**
```
role + workflow → module permissions level
```

**EXAMPLES:**
- **Administrator + scheduling workflow** → `['schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete']`
- **Crew_member + scheduling workflow** → `['schedule.read']`
- **Crew_member + no scheduling workflow** → `[]` (no schedule permissions)

## Permission Flow Architecture

**THE INTERSECTION LOGIC:**
1. **Workflow determines ACCESS:** Does user get any permissions for this module?
2. **Role determines LEVEL:** What CRUD operations can they perform?

**IMPLEMENTATION:**
- **Without workflow:** No permissions regardless of role
- **With workflow:** Role-appropriate permissions for that module

## Current PermissionService Structure

### MODULE_MAPPINGS (Entity to Module Detection)
```typescript
MODULE_MAPPINGS: Record<string, string> = {
  // Scheduler Module
  scheduleBlock: 'schedule',
  weekSchedule: 'schedule', 
  shift: 'schedule',
  
  // Users Module
  user: 'user',
  userList: 'user', 
  userManagement: 'user',
  
  // Other modules...
}
```

### Permission Assembly Process
1. **Entity Detection:** `'scheduleBlock'` → `'schedule'` module
2. **Workflow Gate:** Check `user.workflow_permissions['scheduling']` exists
3. **Module Permissions:** If workflow exists, return role-appropriate permissions for that module

## Key Architectural Insights

**THE WORKFLOW ACTS AS THE GATE, THE ROLE DETERMINES THE PERMISSION LEVEL WITHIN THAT GATE.**

- **Database Permissions Table:** Source of truth for what permissions exist
- **User Workflow:** Gates access to modules 
- **User Role:** Determines which database permissions user gets within allowed modules
- **Result:** No duplication - permissions are intersection of role capabilities and workflow access

## Implementation Status

**CURRENT ISSUE:** The PermissionService has role-based permissions hardcoded instead of using the intersection logic with database permissions and workflow gating.

**NEEDED:** Refactor to use database permissions as source of truth, with role + workflow intersection determining final user permissions.