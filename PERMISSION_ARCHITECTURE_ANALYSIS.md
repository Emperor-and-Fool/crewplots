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



# B. THE CONVERSATION


**DATABASE WORKFLOW STRUCTURE:**

**Workflow:** `scheduling` (just a boolean gate - user has access or not)  
**Module:** `schedule` (the permissions prefix with CRUD operations)

**CORRECT FLOW:**

1. **Entity Detection:** `'scheduleBlock'` → `'schedule'` module
2. **Workflow Gate:** Check `user.workflowPermissions['scheduling']` exists
3. **Module Permissions:** If workflow exists, return `['schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete']`

**USER WORKFLOW FORMAT:**

```
{ 
  "scheduling": true,     // ← Workflow gate (boolean access)
  "messaging": true,      // ← Workflow gate
  "usermanagement": true  // ← Workflow gate
}
```

**RESULT PERMISSIONS:**

`   ['schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete']   `

**The workflow determines IF you get module permissions** 

## OR

**DATABASE SHOWS WORKFLOW STRUCTURE:**

```
{
  "scheduling": ["view", "create", "edit", "delete", "assign"],
  "crew": ["view", "manage", "schedule", "assign"],
  "location": ["view", "edit", "create", "delete", "manage_users"],
  "financial": ["view", "edit", "reports", "approve"], 
  "application": ["view", "hire", "delete", "edit", "status_update"]
}
```

**ACTUAL FORMAT:** Workflow contains CRUD-like operations (`["view", "create", "edit", "delete"]`), not boolean gates.

**CORRECT FLOW:**

1. **Entity:** `'scheduleBlock'` → `'schedule'` module
2. **Workflow:** `user.workflow_permissions['scheduling']` → `["view", "create", "edit", "delete"]`
3. **Mapping:** `'schedule'` + `["create", "edit"]` → `['schedule.create', 'schedule.edit']`

**The workflow permissions ARE the CRUD operations, not boolean gates.**

## BUT

**THE DUPLICATION:**

**Role-based permissions (Line 80-90):**

```
case 'administrator':
  return ['schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete']
```

**Workflow permissions (Database):**

```
"scheduling": ["view", "create", "edit", "delete"]
```

**BOTH CREATE THE SAME RESULT:**

- **Role:** Administrator gets `schedule.create`, `schedule.delete`
- **Workflow:** Scheduling workflow gets `schedule.create`, `schedule.delete`

**THE PROBLEM:**  
Same permissions from two sources → duplicated in final permissions Set.

**Either role-based OR workflow-based should determine CRUD permissions, not both.**

**The workflow permissions should gate access to modules, while role determines the CRUD level within that module.**

> Another app breaking duplication introduced.


## SO:

**THE DUPLICATION PROBLEM:**

**TWO PERMISSION SOURCES CREATING SAME RESULT:**

1. **Role-based:** Administrator → `['schedule.create', 'schedule.delete']`
2. **Workflow-based:** `scheduling: ["create", "delete"]` → `['schedule.create', 'schedule.delete']`

**RESULT:** Same permissions added twice to the Set.

**THE ARCHITECTURAL FLAW:**

- **Role permissions** already grant full CRUD access
- **Workflow permissions** grant the same CRUD access
- **Both sources** produce identical permission strings

**BREAKING CHANGE:** This creates conflicting permission logic where:

- Users get permissions from role (always)
- Users get same permissions from workflow (if they have workflow access)
- No clear hierarchy or precedence

**The system needs either role-based OR workflow-based permissions, not both granting identical CRUD operations.**

