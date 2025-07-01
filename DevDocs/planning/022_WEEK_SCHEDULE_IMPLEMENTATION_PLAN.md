# Week-Schedule-with-Shifts Creation Tool - Implementation Plan

**Document Version:** 1.0  
**Created:** June 26, 2025  
**Target Users:** Administrators, Owners, App Managers  
**Parent Document:** SCHEDULER_FRONTEND_SHIFT_CREATION_PLAN.md

## Executive Summary

This plan details the complete implementation of a week-schedule creation tool that allows users to create reusable week-schedule templates containing multiple shifts. The tool features a calendar preview card showing the week being built and uses weekday dropdowns instead of specific dates for shift creation.

## Core Concept

- **Week-Schedule:** Reusable template containing multiple shifts for a standard work week
- **Shifts within Week-Schedule:** Individual work periods with weekday selection (Monday-Sunday)
- **Calendar Preview:** Visual representation showing how the week-schedule looks
- **Unlimited Creation:** Competitive advantage through flexible template creation

## Current State Analysis

### What Exists
- Shift creation page at `/shift-creation` with basic form structure
- Permission system with scheduler_development access working
- Database schema with shift_requirements, shift_subscriptions, shift_assignments tables
- Location and competency integration
- Form validation with Zod schemas

### What Needs Implementation
1. **Database Schema Changes**
2. **Backend API Endpoints**
3. **Frontend Component Architecture**
4. **Page Structure Redesign**
5. **Calendar Preview Component**

## Implementation Phase Plan

### Phase 1: Database Schema Enhancement

**New Tables Required:**
```sql
-- Week schedule templates
CREATE TABLE week_schedules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location_id INTEGER REFERENCES locations(id),
  created_by INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Link shifts to week schedules
ALTER TABLE shifts ADD COLUMN week_schedule_id INTEGER REFERENCES week_schedules(id);
ALTER TABLE shifts ADD COLUMN day_of_week VARCHAR(10) CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'));
```

**Schema Updates:**
- Modify shifts table to include week_schedule_id and day_of_week
- Update shift_requirements to link to shifts within week-schedules
- Ensure existing competency and location relationships remain intact

### Phase 2: Session Consolidation Layer (Critical for Authentication Stability)

**Problem:** Current shift-creation page makes multiple simultaneous frontend requests that trigger session isolation in browser contexts, causing authentication failures.

**Solution:** Implement a Session Consolidation Layer similar to Profile Fetcher Service.

#### 2A: Scheduler Data Fetcher Service

**File:** `server/services/scheduler-data-fetcher-service.ts`

```typescript
export interface ShiftCreationData {
  weekSchedules: WeekSchedule[];
  locations: Location[];
  competencies: Competency[];
  userPermissions: string[];
  authenticatedUser: User;
}

export class SchedulerDataFetcherService {
  private cacheKeyPrefix = 'scheduler';
  private cacheTTL = 1800; // 30 minutes

  async getShiftCreationData(userId: number, locationId?: number): Promise<ShiftCreationData> {
    const cacheKey = `${this.cacheKeyPrefix}:${userId}:creation-data:${locationId || 'all'}`;
    
    // Try Redis cache first
    const cachedData = await hybridCacheService.get<ShiftCreationData>(cacheKey, {
      category: 'scheduler-data',
      connectionId: `scheduler-${userId}`,
      ttl: this.cacheTTL
    });

    if (cachedData) {
      return cachedData;
    }

    // Fetch fresh data in parallel
    const [weekSchedules, locations, competencies, user] = await Promise.all([
      storage.getWeekSchedules(locationId),
      storage.getLocations(),
      storage.getCompetencies(locationId),
      storage.getUserById(userId)
    ]);

    const shiftCreationData: ShiftCreationData = {
      weekSchedules,
      locations,
      competencies,
      userPermissions: user?.permissions || [],
      authenticatedUser: user
    };

    // Cache the result
    await hybridCacheService.set(cacheKey, shiftCreationData, {
      ttl: this.cacheTTL,
      category: 'scheduler-data',
      connectionId: `scheduler-${userId}`
    });

    return shiftCreationData;
  }
}
```

