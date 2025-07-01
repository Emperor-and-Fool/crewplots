# CrewPlots Scheduler - Implementation Guide

**Document Version:** 1.0  
**Created:** June 26, 2025  
**Reference:** Session 3 of Three-Session Scheduler Documentation Approach

## Executive Summary

This implementation guide provides concrete technical specifications for developing the CrewPlots Scheduler module. Based on investigation of actual codebase structure, existing API patterns, and cross-referencing with business requirements, this guide delivers actionable development steps that integrate seamlessly with the proven modular architecture.

**Critical Finding:** Current scheduling implementation is basic with legacy staff table references. The new scheduler will modernize this to use the user_locations and user_competencies architecture while adding unlimited creation and subscription workflows.

## Current State Analysis

### Existing Implementation Gaps

**Database Schema Discrepancies:**
- DevDoc 06_01 shows current schema, but migration files reveal legacy `staff_id` references in shifts table
- Actual shifts table uses `staff_id` while new architecture requires `user_id` 
- Competency system exists but not integrated with shift assignment logic

**API Implementation Status:**
- Basic `/api/shifts/location/:locationId` endpoint exists but limited functionality
- Competency endpoints present but not connected to scheduling workflow
- No subscription or assignment matching algorithms implemented

**Frontend Component Analysis:**
- Existing schedule-calendar.tsx uses legacy Staff schema instead of User module
- Current shift-form.tsx provides basic CRUD but lacks competency integration
- No subscription interface or crew interest workflow exists

## Database Schema Implementation

### Phase 1: Schema Updates

**1. Modernize Shifts Table**
Update existing shifts table to use new user architecture:

```sql
-- Update shifts table to use user_id instead of staff_id
ALTER TABLE shifts 
  DROP COLUMN staff_id,
  ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Add competency requirement tracking
ALTER TABLE shifts 
  ADD COLUMN max_slots INTEGER DEFAULT 1,
  ADD COLUMN subscription_deadline TIMESTAMP,
  ADD COLUMN status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled'));

-- Add indexes for scheduler performance
CREATE INDEX idx_shifts_location_date ON shifts(location_id, date);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_subscription_deadline ON shifts(subscription_deadline);
```

**2. New Scheduler Tables**
Add tables for advanced scheduling functionality:

```sql
-- Shift Requirements: Link shifts to required competencies
CREATE TABLE shift_requirements (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  competency_id INTEGER REFERENCES competencies(id) NOT NULL,
  minimum_level INTEGER DEFAULT 1 NOT NULL, -- 0-5 scale
  required_count INTEGER DEFAULT 1 NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0 NOT NULL, -- Importance weighting 0.1-2.0
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(shift_id, competency_id)
);

-- Shift Subscriptions: Crew member interest tracking
CREATE TABLE shift_subscriptions (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  interest_level INTEGER DEFAULT 3 CHECK (interest_level BETWEEN 1 AND 5),
  availability_confirmed BOOLEAN DEFAULT TRUE,
  notes TEXT,
  subscribed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(shift_id, user_id)
);

-- Shift Assignments: Final crew assignments
CREATE TABLE shift_assignments (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  assigned_by INTEGER REFERENCES users(id) NOT NULL,
  competency_match_score DECIMAL(5,2), -- 0-100 percentage
  assignment_notes TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(shift_id, user_id)
);

-- Scheduling Windows: Configurable viewing periods
CREATE TABLE scheduling_windows (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES locations(id) NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('crew_member', 'crew_chief', 'app_manager', 'owner')),
  weeks_ahead INTEGER DEFAULT 4 CHECK (weeks_ahead BETWEEN 1 AND 12),
  created_by INTEGER REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(location_id, role)
);

-- Performance indexes
CREATE INDEX idx_shift_requirements_shift ON shift_requirements(shift_id);
CREATE INDEX idx_shift_requirements_competency ON shift_requirements(competency_id);
CREATE INDEX idx_shift_subscriptions_shift ON shift_subscriptions(shift_id);
CREATE INDEX idx_shift_subscriptions_user ON shift_subscriptions(user_id);
CREATE INDEX idx_shift_assignments_shift ON shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_user ON shift_assignments(user_id);
```

