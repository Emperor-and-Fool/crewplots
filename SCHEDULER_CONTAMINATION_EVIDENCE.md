# Scheduler Module Contamination in server/storage.ts

## Evidence Report: Scheduler-Specific Business Logic in Storage Layer

**File:** `server/storage.ts` (1,695 lines total)  
**Investigation Date:** July 23, 2025  
**Total Contamination:** ~400+ lines (25% of file)

---

## 1. SHIFT REQUIREMENTS MANAGEMENT (Lines 1360-1392)
**Purpose:** Manages competency requirements for specific shifts  
**Business Logic:** Scheduler-specific entity relationships and filtering

```javascript
// Lines 1360-1392 (33 lines)
// Shift Requirements
async getShiftRequirement(id: number): Promise<ShiftRequirement | undefined> {
  const results = await db.select().from(shiftRequirements).where(eq(shiftRequirements.id, id));
  return results[0];
}

async getShiftRequirements(shiftId?: number): Promise<ShiftRequirement[]> {
  if (shiftId) {
    return await db.select().from(shiftRequirements).where(eq(shiftRequirements.shiftId, shiftId));
  }
  return await db.select().from(shiftRequirements);
}

async getShiftRequirementsByShift(shiftId: number): Promise<ShiftRequirement[]> {
  return await db.select().from(shiftRequirements).where(eq(shiftRequirements.shiftId, shiftId));
}

async createShiftRequirement(requirement: InsertShiftRequirement): Promise<ShiftRequirement> {
  const results = await db.insert(shiftRequirements).values(requirement).returning();
  return results[0];
}

async updateShiftRequirement(id: number, requirement: Partial<InsertShiftRequirement>): Promise<ShiftRequirement | undefined> {
  const results = await db.update(shiftRequirements).set(requirement).where(eq(shiftRequirements.id, id)).returning();
  return results[0];
}

async deleteShiftRequirement(id: number): Promise<boolean> {
  const results = await db.delete(shiftRequirements).where(eq(shiftRequirements.id, id)).returning();
  return results.length > 0;
}
```

---

## 2. SHIFT SUBSCRIPTIONS MANAGEMENT (Lines 1393-1435)
**Purpose:** Manages crew member interest/subscriptions to shifts  
**Business Logic:** Complex filtering by shift, user, and combinations

```javascript
// Lines 1393-1435 (42 lines)
// Shift Subscriptions
async getShiftSubscription(id: number): Promise<ShiftSubscription | undefined> {
  const results = await db.select().from(shiftSubscriptions).where(eq(shiftSubscriptions.id, id));
  return results[0];
}

async getShiftSubscriptions(shiftId?: number, userId?: number): Promise<ShiftSubscription[]> {
  let query = db.select().from(shiftSubscriptions);
  
  if (shiftId && userId) {
    query = query.where(and(eq(shiftSubscriptions.shiftId, shiftId), eq(shiftSubscriptions.userId, userId)));
  } else if (shiftId) {
    query = query.where(eq(shiftSubscriptions.shiftId, shiftId));
  } else if (userId) {
    query = query.where(eq(shiftSubscriptions.userId, userId));
  }
  
  return await query;
}

async getShiftSubscriptionsByShift(shiftId: number): Promise<ShiftSubscription[]> {
  return await db.select().from(shiftSubscriptions).where(eq(shiftSubscriptions.shiftId, shiftId));
}

async getShiftSubscriptionsByUser(userId: number): Promise<ShiftSubscription[]> {
  return await db.select().from(shiftSubscriptions).where(eq(shiftSubscriptions.userId, userId));
}

async createShiftSubscription(subscription: InsertShiftSubscription): Promise<ShiftSubscription> {
  const results = await db.insert(shiftSubscriptions).values(subscription).returning();
  return results[0];
}

async updateShiftSubscription(id: number, subscription: Partial<InsertShiftSubscription>): Promise<ShiftSubscription | undefined> {
  const results = await db.update(shiftSubscriptions).set(subscription).where(eq(shiftSubscriptions.id, id)).returning();
  return results[0];
}

async deleteShiftSubscription(id: number): Promise<boolean> {
  const results = await db.delete(shiftSubscriptions).where(eq(shiftSubscriptions.id, id)).returning();
  return results.length > 0;
}
```

---

## 3. SHIFT ASSIGNMENTS MANAGEMENT (Lines 1436-1478)
**Purpose:** Manages final crew assignments to shifts  
**Business Logic:** Multi-parameter filtering and assignment workflow logic