#### 2B: Consolidated API Endpoint

**New Endpoint:** `GET /api/scheduler/creation-data`

**Purpose:** Single authenticated request that consolidates all data needed for shift-creation page.

**Response:** Combined data object eliminating need for multiple frontend requests.

### Phase 2C: Backend API Development

**Required Endpoints:**

1. **Session Consolidation (Priority 1)**
   - `GET /api/scheduler/creation-data` - **Consolidated data fetcher** (prevents session isolation)
   - `GET /api/scheduler/creation-data?locationId=5` - Location-filtered version

2. **Week Schedule Management**
   - `GET /api/week-schedules` - List all week-schedule templates  
   - `POST /api/week-schedules` - Create new week-schedule template
   - `GET /api/week-schedules/:id` - Get specific week-schedule with shifts
   - `PUT /api/week-schedules/:id` - Update week-schedule template
   - `DELETE /api/week-schedules/:id` - Delete week-schedule template

3. **Shifts within Week-Schedule**
   - `POST /api/week-schedules/:id/shifts` - Add shift to week-schedule
   - `PUT /api/week-schedules/:scheduleId/shifts/:shiftId` - Update shift
   - `DELETE /api/week-schedules/:scheduleId/shifts/:shiftId` - Remove shift

4. **Template Operations**
   - `POST /api/week-schedules/:id/duplicate` - Duplicate week-schedule
   - `GET /api/week-schedules/templates` - Get template library

### Phase 3: Frontend Session Consolidation Integration

**Critical Change:** Replace multiple useQuery calls with single consolidated data fetch.

#### 3A: Frontend Hook - useShiftCreationData

**File:** `client/src/modules/scheduler/hooks/useShiftCreationData.tsx`

```typescript
export function useShiftCreationData(locationId?: number) {
  return useQuery({
    queryKey: ['/api/scheduler/creation-data', locationId],
    queryFn: async () => {
      const url = locationId 
        ? `/api/scheduler/creation-data?locationId=${locationId}`
        : '/api/scheduler/creation-data';
      
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch creation data');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // 30 minutes
  });
}
```

#### 3B: Page Structure Redesign

**Current Issue:** Multiple useQuery calls causing session isolation:
- `useQuery(['/api/auth/me'])` (auth context)
- `useQuery(['/api/week-schedules'])` (dropdown)  
- `useQuery(['/api/locations'])` (location data)

**Solution:** Single consolidated data fetch in page component:

```typescript
// shift-creation.tsx - Replace multiple queries
const { data: creationData, isLoading, error } = useShiftCreationData(selectedLocationId);

// Extract data from consolidated response
const weekSchedules = creationData?.weekSchedules || [];
const locations = creationData?.locations || [];
const competencies = creationData?.competencies || [];
const userPermissions = creationData?.userPermissions || [];
const authenticatedUser = creationData?.authenticatedUser;
```

**Eliminates:**
- Separate auth context call during component mount
- Independent week-schedules dropdown fetch
- Separate locations API call
- Permission checking through multiple requests

### Phase 3C: Frontend Component Architecture

**Page Structure: `/shift-creation` (Modified Current Page)**

```
ShiftCreationPage.tsx (UPDATED)
├── Single useShiftCreationData() call (replaces multiple queries)
├── WeekScheduleHeader (title, save actions)
├── WeekScheduleForm (name, description, location)
├── ShiftManagementPanel
│   ├── ShiftCreationForm (with weekday dropdown)
│   └── ShiftsList (existing shifts in week-schedule)
└── CalendarPreviewCard (visual week representation)
```

**Key Components to Build:**

1. **WeekScheduleForm.tsx**
   - Week-schedule name and description
   - Location selection
   - Save as template option
   - Form validation with Zod

2. **ShiftCreationForm.tsx** (Modified from current)
   - Replace date picker with weekday dropdown
   - Keep time selection, competency requirements
   - Add to current week-schedule instead of standalone creation

3. **CalendarPreviewCard.tsx**
   - 7-day week view (Monday-Sunday)
   - Show shifts with times and roles
   - Visual feedback for conflicts
   - Click to edit shifts