### Phase 2: Schema Updates in @shared/schema.ts

**Extend Existing Schema:**
```typescript
// Update shifts table definition
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => weeklySchedules.id),
  userId: integer("user_id").references(() => users.id), // Updated from staffId
  locationId: integer("location_id").references(() => locations.id).notNull(),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  position: text("position"),
  maxSlots: integer("max_slots").default(1),
  subscriptionDeadline: timestamp("subscription_deadline"),
  status: text("status", { enum: ["open", "filled", "cancelled"] }).default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New scheduler tables
export const shiftRequirements = pgTable("shift_requirements", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => shifts.id).notNull(),
  competencyId: integer("competency_id").references(() => competencies.id).notNull(),
  minimumLevel: integer("minimum_level").default(1).notNull(),
  requiredCount: integer("required_count").default(1).notNull(),
  weight: decimal("weight", { precision: 3, scale: 2 }).default("1.0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  shiftCompetencyUnique: primaryKey({ columns: [table.shiftId, table.competencyId] }),
  shiftIdIdx: index("idx_shift_requirements_shift").on(table.shiftId),
  competencyIdIdx: index("idx_shift_requirements_competency").on(table.competencyId),
}));

export const shiftSubscriptions = pgTable("shift_subscriptions", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => shifts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  interestLevel: integer("interest_level").default(3),
  availabilityConfirmed: boolean("availability_confirmed").default(true),
  notes: text("notes"),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
}, (table) => ({
  shiftUserUnique: primaryKey({ columns: [table.shiftId, table.userId] }),
  shiftIdIdx: index("idx_shift_subscriptions_shift").on(table.shiftId),
  userIdIdx: index("idx_shift_subscriptions_user").on(table.userId),
}));

export const shiftAssignments = pgTable("shift_assignments", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => shifts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id).notNull(),
  competencyMatchScore: decimal("competency_match_score", { precision: 5, scale: 2 }),
  assignmentNotes: text("assignment_notes"),
  status: text("status", { enum: ["confirmed", "pending", "cancelled"] }).default("confirmed"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => ({
  shiftUserUnique: primaryKey({ columns: [table.shiftId, table.userId] }),
  shiftIdIdx: index("idx_shift_assignments_shift").on(table.shiftId),
  userIdIdx: index("idx_shift_assignments_user").on(table.userId),
}));

export const schedulingWindows = pgTable("scheduling_windows", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  role: text("role").notNull(),
  weeksAhead: integer("weeks_ahead").default(4),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  locationRoleUnique: primaryKey({ columns: [table.locationId, table.role] }),
}));

// Zod schemas for validation
export const insertShiftRequirementSchema = createInsertSchema(shiftRequirements);
export const insertShiftSubscriptionSchema = createInsertSchema(shiftSubscriptions);
export const insertShiftAssignmentSchema = createInsertSchema(shiftAssignments);
export const insertSchedulingWindowSchema = createInsertSchema(schedulingWindows);

// Type exports
export type ShiftRequirement = typeof shiftRequirements.$inferSelect;
export type ShiftSubscription = typeof shiftSubscriptions.$inferSelect;
export type ShiftAssignment = typeof shiftAssignments.$inferSelect;
export type SchedulingWindow = typeof schedulingWindows.$inferSelect;
export type InsertShiftRequirement = z.infer<typeof insertShiftRequirementSchema>;
export type InsertShiftSubscription = z.infer<typeof insertShiftSubscriptionSchema>;
export type InsertShiftAssignment = z.infer<typeof insertShiftAssignmentSchema>;
export type InsertSchedulingWindow = z.infer<typeof insertSchedulingWindowSchema>;
```

## Service Layer Implementation

### SchedulerService Class

**File:** `server/services/scheduler-service.ts`