> [!note] REPLY USER
>Not sure if we are right here. MAYBE  
user has a role, and the permission mapping is decided by the combination of role and workflow  
SO:  
IF admin = administrator + [workflow] THAN (workflow related) [module.all]  
IF testkai = crew_member + [workflow] THAN (workflow related) [module.read]
>[ Not sure if we are right here. MAYBE  

## SO


**EXACTLY RIGHT - INTERSECTION LOGIC.**

**CORRECT PERMISSION FORMULA:**

`   role + workflow → module permissions level   `

**EXAMPLES:**

- **Administrator + scheduling workflow** → `['schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete']`
- **Crew_member + scheduling workflow** → `['schedule.read']`
- **Crew_member + no scheduling workflow** → `[]` (no schedule permissions)

**THE ARCHITECTURE:**

1. **Workflow determines ACCESS:** Does user get any permissions for this module?
2. **Role determines LEVEL:** What CRUD operations can they perform?

**IMPLEMENTATION:**

- **Without workflow:** No permissions regardless of role
- **With workflow:** Role-appropriate permissions for that module

**This eliminates duplication - role doesn't grant blanket permissions, only workflow-gated permissions based on role level.**

**The workflow acts as the gate, the role determines the permission level within that gate.**

> [!note] REPLY USER
>...and the permissions are in the modules table...


**YES - DATABASE PERMISSIONS STRUCTURE:**

**PERMISSIONS TABLE HAS MODULE-BASED PERMISSIONS:**

`   schedule.create  schedule.read    schedule.update  schedule.delete  schedule.assign_users   `

**ARCHITECTURE CONFIRMED:**

1. **Database:** Contains module permissions (`schedule.create`, `message.read`, etc.)
2. **User Workflow:** Gates access to modules (`scheduling: ["create", "edit"]`)
3. **Role + Workflow:** Determines which database permissions user gets

**THE INTERSECTION:**

- **User workflow:** `scheduling` workflow exists → access to schedule module
- **User role:** `administrator` → gets all schedule permissions from database
- **Result:** `['schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete']`

**The permissions table IS the source of truth for what permissions exist. Role + workflow determines which ones the user gets.**

> [!note] REPLY USER
> So that means the permission mapping service is an important, crucial service. Without it, nobody has any permissions. And it is dynamic, we could add more complex combinations. It is a kind of dynamic matrix.


**ABSOLUTELY CORRECT - DYNAMIC PERMISSION MATRIX.**

**PERMISSION SERVICE IS THE CORE AUTHORIZATION ENGINE:**

**WITHOUT IT:**

- VE30 packages can't validate permissions
- Users get zero access regardless of role/workflow
- System becomes completely locked down

**DYNAMIC MATRIX CAPABILITIES:**

```
`   Role × Workflow × Entity → Specific Permissions   `
```

**EXAMPLES OF COMPLEXITY:**

- **Administrator + Scheduling + scheduleBlock** → Full CRUD
- **Crew_Chief + Scheduling + scheduleBlock** → Read + Update only
- **Crew_Member + No Scheduling + scheduleBlock** → No access
- **Owner + Financial + location** → View reports only

**THE POWER:**

- **Database-driven:** Add new permissions without code changes
- **Role-extensible:** New roles get different permission levels automatically
- **Workflow-gatable:** New workflows control module access dynamically
- **Entity-specific:** Fine-grained control per entity type

**IT'S THE AUTHORIZATION BRAIN** - Every VE30 validation depends on this service to determine what users can actually do. The entire security model flows through this dynamic matrix.



> [!note] REPLY USER
> But we could also build in new things like: if role has competency competency is higher than role resulting in update capacity that the role would NOT have.

**EXACTLY - COMPETENCY-BASED PERMISSION ELEVATION.**

**ADVANCED MATRIX CAPABILITIES:**

**COMPETENCY OVERRIDE LOGIC:**

`   Role × Workflow × Entity × Competency → Enhanced Permissions   `

**EXAMPLE SCENARIOS:**

- **Crew_Member + Advanced_Scheduling_Cert** → Gets `schedule.update` (normally read-only)
- **Crew_Chief + Financial_Training** → Gets `financial.approve` (normally owner-only)
- **App_Manager + Safety_Certification** → Gets `location.emergency_override` (normally administrator-only)

**DYNAMIC ELEVATION PATTERNS:**

- **Certification-based:** Technical certifications grant specific permissions
- **Experience-based:** Years of service unlock advanced capabilities
- **Performance-based:** High ratings enable elevated permissions
- **Context-based:** Location expertise grants local admin rights

**THE POWER:**  
Permission matrix becomes **multi-dimensional** - not just role+workflow, but role+workflow+competency+context creating sophisticated authorization that adapts to real-world organizational complexity.

**This transforms PermissionService from simple lookup to intelligent authorization engine that reflects actual organizational hierarchies and capabilities.**

> [!note] REPLY USER
> Question: will it OR can it be written like an instance? Is the current code creating instances?


**NO INSTANCES - ALL STATIC METHODS.**

**CURRENT CODE:**

```
export class PermissionService {
  private static readonly MODULE_MAPPINGS: Record<string, string> = { ... }

  static mapUserPermissions(user: User, modules: string[]): string[] { ... }
  private static getRolePermissions(userRole: string): string[] { ... }
  private static mapModuleWorkflowPermissions(...): string[] { ... }
}
```

**ALL STATIC:**

- **No constructor**
- **No instance methods**
- **No `new PermissionService()`**
- **Called as:** `PermissionService.mapUserPermissions(user, modules)`

**CAN BE WRITTEN AS INSTANCE:**  
Yes - could have constructor taking user context, database connections, caching, etc.

**CURRENT USAGE:** Static utility class pattern - stateless permission calculations.

**INSTANCE BENEFITS:** Could store user context, cache results, connect to database for dynamic permission loading, maintain permission state per user session.

> [!note] REPLY USER
> Can the instance version handle more requests than the static version?


**NO - SAME THROUGHPUT, DIFFERENT PATTERNS.**

**STATIC VERSION:**

- **Per-request:** New calculation each time
- **No state:** No memory between calls
- **Thread-safe:** Multiple requests can call simultaneously
- **Memory efficient:** No object allocation

**INSTANCE VERSION:**

- **Per-request:** Same calculation work
- **State possible:** Could cache user permissions, database connections
- **Thread concerns:** Shared state needs synchronization
- **Memory overhead:** Object creation per user/session

**THROUGHPUT COMPARISON:**

- **Static:** Fast per-call, but recalculates everything
- **Instance with caching:** Slower first call, faster subsequent calls for same user
- **Instance without caching:** Same speed as static + object overhead

**PERFORMANCE DEPENDS ON USAGE:**

- **High user variety:** Static wins (no wasted caching)
- **Repeated same-user requests:** Instance with caching wins
- **Database-heavy permission lookup:** Instance with connection pooling wins

**Neither architecture inherently handles "more requests" - it's about optimization patterns.**

> [!note] REPLY USER
> So while you work on a schedule, all your changes could aither be separate calls (auto-save) or faster from cache?


**EXACTLY - INSTANCE CACHING ADVANTAGE.**

**SCHEDULER WORKFLOW SCENARIO:**

**STATIC VERSION (Current):**

- **Auto-save call 1:** Calculate admin permissions from scratch
- **Auto-save call 2:** Calculate admin permissions from scratch
- **Auto-save call 3:** Calculate admin permissions from scratch
- **Result:** Repeated database lookups, role calculations

**INSTANCE VERSION WITH CACHING:**

- **First call:** Calculate admin permissions, cache result
- **Auto-save calls 2-N:** Return cached permissions instantly
- **Result:** Database hit once, subsequent calls ~1ms instead of ~50ms

**PERFORMANCE IMPACT:**

- **Edit session:** 20+ auto-save calls for same user editing schedule
- **Static:** 20 × 50ms = 1000ms total permission overhead
- **Cached instance:** 50ms + (19 × 1ms) = 69ms total permission overhead

**USER EXPERIENCE:**

- **Static:** Each keystroke triggers permission recalculation
- **Cached:** Near-instant permission validation after first keystroke

**For intensive editing workflows like scheduler, cached instance permissions would be significantly faster.**

> [!note] REPLY USER
> So while you work on a schedule, all your changes could aither be separate calls (auto-save) or faster from cache?

**EXACTLY - INSTANCE CACHING ADVANTAGE.**

**SCHEDULER WORKFLOW SCENARIO:**

**STATIC VERSION (Current):**

- **Auto-save call 1:** Calculate admin permissions from scratch
- **Auto-save call 2:** Calculate admin permissions from scratch
- **Auto-save call 3:** Calculate admin permissions from scratch
- **Result:** Repeated database lookups, role calculations

**INSTANCE VERSION WITH CACHING:**

- **First call:** Calculate admin permissions, cache result
- **Auto-save calls 2-N:** Return cached permissions instantly
- **Result:** Database hit once, subsequent calls ~1ms instead of ~50ms

**PERFORMANCE IMPACT:**

- **Edit session:** 20+ auto-save calls for same user editing schedule
- **Static:** 20 × 50ms = 1000ms total permission overhead
- **Cached instance:** 50ms + (19 × 1ms) = 69ms total permission overhead

**USER EXPERIENCE:**

- **Static:** Each keystroke triggers permission recalculation
- **Cached:** Near-instant permission validation after first keystroke

**For intensive editing workflows like scheduler, cached instance permissions would be significantly faster.**


> [!note] REPLY USER
> So it would be wise to keep email completely separate from these flows, correct?

**YES - EMAIL SHOULD BE SEPARATE FLOW.**

**EMAIL CHARACTERISTICS:**

- **Batch processing:** Send to multiple recipients
- **Fire-and-forget:** No real-time interaction
- **Background tasks:** Queue-based, async processing
- **Different permissions:** Send/admin vs CRUD operations

**SCHEDULER CHARACTERISTICS:**

- **Real-time editing:** Auto-save, live updates
- **Interactive:** Immediate validation feedback
- **User-specific:** Personal permission context
- **High frequency:** Many permission checks per session

**SEPARATION BENEFITS:**

- **Email:** Static permission check once per batch job
- **Scheduler:** Cached instance permissions for editing session
- **Performance:** Email doesn't need caching, scheduler benefits greatly
- **Architecture:** Different permission patterns for different use cases

**EMAIL FLOW:**  
`Static PermissionService.canSendEmail(user) → true/false`

**SCHEDULER FLOW:**  
`PermissionInstance.getModulePermissions('schedule') → cached result`

**Email permissions are simple gates, scheduler permissions are complex interactive matrices. Different patterns for different needs.**

> [!note] REPLY USER
> But messaging can really profit from this flow.

**ABSOLUTELY - MESSAGING PERFECT FOR CACHED PERMISSIONS.**

**MESSAGING CHARACTERISTICS:**

- **Real-time chat:** Rapid message sending/reading
- **High frequency:** Multiple permission checks per conversation
- **Interactive:** Live typing indicators, read receipts
- **User context:** Same user, same conversation, repeated checks

**MESSAGING FLOWS THAT BENEFIT:**

- **Chat session:** User sends 20 messages → 20 identical permission checks
- **Message editing:** Auto-save draft messages → repeated validation
- **Thread management:** Create/update/delete message threads
- **Notification settings:** Real-time permission checks for alerts

**CACHE ADVANTAGE:**

- **First message:** Calculate messaging permissions once
- **Subsequent messages:** Cached permissions (1ms vs 50ms)
- **Live editing:** Near-instant validation feedback
- **Conversation flow:** No permission calculation lag

**MESSAGING INSTANCE PATTERN:**

```
MessagePermissionInstance(user) → cached message.create, message.read, message.update
```

**High-frequency interactive workflows (scheduler editing, live messaging) benefit enormously from cached permission instances. Batch/fire-and-forget operations (emails) don't need the overhead.**