4. **WeekDatePicker.tsx** (For calendar preview)
   - Select which week to preview
   - Default to current week
   - Show actual dates in preview

### Phase 4: Current Page Modifications

**Changes to shift-creation.tsx:**

1. **Form Schema Update**
```typescript
const weekScheduleSchema = z.object({
  name: z.string().min(1, 'Week schedule name is required'),
  description: z.string().optional(),
  locationId: z.number().min(1, 'Location is required'),
  shifts: z.array(z.object({
    title: z.string().min(1, 'Shift title is required'),
    dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    competencyRequirements: z.array(/* competency schema */).default([])
  })).default([])
});
```

2. **Replace Date Field with Weekday Dropdown**
```typescript
<FormField
  control={form.control}
  name="dayOfWeek"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Day of Week</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select day" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="monday">Monday</SelectItem>
          <SelectItem value="tuesday">Tuesday</SelectItem>
          <SelectItem value="wednesday">Wednesday</SelectItem>
          <SelectItem value="thursday">Thursday</SelectItem>
          <SelectItem value="friday">Friday</SelectItem>
          <SelectItem value="saturday">Saturday</SelectItem>
          <SelectItem value="sunday">Sunday</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

3. **Add Calendar Preview Below Form**
   - Display week-schedule being built
   - Show shifts with actual times
   - Update in real-time as shifts are added

### Phase 5: Calendar Preview Implementation

**CalendarPreviewCard.tsx Structure:**
```typescript
interface CalendarPreviewProps {
  weekSchedule: WeekSchedule;
  selectedWeek?: Date; // For showing actual dates
  onShiftClick?: (shift: Shift) => void;
  onTimeSlotClick?: (day: string, timeSlot: string) => void;
}
```

**Features:**
- 7-column layout (Monday-Sunday)
- Time slots from 6 AM to 2 AM
- Color-coded shifts by role/competency
- Conflict detection visualization
- Responsive design for mobile

### Phase 6: Navigation Integration

**Update shared/navigation/config/workflow-sections.ts:**
```typescript
{
  id: 'week-schedule-creation',
  label: 'Create Week Schedule',
  icon: Calendar,
  href: '/scheduling/create-week-schedule',
  permissions: ['scheduler_development.write']
}
```

**Update App.tsx routing:**
```typescript
<Route path="/scheduling/create-week-schedule" component={CreateWeekSchedulePage} />
```

## Technical Considerations

### State Management
- Use React useState for week-schedule being built
- TanStack Query for server state management
- Form state with react-hook-form

### Data Flow
1. User creates week-schedule template (name, location, description)
2. User adds shifts one by one using weekday dropdown
3. Calendar preview updates in real-time
4. Save entire week-schedule as template to database
5. Week-schedule becomes reusable template

### Error Handling
- Form validation for required fields
- Conflict detection (overlapping shifts same day)
- Network error handling for API calls
- Permission-based access control

### Mobile Considerations
- Responsive calendar preview
- Collapsible shift creation form
- Touch-friendly weekday selection

## Success Criteria

1. **Functional Requirements Met**
   - Create week-schedule templates with multiple shifts
   - Weekday dropdown instead of date picker
   - Calendar preview showing week being built
   - Save and reuse templates

2. **User Experience**
   - Intuitive week-schedule creation flow
   - Visual feedback through calendar preview
   - Clear error messages and validation
   - Mobile-responsive design

3. **Technical Quality**
   - Type-safe database operations
   - Proper error handling
   - Performance optimized queries
   - Clean component architecture

## Implementation Priority

1. **Phase 1 & 2** (Database + API) - Foundation
2. **Phase 4** (Modify current page) - Quick wins
3. **Phase 3 & 5** (New components) - Core functionality
4. **Phase 6** (Navigation) - Integration

## Risk Mitigation

- **Database Migration:** Use reversible migrations
- **Breaking Changes:** Maintain backward compatibility with existing shifts
- **Performance:** Index week_schedule_id and day_of_week columns
- **User Data:** Backup before schema changes

## Next Steps

1. Confirm this plan meets requirements
2. Begin with Phase 1 (Database schema)
3. Implement incrementally with testing at each phase
4. User feedback after core functionality complete