```typescript
import { db } from "../db";
import { 
  shifts, shiftRequirements, shiftSubscriptions, shiftAssignments,
  users, userCompetencies, competencies, locations
} from "@shared/schema";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { mongoConnection } from "../db-mongo";
import type { ObjectId } from "mongodb";

interface CompetencyMatch {
  userId: number;
  competencyScore: number;
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  matchedCompetencies: number;
  totalRequiredCompetencies: number;
}

interface CompiledShift {
  // Base shift data
  id: number;
  locationId: number;
  date: Date;
  startTime: string;
  endTime: string;
  position?: string;
  maxSlots: number;
  status: string;
  
  // Competency requirements
  requiredCompetencies: ShiftRequirement[];
  
  // Current subscriptions and assignments
  subscriptions: ShiftSubscription[];
  assignments: ShiftAssignment[];
  
  // Eligibility analysis
  eligibleCrew: CompetencyMatch[];
  
  // Rich content from MongoDB
  richDescription?: string;
  customInstructions?: string;
}

export class SchedulerService {
  
  /**
   * Create new shift with competency requirements
   */
  async createShift(shiftData: InsertShift, requirements: InsertShiftRequirement[] = []): Promise<CompiledShift> {
    return await db.transaction(async (tx) => {
      // Create base shift
      const [newShift] = await tx
        .insert(shifts)
        .values(shiftData)
        .returning();
      
      // Add competency requirements
      if (requirements.length > 0) {
        const requirementsWithShiftId = requirements.map(req => ({
          ...req,
          shiftId: newShift.id
        }));
        
        await tx
          .insert(shiftRequirements)
          .values(requirementsWithShiftId);
      }
      
      // Create MongoDB document for rich content if needed
      if (shiftData.richDescription || shiftData.customInstructions) {
        const mongoDoc = {
          shiftId: newShift.id,
          richDescription: shiftData.richDescription || "",
          customInstructions: shiftData.customInstructions || "",
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const mongodb = mongoConnection.getDatabase();
        await mongodb.collection('shift_content').insertOne(mongoDoc);
      }
      
      return await this.compileShiftDetails(newShift.id);
    });
  }
  
  /**
   * Get shifts by location with filtering options
   */
  async getShiftsByLocation(
    locationId: number, 
    dateRange?: { start: Date; end: Date },
    status?: string[]
  ): Promise<CompiledShift[]> {
    
    let query = db
      .select()
      .from(shifts)
      .where(eq(shifts.locationId, locationId));
    
    // Add date range filtering
    if (dateRange) {
      query = query.where(
        and(
          gte(shifts.date, dateRange.start),
          lte(shifts.date, dateRange.end)
        )
      );
    }
    
    // Add status filtering
    if (status && status.length > 0) {
      query = query.where(inArray(shifts.status, status));
    }
    
    const shiftList = await query;
    
    // Compile each shift with full details
    return await Promise.all(
      shiftList.map(shift => this.compileShiftDetails(shift.id))
    );
  }
  
  /**
   * Calculate competency match score for user and shift
   */
  async calculateCompetencyMatch(userId: number, shiftId: number): Promise<CompetencyMatch> {
    // Get shift requirements
    const requirements = await db
      .select()
      .from(shiftRequirements)
      .where(eq(shiftRequirements.shiftId, shiftId));
    
    if (requirements.length === 0) {
      return {
        userId,
        competencyScore: 100, // No requirements means anyone can do it
        availabilityStatus: 'available',
        matchedCompetencies: 0,
        totalRequiredCompetencies: 0
      };
    }
    
    // Get user competencies for this location
    const shift = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    
    if (!shift[0]) {
      throw new Error(`Shift ${shiftId} not found`);
    }
    
    const userComps = await db
      .select()
      .from(userCompetencies)
      .where(
        and(
          eq(userCompetencies.userId, userId),
          eq(userCompetencies.locationId, shift[0].locationId)
        )
      );
    
    // Calculate match score
    let totalScore = 0;
    let matchedCount = 0;
    let weightSum = 0;
    
    for (const requirement of requirements) {
      const userComp = userComps.find(uc => uc.competencyId === requirement.competencyId);
      const weight = parseFloat(requirement.weight.toString());
      weightSum += weight;
      
      if (userComp && userComp.level >= requirement.minimumLevel) {
        // User meets requirement - score based on competency level vs requirement
        const competencyScore = Math.min(userComp.level / 5, 1.0); // Normalize to 0-1
        totalScore += competencyScore * weight;
        matchedCount++;
      }
      // If user doesn't meet requirement, add 0 to score
    }
    
    // Overall percentage score
    const finalScore = weightSum > 0 ? (totalScore / weightSum) * 100 : 0;
    
    return {
      userId,
      competencyScore: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
      availabilityStatus: 'available', // TODO: Check actual availability
      matchedCompetencies: matchedCount,
      totalRequiredCompetencies: requirements.length
    };
  }
  
  /**
   * Handle crew member shift subscription
   */
  async subscribeToShift(
    shiftId: number, 
    userId: number, 
    interestLevel: number = 3,
    notes?: string
  ): Promise<ShiftSubscription> {
    
    // Validate user eligibility
    const competencyMatch = await this.calculateCompetencyMatch(userId, shiftId);
    
    if (competencyMatch.matchedCompetencies === 0 && competencyMatch.totalRequiredCompetencies > 0) {
      throw new Error('User does not meet minimum competency requirements for this shift');
    }
    
    // Create or update subscription
    const subscriptionData = {
      shiftId,
      userId,
      interestLevel,
      notes: notes || null,
      availabilityConfirmed: true
    };
    
    const [subscription] = await db
      .insert(shiftSubscriptions)
      .values(subscriptionData)
      .onConflictDoUpdate({
        target: [shiftSubscriptions.shiftId, shiftSubscriptions.userId],
        set: {
          interestLevel,
          notes: notes || null,
          subscribedAt: sql`NOW()`
        }
      })
      .returning();
    
    return subscription;
  }
  
  /**
   * Assign crew member to shift (crew chief function)
   */
  async assignCrewToShift(
    shiftId: number,
    userId: number,
    assignedBy: number,
    notes?: string
  ): Promise<ShiftAssignment> {
    
    return await db.transaction(async (tx) => {
      // Calculate competency match
      const competencyMatch = await this.calculateCompetencyMatch(userId, shiftId);
      
      // Create assignment
      const assignmentData = {
        shiftId,
        userId,
        assignedBy,
        competencyMatchScore: competencyMatch.competencyScore.toString(),
        assignmentNotes: notes || null,
        status: 'confirmed' as const
      };
      
      const [assignment] = await tx
        .insert(shiftAssignments)
        .values(assignmentData)
        .returning();
      
      // Check if shift is now filled
      const assignmentCount = await tx
        .select({ count: sql`COUNT(*)` })
        .from(shiftAssignments)
        .where(
          and(
            eq(shiftAssignments.shiftId, shiftId),
            eq(shiftAssignments.status, 'confirmed')
          )
        );
      
      const shift = await tx
        .select()
        .from(shifts)
        .where(eq(shifts.id, shiftId))
        .limit(1);
      
      if (shift[0] && parseInt(assignmentCount[0].count as string) >= shift[0].maxSlots) {
        await tx
          .update(shifts)
          .set({ status: 'filled' })
          .where(eq(shifts.id, shiftId));
      }
      
      return assignment;
    });
  }
  
  /**
   * Get eligible crew for shift with competency scores
   */
  async getEligibleCrew(shiftId: number): Promise<CompetencyMatch[]> {
    // Get shift location
    const shift = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    
    if (!shift[0]) {
      throw new Error(`Shift ${shiftId} not found`);
    }
    
    // Get all crew members for this location
    const crewMembers = await db
      .select({
        userId: users.id
      })
      .from(users)
      .innerJoin(userLocations, eq(users.id, userLocations.userId))
      .where(
        and(
          eq(userLocations.locationId, shift[0].locationId),
          eq(userLocations.status, 'active'),
          inArray(users.role, ['crew_member', 'crew_chief'])
        )
      );
    
    // Calculate competency match for each crew member
    const eligibilityPromises = crewMembers.map(crew => 
      this.calculateCompetencyMatch(crew.userId, shiftId)
    );
    
    const eligibilityResults = await Promise.all(eligibilityPromises);
    
    // Sort by competency score descending
    return eligibilityResults.sort((a, b) => b.competencyScore - a.competencyScore);
  }
  
  /**
   * Compile complete shift details with all related data
   */
  private async compileShiftDetails(shiftId: number): Promise<CompiledShift> {
    // Get base shift data
    const [shift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId));
    
    if (!shift) {
      throw new Error(`Shift ${shiftId} not found`);
    }
    
    // Get competency requirements
    const requirements = await db
      .select()
      .from(shiftRequirements)
      .where(eq(shiftRequirements.shiftId, shiftId));
    
    // Get subscriptions
    const subscriptions = await db
      .select()
      .from(shiftSubscriptions)
      .where(eq(shiftSubscriptions.shiftId, shiftId));
    
    // Get assignments
    const assignments = await db
      .select()
      .from(shiftAssignments)
      .where(eq(shiftAssignments.shiftId, shiftId));
    
    // Get eligible crew with scores
    const eligibleCrew = await this.getEligibleCrew(shiftId);
    
    // Get rich content from MongoDB if exists
    let richDescription: string | undefined;
    let customInstructions: string | undefined;
    
    try {
      const mongodb = mongoConnection.getDatabase();
      const contentDoc = await mongodb
        .collection('shift_content')
        .findOne({ shiftId });
      
      if (contentDoc) {
        richDescription = contentDoc.richDescription;
        customInstructions = contentDoc.customInstructions;
      }
    } catch (error) {
      console.warn(`MongoDB content not available for shift ${shiftId}:`, error);
    }
    
    return {
      ...shift,
      requiredCompetencies: requirements,
      subscriptions,
      assignments,
      eligibleCrew,
      richDescription,
      customInstructions
    };
  }
}

export const schedulerService = new SchedulerService();
```