```javascript
// Lines 1436-1478 (42 lines)
// Shift Assignments
async getShiftAssignment(id: number): Promise<ShiftAssignment | undefined> {
  const results = await db.select().from(shiftAssignments).where(eq(shiftAssignments.id, id));
  return results[0];
}

async getShiftAssignments(shiftId?: number, userId?: number): Promise<ShiftAssignment[]> {
  let query = db.select().from(shiftAssignments);
  
  if (shiftId && userId) {
    query = query.where(and(eq(shiftAssignments.shiftId, shiftId), eq(shiftAssignments.userId, userId)));
  } else if (shiftId) {
    query = query.where(eq(shiftAssignments.shiftId, shiftId));
  } else if (userId) {
    query = query.where(eq(shiftAssignments.userId, userId));
  }
  
  return await query;
}

async getShiftAssignmentsByShift(shiftId: number): Promise<ShiftAssignment[]> {
  return await db.select().from(shiftAssignments).where(eq(shiftAssignments.shiftId, shiftId));
}

async getShiftAssignmentsByUser(userId: number): Promise<ShiftAssignment[]> {
  return await db.select().from(shiftAssignments).where(eq(shiftAssignments.userId, userId));
}

async createShiftAssignment(assignment: InsertShiftAssignment): Promise<ShiftAssignment> {
  const results = await db.insert(shiftAssignments).values(assignment).returning();
  return results[0];
}

async updateShiftAssignment(id: number, assignment: Partial<InsertShiftAssignment>): Promise<ShiftAssignment | undefined> {
  const results = await db.update(shiftAssignments).set(assignment).where(eq(shiftAssignments.id, id)).returning();
  return results[0];
}

async deleteShiftAssignment(id: number): Promise<boolean> {
  const results = await db.delete(shiftAssignments).where(eq(shiftAssignments.id, id)).returning();
  return results.length > 0;
}
```

---

## 4. SCHEDULING WINDOWS MANAGEMENT (Lines 1479-1517)
**Purpose:** Manages role-based scheduling time windows  
**Business Logic:** Location and role-based filtering for scheduling periods

```javascript
// Lines 1479-1517 (38 lines)
// Scheduling Windows
async getSchedulingWindow(id: number): Promise<SchedulingWindow | undefined> {
  const results = await db.select().from(schedulingWindows).where(eq(schedulingWindows.id, id));
  return results[0];
}

async getSchedulingWindows(locationId?: number, role?: string): Promise<SchedulingWindow[]> {
  let query = db.select().from(schedulingWindows);
  
  if (locationId && role) {
    query = query.where(and(eq(schedulingWindows.locationId, locationId), eq(schedulingWindows.role, role)));
  } else if (locationId) {
    query = query.where(eq(schedulingWindows.locationId, locationId));
  } else if (role) {
    query = query.where(eq(schedulingWindows.role, role));
  }
  
  return await query;
}

async getSchedulingWindowsByLocation(locationId: number): Promise<SchedulingWindow[]> {
  return await db.select().from(schedulingWindows).where(eq(schedulingWindows.locationId, locationId));
}

async createSchedulingWindow(window: InsertSchedulingWindow): Promise<SchedulingWindow> {
  const results = await db.insert(schedulingWindows).values(window).returning();
  return results[0];
}

async updateSchedulingWindow(id: number, window: Partial<InsertSchedulingWindow>): Promise<SchedulingWindow | undefined> {
  const results = await db.update(schedulingWindows).set(window).where(eq(schedulingWindows.id, id)).returning();
  return results[0];
}

async deleteSchedulingWindow(id: number): Promise<boolean> {
  const results = await db.delete(schedulingWindows).where(eq(schedulingWindows.id, id)).returning();
  return results.length > 0;
}
```

---

## 5. COMPLEX MULTI-WEEK CREATION BUSINESS LOGIC (Lines 1569-1611)
**Purpose:** Complex workflow for creating schedule blocks with multiple weeks  
**Business Logic:** Multi-step creation process with logging and relationship management