## API Endpoints Implementation

### Update server/routes.ts

**Add Scheduler API Routes:**
```typescript
// Import scheduler service
import { schedulerService } from './services/scheduler-service';
import { 
  insertShiftRequirementSchema, 
  insertShiftSubscriptionSchema,
  insertShiftAssignmentSchema 
} from "@shared/schema";

// Scheduler API Routes (add to registerRoutes function)

// Create shift with competency requirements
app.post("/api/scheduler/shifts", async (req, res) => {
  try {
    const { shift, requirements = [] } = req.body;
    
    // Validate shift data
    const validatedShift = insertShiftSchema.parse(shift);
    
    // Validate requirements
    const validatedRequirements = requirements.map((req: any) => 
      insertShiftRequirementSchema.parse(req)
    );
    
    const newShift = await schedulerService.createShift(validatedShift, validatedRequirements);
    res.json(newShift);
  } catch (error) {
    console.error("Error creating shift:", error);
    if (error instanceof ZodError) {
      return res.status(400).json({ error: fromZodError(error).toString() });
    }
    res.status(500).json({ error: "Failed to create shift" });
  }
});

// Get shifts by location with filtering
app.get("/api/scheduler/shifts/location/:locationId", async (req, res) => {
  try {
    const locationId = parseInt(req.params.locationId);
    if (isNaN(locationId)) {
      return res.status(400).json({ error: "Invalid location ID" });
    }
    
    // Parse query parameters
    const { startDate, endDate, status } = req.query;
    
    let dateRange: { start: Date; end: Date } | undefined;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }
    
    const statusFilter = status ? (status as string).split(',') : undefined;
    
    const shifts = await schedulerService.getShiftsByLocation(
      locationId, 
      dateRange, 
      statusFilter
    );
    
    res.json(shifts);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({ error: "Failed to fetch shifts" });
  }
});

// Subscribe to shift
app.post("/api/scheduler/shifts/:shiftId/subscribe", async (req, res) => {
  try {
    const shiftId = parseInt(req.params.shiftId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const { interestLevel = 3, notes } = req.body;
    
    const subscription = await schedulerService.subscribeToShift(
      shiftId, 
      userId, 
      interestLevel,
      notes
    );
    
    res.json(subscription);
  } catch (error) {
    console.error("Error subscribing to shift:", error);
    res.status(500).json({ error: error.message || "Failed to subscribe to shift" });
  }
});

// Assign crew to shift (crew chief only)
app.post("/api/scheduler/shifts/:shiftId/assign", async (req, res) => {
  try {
    const shiftId = parseInt(req.params.shiftId);
    const assignedBy = req.user?.id;
    
    if (!assignedBy) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check if user has crew chief or higher permissions
    const userRole = req.user?.role;
    if (!['crew_chief', 'app_manager', 'owner', 'administrator'].includes(userRole)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    const { userId, notes } = req.body;
    
    const assignment = await schedulerService.assignCrewToShift(
      shiftId,
      userId,
      assignedBy,
      notes
    );
    
    res.json(assignment);
  } catch (error) {
    console.error("Error assigning crew to shift:", error);
    res.status(500).json({ error: error.message || "Failed to assign crew" });
  }
});

// Get eligible crew for shift
app.get("/api/scheduler/shifts/:shiftId/eligible", async (req, res) => {
  try {
    const shiftId = parseInt(req.params.shiftId);
    
    const eligibleCrew = await schedulerService.getEligibleCrew(shiftId);
    res.json(eligibleCrew);
  } catch (error) {
    console.error("Error fetching eligible crew:", error);
    res.status(500).json({ error: "Failed to fetch eligible crew" });
  }
});

// Get shift details with full compilation
app.get("/api/scheduler/shifts/:shiftId", async (req, res) => {
  try {
    const shiftId = parseInt(req.params.shiftId);
    
    const shift = await schedulerService.compileShiftDetails(shiftId);
    res.json(shift);
  } catch (error) {
    console.error("Error fetching shift details:", error);
    res.status(500).json({ error: "Failed to fetch shift details" });
  }
});
```

## Frontend Module Implementation

### Module Structure

**Create Module Directory:**
```bash
mkdir -p client/src/modules/scheduler/{components,hooks,pages,services,types}
```

### Core Types

**File:** `client/src/modules/scheduler/types/scheduler.types.ts`

```typescript
import type { 
  Shift, ShiftRequirement, ShiftSubscription, ShiftAssignment,
  User, Competency 
} from "@shared/schema";

export interface CompetencyMatch {
  userId: number;
  competencyScore: number;
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  matchedCompetencies: number;
  totalRequiredCompetencies: number;
}

export interface CompiledShift extends Shift {
  requiredCompetencies: ShiftRequirement[];
  subscriptions: ShiftSubscription[];
  assignments: ShiftAssignment[];
  eligibleCrew: CompetencyMatch[];
  richDescription?: string;
  customInstructions?: string;
}

export interface SchedulerFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string[];
  competencies?: number[];
}

export interface ShiftFormData {
  date: string;
  startTime: string;
  endTime: string;
  position?: string;
  maxSlots: number;
  subscriptionDeadline?: string;
  richDescription?: string;
  customInstructions?: string;
  requirements: {
    competencyId: number;
    minimumLevel: number;
    requiredCount: number;
    weight: number;
  }[];
}
```

### Data Management Hooks