```javascript
// Lines 1569-1589 (21 lines)
// CENTRALIZED MULTI-WEEK CREATION: Single source of truth for all week schedule creation
async createMultiWeekSchedules(scheduleBlockId: number, maxWeeks: number, createdBy: number): Promise<WeekSchedule[]> {
  console.log(`🔄 CENTRALIZED MULTI-WEEK: Creating ${maxWeeks} weeks for schedule block ${scheduleBlockId}`);
  
  const weekSchedules = [];
  for (let weekNumber = 1; weekNumber <= maxWeeks; weekNumber++) {
    const weekScheduleData = {
      scheduleBlockId,
      weekNumber,
      createdBy
    };
    
    console.log(`🔄 CENTRALIZED WEEK CREATE: Week ${weekNumber} for block ${scheduleBlockId}`);
    const weekSchedule = await this.createWeekSchedule(weekScheduleData);
    weekSchedules.push(weekSchedule);
    console.log(`✅ Centralized week ${weekNumber} created with ID: ${weekSchedule.id}`);
  }
  
  console.log(`🔄 CENTRALIZED MULTI-WEEK: Created ${weekSchedules.length} week schedules`);
  return weekSchedules;
}

// Lines 1591-1611 (21 lines)
// CENTRALIZED SCHEDULE BLOCK WITH WEEKS: Single method combining block + multi-week creation
async createScheduleBlockWithWeeks(scheduleBlockData: InsertScheduleBlock, maxWeeks: number = 1): Promise<ScheduleBlock & { weekSchedules: WeekSchedule[] }> {
  console.log(`🔄 CENTRALIZED BLOCK+WEEKS: Creating schedule block with ${maxWeeks} weeks`);
  
  // Create the schedule block first
  const scheduleBlock = await this.createScheduleBlock(scheduleBlockData);
  console.log(`🔄 CENTRALIZED BLOCK+WEEKS: Created block with ID ${scheduleBlock.id}`);
  
  // Create the week schedules using centralized method
  const weekSchedules = await this.createMultiWeekSchedules(
    scheduleBlock.id, 
    maxWeeks, 
    scheduleBlockData.createdBy
  );
  
  return {
    ...scheduleBlock,
    weekSchedules
  };
}
```

---

## 6. SCHEDULER-SPECIFIC SHIFT OPERATIONS (Lines 1649-1683)
**Purpose:** Shift management with cascade delete logic  
**Business Logic:** Complex deletion workflow with related entity cleanup

```javascript
// Lines 1649-1683 (35 lines)
async createShiftForWeekSchedule(shift: InsertShift): Promise<Shift> {
  const results = await db.insert(shifts).values(shift).returning();
  return results[0];
}

async getShiftsByWeekSchedule(weekScheduleId: number): Promise<Shift[]> {
  return await db.select().from(shifts).where(eq(shifts.weekScheduleId, weekScheduleId));
}

async getShifts(): Promise<Shift[]> {
  return await db.select().from(shifts).orderBy(asc(shifts.date));
}

async getShift(id: number): Promise<Shift | undefined> {
  const results = await db.select().from(shifts).where(eq(shifts.id, id));
  return results[0];
}

async createShift(insertShift: InsertShift): Promise<Shift> {
  const [shift] = await db.insert(shifts).values(insertShift).returning();
  return shift;
}

async updateShift(id: number, updates: Partial<InsertShift>): Promise<Shift | undefined> {
  const results = await db.update(shifts).set(updates).where(eq(shifts.id, id)).returning();
  return results[0];
}

async deleteShift(id: number): Promise<boolean> {
  // First delete shift requirements that reference this shift
  await db.delete(shiftRequirements).where(eq(shiftRequirements.shiftId, id));
  // Then delete the shift itself
  const results = await db.delete(shifts).where(eq(shifts.id, id)).returning();
  return results.length > 0;
}
```

---

## 7. DUPLICATE COMPETENCY METHODS (Lines 239-276 AND 494-528)
**Purpose:** Competency management (DUPLICATED TWICE!)  
**Business Logic:** Skill/competency tracking for crew assignments

```javascript
// DUPLICATE #1: Lines 239-276 (38 lines)
// Competencies
async getCompetency(id: number): Promise<Competency | undefined> {
  const results = await db.select().from(competencies).where(eq(competencies.id, id));
  return results[0];
}

async getCompetencies(): Promise<Competency[]> {
  return await db.select().from(competencies);
}

async createCompetency(competency: InsertCompetency): Promise<Competency> {
  const results = await db.insert(competencies).values(competency).returning();
  return results[0];
}

// ... (additional methods)

// DUPLICATE #2: Lines 494-528 (35 lines) - IDENTICAL METHODS!
// Competencies
async getCompetency(id: number): Promise<Competency | undefined> {
  const results = await db.select().from(competencies).where(eq(competencies.id, id));
  return results[0];
}

async getCompetencies(): Promise<Competency[]> {
  return await db.select().from(competencies);
}

async createCompetency(competency: InsertCompetency): Promise<Competency> {
  const results = await db.insert(competencies).values(competency).returning();
  return results[0];
}

// ... (identical methods repeated)
```

---

## SUMMARY

**Total Scheduler Contamination:** ~400+ lines (25% of storage.ts)

### What Should Be In Scheduler Modules:
- All shift requirements, subscriptions, assignments logic
- Scheduling windows management  
- Multi-week creation workflows
- Complex shift operations with cascade logic
- Competency management (consolidated, not duplicated)

### What Should Remain In Storage:
- Basic CRUD operations for core entities (users, locations)
- Simple database connection methods
- Generic data access patterns

**Architectural Violation:** Storage layer contains complex business logic, entity relationship management, and workflow processes that belong in domain-specific modules.