**File:** `client/src/modules/scheduler/hooks/useSchedulerData.tsx`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CompiledShift, SchedulerFilters, ShiftFormData } from "../types/scheduler.types";

export function useShiftsByLocation(
  locationId: number, 
  filters?: SchedulerFilters
) {
  const queryParams = new URLSearchParams();
  
  if (filters?.dateRange) {
    queryParams.set('startDate', filters.dateRange.start.toISOString());
    queryParams.set('endDate', filters.dateRange.end.toISOString());
  }
  
  if (filters?.status?.length) {
    queryParams.set('status', filters.status.join(','));
  }
  
  return useQuery<CompiledShift[]>({
    queryKey: ['/api/scheduler/shifts/location', locationId, filters],
    queryFn: async () => {
      const url = `/api/scheduler/shifts/location/${locationId}?${queryParams}`;
      return await apiRequest(url);
    },
    enabled: !!locationId,
  });
}

export function useShiftDetails(shiftId: number) {
  return useQuery<CompiledShift>({
    queryKey: ['/api/scheduler/shifts', shiftId],
    enabled: !!shiftId,
  });
}

export function useEligibleCrew(shiftId: number) {
  return useQuery({
    queryKey: ['/api/scheduler/shifts', shiftId, 'eligible'],
    enabled: !!shiftId,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ShiftFormData & { locationId: number }) => {
      const { requirements, ...shiftData } = data;
      
      return await apiRequest('/api/scheduler/shifts', {
        method: 'POST',
        body: JSON.stringify({
          shift: shiftData,
          requirements
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/scheduler/shifts'] 
      });
    }
  });
}

export function useSubscribeToShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      shiftId, 
      interestLevel = 3, 
      notes 
    }: { 
      shiftId: number; 
      interestLevel?: number; 
      notes?: string; 
    }) => {
      return await apiRequest(`/api/scheduler/shifts/${shiftId}/subscribe`, {
        method: 'POST',
        body: JSON.stringify({ interestLevel, notes })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/scheduler/shifts'] 
      });
    }
  });
}

export function useAssignCrewToShift() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      shiftId, 
      userId, 
      notes 
    }: { 
      shiftId: number; 
      userId: number; 
      notes?: string; 
    }) => {
      return await apiRequest(`/api/scheduler/shifts/${shiftId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ userId, notes })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/scheduler/shifts'] 
      });
    }
  });
}
```

### Core Components

**File:** `client/src/modules/scheduler/components/ShiftCard.tsx`

```typescript
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Star } from "lucide-react";
import type { CompiledShift } from "../types/scheduler.types";
import { useAuth } from "@/modules/auth";

interface ShiftCardProps {
  shift: CompiledShift;
  onSubscribe?: () => void;
  onAssign?: () => void;
  onViewDetails?: () => void;
}

export function ShiftCard({ shift, onSubscribe, onAssign, onViewDetails }: ShiftCardProps) {
  const { user } = useAuth();
  
  const isSubscribed = shift.subscriptions.some(sub => sub.userId === user?.id);
  const isAssigned = shift.assignments.some(assignment => assignment.userId === user?.id);
  const canAssign = ['crew_chief', 'app_manager', 'owner', 'administrator'].includes(user?.role || '');
  
  const statusColor = {
    open: 'bg-green-100 text-green-800',
    filled: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  }[shift.status] || 'bg-gray-100 text-gray-800';
  
  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{shift.position || 'General Shift'}</CardTitle>
          <Badge className={statusColor}>{shift.status}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Time and Date */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(shift.date).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {shift.startTime} - {shift.endTime}
          </div>
        </div>
        
        {/* Slots */}
        <div className="flex items-center gap-1 text-sm">
          <Users className="h-4 w-4" />
          <span>{shift.assignments.length} / {shift.maxSlots} assigned</span>
        </div>
        
        {/* Competency Requirements */}
        {shift.requiredCompetencies.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Required Skills:</p>
            <div className="flex flex-wrap gap-1">
              {shift.requiredCompetencies.map((req, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  Level {req.minimumLevel}+ 
                  {req.weight !== 1 && (
                    <Star className="h-3 w-3 ml-1 inline" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Subscription Status */}
        {isSubscribed && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Subscribed
          </Badge>
        )}
        
        {isAssigned && (
          <Badge className="bg-green-500 text-white">
            Assigned
          </Badge>
        )}
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              View Details
            </Button>
          )}
          
          {/* Crew member subscription */}
          {user?.role === 'crew_member' && !isAssigned && shift.status === 'open' && (
            <Button 
              size="sm" 
              variant={isSubscribed ? "outline" : "default"}
              onClick={onSubscribe}
            >
              {isSubscribed ? 'Update Interest' : 'Subscribe'}
            </Button>
          )}
          
          {/* Crew chief assignment */}
          {canAssign && shift.status === 'open' && onAssign && (
            <Button size="sm" onClick={onAssign}>
              Assign Crew
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Main Scheduler Page

**File:** `client/src/modules/scheduler/pages/SchedulerPage.tsx`

```typescript
import React, { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocationContext } from "@/contexts/location-context";
import { useAuth } from "@/modules/auth";
import { ShiftCard } from "../components/ShiftCard";
import { useShiftsByLocation } from "../hooks/useSchedulerData";
import type { SchedulerFilters } from "../types/scheduler.types";

export function SchedulerPage() {
  const [, navigate] = useLocation();
  const { selectedLocation } = useLocationContext();
  const { user } = useAuth();
  const [filters, setFilters] = useState<SchedulerFilters>({
    dateRange: {
      start: new Date(),
      end: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // 3 weeks ahead
    },
    status: ['open']
  });
  
  const { data: shifts, isLoading } = useShiftsByLocation(
    selectedLocation?.id || 0,
    filters
  );
  
  const canCreateShifts = ['app_manager', 'owner', 'administrator'].includes(user?.role || '');
  
  if (!selectedLocation) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="text-center py-10">
            <p>Please select a location to view scheduling.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Scheduler</h1>
          <p className="text-gray-600">{selectedLocation.name}</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          
          {canCreateShifts && (
            <Button onClick={() => navigate('/scheduler/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Shift
            </Button>
          )}
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shifts?.filter(s => s.status === 'open').length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">My Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shifts?.filter(s => 
                s.subscriptions.some(sub => sub.userId === user?.id)
              ).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">My Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shifts?.filter(s => 
                s.assignments.some(assignment => assignment.userId === user?.id)
              ).length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shifts?.reduce((total, shift) => {
                const start = parseInt(shift.startTime.split(':')[0]);
                const end = parseInt(shift.endTime.split(':')[0]);
                return total + (end - start);
              }, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Shifts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts?.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onViewDetails={() => navigate(`/scheduler/shifts/${shift.id}`)}
              onSubscribe={() => {/* TODO: Open subscription modal */}}
              onAssign={() => {/* TODO: Open assignment modal */}}
            />
          ))}
        </div>
      )}
      
      {shifts?.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-10">
            <p className="text-gray-600">No shifts found for the selected criteria.</p>
            {canCreateShifts && (
              <Button className="mt-4" onClick={() => navigate('/scheduler/create')}>
                Create First Shift
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## Migration Strategy

### Phase 1: Database Foundation (Week 1)
1. **Schema Migration**: Update shifts table, add new scheduler tables
2. **Service Layer**: Implement SchedulerService class
3. **API Endpoints**: Add core scheduler API routes
4. **Testing**: Validate database operations and API responses

### Phase 2: Core UI Components (Week 2)
1. **Module Structure**: Create scheduler module directories
2. **Data Hooks**: Implement useSchedulerData hooks
3. **Basic Components**: ShiftCard, CompetencyBadge, basic forms
4. **Integration**: Connect with location context and auth

### Phase 3: Competency Workflow (Week 3)
1. **Competency Matching**: Implement scoring algorithm
2. **Subscription UI**: Crew member subscription interface
3. **Assignment UI**: Crew chief assignment workflow
4. **Notifications**: Integration with existing toast system

### Phase 4: Advanced Features (Week 4)
1. **Rich Content**: MongoDB integration for shift descriptions
2. **Bulk Operations**: Template-based shift generation
3. **Analytics**: Scheduling metrics and reports
4. **Mobile Optimization**: Responsive design improvements

## Testing Strategy

### Unit Tests
```typescript
// Example test for competency matching
describe('SchedulerService', () => {
  describe('calculateCompetencyMatch', () => {
    it('should return 100% score when user exceeds all requirements', async () => {
      // Test implementation
    });
    
    it('should return 0% score when user meets no requirements', async () => {
      // Test implementation
    });
    
    it('should calculate weighted scores correctly', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests
- API endpoint validation with actual database
- Service layer data compilation
- Frontend component integration with real data

### Performance Tests
- Competency calculation performance with large datasets
- Database query optimization validation
- Cache effectiveness monitoring

## Deployment Checklist

### Production Readiness
- [ ] Database migrations tested and validated
- [ ] API endpoints secured with proper authentication
- [ ] Service layer error handling comprehensive
- [ ] Frontend components responsive and accessible
- [ ] Performance benchmarks met
- [ ] Documentation updated

### Monitoring
- [ ] Database query performance tracking
- [ ] API response time monitoring
- [ ] Cache hit ratio measurements
- [ ] User engagement analytics

This implementation guide provides the concrete foundation for developing the CrewPlots Scheduler with unlimited creation capabilities, competency-based matching, and subscription workflows that leverage the existing proven architecture.