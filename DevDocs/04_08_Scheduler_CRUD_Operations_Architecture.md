# DevDoc 04_08 - Scheduler CRUD Operations Architecture

**Document Version:** 1.0  
**Created:** July 20, 2025  
**Last Updated:** July 20, 2025  
**Author:** ValidationEngine30 Integration Team  

## Overview

This document provides comprehensive documentation of the CrewPlots Pro scheduler system's CRUD operations, detailing the complete data flow from frontend components through ValidationEngine30, package registry, business rules validation, to database persistence. The scheduler implements a sophisticated Russian Doll architecture where Schedule Blocks contain Week Schedules, which contain Shifts.

## Architecture Foundation

### Core Components
- **Frontend**: React components with TanStack Query
- **ValidationEngine30**: Unified validation framework with 5-thread architecture
- **Package Registry**: Centralized validation package management
- **Business Rules**: Domain-specific validation logic
- **Database Layer**: PostgreSQL with Drizzle ORM
- **Permission System**: Role-based access control with workflow permissions

### Data Model Hierarchy (Russian Doll)
```
Schedule Block (Parent)
├── Week Schedule 1
│   ├── Shift 1
│   ├── Shift 2
│   └── Shift N
├── Week Schedule 2
│   └── Shifts...
└── Week Schedule N
```

### ValidationEngine30 Five-Thread Architecture
1. **Data Assembly Thread**: Package-specific data preparation
2. **Schema Validation Thread**: Zod schema validation
3. **Permission Validation Thread**: Role-based access control
4. **Business Rules Thread**: Domain-specific validation
5. **Database Transaction Thread**: Atomic CRUD execution

---

## CREATE Operations

### Schedule Block Creation

**Frontend Component**: `SchedulerCreatePage.tsx`

**API Endpoint**: `POST /api/validation/v3/execute`

**Request Flow**:
```typescript
// Frontend Request
const createScheduleBlock = {
  operation: "create",
  entityType: "scheduleBlock",
  data: {
    name: "Summer Festival Schedule",
    description: "Main festival scheduling template",
    location_id: 1,
    isActive: true
  }
}
```

**ValidationEngine30 Processing**:

1. **Data Assembly Thread**
   ```typescript
   // scheduleBlockPackage.assemblePackage()
   const assembledData = {
     ...rawData,
     metadata: {
       operation: "create",
       timestamp: new Date().toISOString(),
       requestId: generateRequestId(),
       userId: context.user.id,
       userRole: context.user.role
     },
     user: context.user
   };
   ```

2. **Schema Validation Thread**
   ```typescript
   // Using insertScheduleBlockSchema from @shared/schema
   const validationResult = insertScheduleBlockSchema.safeParse(assembledData);
   ```

3. **Permission Validation Thread**
   ```typescript
   // Required permissions: ['schedule.read', 'schedule.create']
   const hasPermissions = requiredPermissions.every(perm => 
     context.user.permissions.includes(perm)
   );
   ```

4. **Business Rules Thread**
   ```typescript
   // scheduleBlockPackage.validateBusinessRules()
   const businessRules = [
     validateLocationAccess(data.location_id, context.user),
     validateScheduleBlockUniqueness(data.name, data.location_id),
     validateUserCreationPermissions(context.user)
   ];
   ```

5. **Database Transaction Thread**
   ```typescript
   // Generic CRUD execution
   const result = await storage.createScheduleBlock({
     name: data.name,
     description: data.description,
     location_id: data.location_id,
     isActive: data.isActive,
     created_by: context.user.id
   });
   ```

**Response Structure**:
```json
{
  "overall": {
    "isValid": true,
    "operation": "create",
    "entityType": "scheduleBlock"
  },
  "threads": {
    "assembly": { "status": "passed" },
    "schema": { "status": "passed" },
    "permissions": { "status": "passed" },
    "businessRules": { "status": "passed" },
    "transaction": { "status": "completed" }
  },
  "result": {
    "id": 7,
    "name": "Summer Festival Schedule",
    "created_at": "2025-07-20T22:36:20.291Z"
  }
}
```

### Week Schedule Creation

**Frontend Component**: `SchedulerEditPage.tsx` (Basic Info Tab)

**API Endpoint**: `POST /api/validation/v3/execute`

**Unique Characteristics**:
- Requires parent `scheduleBlockId` (Russian Doll constraint)
- Implements week-based scheduling logic
- Supports multiple weeks per schedule block

**Business Rules Validation**:
```typescript
const weekScheduleBusinessRules = [
  validateScheduleBlockExists(data.scheduleBlockId),
  validateWeekNumberUniqueness(data.weekNumber, data.scheduleBlockId),
  validateDateRangeLogic(data.startDate, data.endDate),
  validateUserScheduleAccess(context.user, data.scheduleBlockId)
];
```

### Shift Creation

**Frontend Component**: `SchedulerEditPage.tsx` (Schedule Tab)

**API Endpoint**: `POST /api/validation/v3/execute`

**Multi-Day Creation Logic**:
```typescript
// Frontend handles multi-day creation
const daysOfWeek = ['monday', 'tuesday', 'wednesday'];
const shiftPromises = daysOfWeek.map(day => 
  createShift({
    ...baseShiftData,
    dayOfWeek: day,
    weekScheduleId: currentWeekSchedule.id
  })
);
```

**Competency Requirements Integration**:
```typescript
const shiftData = {
  position: "Crew Manager",
  startTime: "09:00",
  endTime: "17:00",
  maxSlots: 2,
  competencyRequirements: [
    { competency_id: 1, priority_level: "required" },
    { competency_id: 3, priority_level: "preferred" }
  ]
};
```

---

## READ Operations

### Schedule Block Listing

**Frontend Component**: `SchedulerListPage.tsx`

**API Endpoint**: `GET /api/validation/v3/execute`

**Request Pattern**:
```typescript
const listScheduleBlocks = {
  operation: "list",
  entityType: "scheduleBlock",
  data: {
    location_id: selectedLocationId // Optional filtering
  }
}
```

**Permission Validation**:
- Required: `['schedule.read']`
- Location filtering: `['location.access_assigned']` or `['location.access_all']`

**Business Rules for Listing**:
```typescript
const listBusinessRules = [
  validateUserLocationAccess(context.user, data.location_id),
  validateScheduleVisibilityRules(context.user.role),
  applyRoleBasedFiltering(context.user)
];
```

### Individual Schedule Retrieval

**Frontend Component**: `SchedulerEditPage.tsx`

**Cascaded Data Assembly**:
```typescript
// Single request retrieves full hierarchy
const scheduleBlockData = {
  operation: "read",
  entityType: "scheduleBlock",
  entityId: scheduleId,
  data: { 
    includeWeekSchedules: true,
    includeShifts: true 
  }
}
```

**Russian Doll Data Structure**:
```json
{
  "scheduleBlock": {
    "id": 2,
    "name": "Festival Main Schedule",
    "weekSchedules": [
      {
        "id": 5,
        "weekNumber": 1,
        "shifts": [
          {
            "id": 15,
            "position": "Crew Manager",
            "dayOfWeek": "friday",
            "competencyRequirements": [...]
          }
        ]
      }
    ]
  }
}
```

### Timeline Calendar Data

**Frontend Component**: `WeeklyCalendarPreview.tsx`

**Optimized Query Pattern**:
```typescript
// Fetches shifts with position and timing data
const calendarData = {
  operation: "list",
  entityType: "shift",
  data: {
    weekScheduleId: currentWeekSchedule.id,
    includeCompetencies: false // Performance optimization
  }
}
```

---

## UPDATE Operations

### Schedule Block Updates

**Frontend Component**: `SchedulerEditPage.tsx` (Basic Info Tab)

**Auto-Save Integration**:
```typescript
// useAutoSave hook triggers updates
const updateScheduleBlock = {
  operation: "update",
  entityType: "scheduleBlock",
  entityId: scheduleId,
  data: {
    name: formData.name,
    description: formData.description,
    isActive: formData.isActive
  }
}
```

**Activation Toggle Logic**:
```typescript
// Special business rule for activation changes
const activationBusinessRules = [
  validateDeactivationImpact(scheduleId, newActiveState),
  validateActiveScheduleLimits(location_id, context.user),
  checkDependentWeekSchedules(scheduleId)
];
```

### Shift Updates (Click-to-Edit)

**Frontend Component**: `WeeklyCalendarPreview.tsx`

**Interactive Update Flow**:
```typescript
// User clicks shift in calendar
const handleShiftClick = (shift) => {
  // Populate form with existing data
  setFormData(shift);
  
  // Switch to edit mode
  setCurrentTab('basic-info');
  
  // Prepare update operation
  setEditingShift(shift);
};
```

**Partial Update Schema**:
```typescript
// updateShiftSchema allows optional fields
const updateData = {
  operation: "update",
  entityType: "shift",
  entityId: shiftId,
  data: {
    // Only modified fields included
    startTime: "10:00", // Changed from 09:00
    maxSlots: 3        // Changed from 2
    // Other fields remain unchanged
  }
}
```

### Multi-Week Schedule Management

**Frontend Component**: `MultiWeekCalendarPreview.tsx`

**Week Addition Logic**:
```typescript
const addWeekToSchedule = {
  operation: "create",
  entityType: "weekSchedule",
  data: {
    scheduleBlockId: currentScheduleBlock.id,
    weekNumber: nextWeekNumber,
    startDate: calculateWeekStart(nextWeekNumber),
    endDate: calculateWeekEnd(nextWeekNumber)
  }
}
```

---

## DELETE Operations

### Cascade Deletion System

**Russian Doll Cascade Architecture**:
The scheduler implements intelligent cascade deletion following the hierarchical data model:

```
DELETE Schedule Block (ID: 6)
├── CASCADE: Delete Week Schedule 9 + its shifts
├── CASCADE: Delete Week Schedule 10 + its shifts
├── CASCADE: Delete Week Schedule 11 + its shifts
└── FINAL: Delete Schedule Block 6
```

### Schedule Block Deletion

**Frontend Component**: `SchedulerListPage.tsx`

**API Endpoint**: `POST /api/validation/v3/execute`

**Cascade Delete Request**:
```typescript
const deleteScheduleBlock = {
  operation: "delete",
  entityType: "scheduleBlock",
  entityId: scheduleId,
  data: { 
    id: scheduleId,
    cascadeDelete: true // Triggers Russian Doll deletion
  }
}
```

**ValidationEngine30 Cascade Processing**:

1. **Assembly Thread Enhancement**:
   ```typescript
   // scheduleBlockPackage.assemblePackage()
   const assembledData = {
     ...data,
     cascadeDelete: true, // Flag detected from request
     metadata: {
       operation: "delete",
       cascadeType: "russian_doll",
       timestamp: new Date().toISOString()
     }
   };
   ```

2. **Business Rules Validation**:
   ```typescript
   // Comprehensive deletion impact assessment
   const deletionBusinessRules = [
     validateDeletionPermissions(context.user, scheduleId),
     checkActiveDependencies(scheduleId),
     validateCascadeImpact(scheduleId),
     assessDataIntegrityRisks(scheduleId)
   ];
   ```

3. **Cascade Database Transaction**:
   ```typescript
   // executeGenericCrud() - scheduleBlock deletion
   async function cascadeDeleteScheduleBlock(scheduleId) {
     console.log(`🔥 CASCADE DELETE: Starting Russian Doll cascade deletion for schedule block: ${scheduleId}`);
     
     // Step 1: Find all week schedules
     const weekSchedules = await storage.getWeekSchedulesByScheduleBlock(scheduleId);
     console.log(`🔥 CASCADE DELETE: Found ${weekSchedules.length} week schedules to cascade delete`);
     
     // Step 2: Delete each week schedule and its shifts
     for (const weekSchedule of weekSchedules) {
       console.log(`🔥 CASCADE DELETE: Deleting week schedule ${weekSchedule.id} (including its shifts)`);
       await storage.deleteShiftsByWeekSchedule(weekSchedule.id);
       await storage.deleteWeekSchedule(weekSchedule.id);
     }
     
     // Step 3: Delete the schedule block (final step)
     console.log(`🔥 CASCADE DELETE: Deleting schedule block (final step)`);
     await storage.deleteScheduleBlock(scheduleId);
     
     console.log(`💾 CASCADE DELETE COMPLETED: Schedule block ${scheduleId} and all related data deleted`);
   }
   ```

**Deletion Success Response**:
```json
{
  "overall": {
    "isValid": true,
    "operation": "delete",
    "entityType": "scheduleBlock",
    "cascadeExecuted": true
  },
  "deletionInfo": {
    "scheduleBlockId": 6,
    "cascadedWeekSchedules": 3,
    "cascadedShifts": 12,
    "totalRecordsDeleted": 16
  },
  "threads": {
    "assembly": { "status": "passed" },
    "businessRules": { "status": "passed" },
    "transaction": { "status": "completed", "cascadeSuccess": true }
  }
}
```

### Individual Component Deletion

**Week Schedule Deletion**:
```typescript
// Deletes week schedule + its shifts (partial cascade)
const deleteWeekSchedule = {
  operation: "delete",
  entityType: "weekSchedule",
  entityId: weekScheduleId,
  data: { cascadeDelete: true }
}
```

**Shift Deletion**:
```typescript
// Simple deletion (no cascade needed)
const deleteShift = {
  operation: "delete",
  entityType: "shift",
  entityId: shiftId,
  data: { id: shiftId }
}
```

---

## Permission System Integration

### Role-Based CRUD Access

**Administrator Role**:
- Full CRUD access: `['schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete']`
- Location access: `['location.access_all']`
- Cascade deletion: Unrestricted

**Owner Role**:
- Full CRUD access for owned locations
- Location access: `['location.access_owned']`
- Cascade deletion: Limited to owned schedules

**App Manager Role**:
- Read/Update access: `['schedule.read', 'schedule.update']`
- Location access: `['location.access_managed']`
- Cascade deletion: Restricted

**Crew Roles**:
- Read-only access: `['schedule.read']`
- Location access: `['location.access_assigned']`
- No deletion permissions

### Permission Validation Flow

```typescript
// Centralized permission mapping (mapWorkflowToValidationPermissions)
const mappedPermissions = {
  inputPermissions: 49,
  uniquePermissions: 23,
  finalList: [
    'schedule.create', 'schedule.read', 'schedule.update', 'schedule.delete',
    'location.access_all', 'location.access_owned', 'location.access_managed',
    'location.access_assigned', 'message.read', 'user.read'
  ]
};

// Permission validation in ValidationEngine30
const permissionResult = requiredPermissions.every(permission => 
  context.user.permissions.includes(permission)
);
```

---

## Business Rules Engine

### Schedule Block Business Rules

```typescript
const scheduleBlockBusinessRules = [
  {
    name: "location_access",
    validate: (data, user) => validateLocationAccess(data.location_id, user),
    message: "User lacks access to specified location"
  },
  {
    name: "name_uniqueness",
    validate: (data, user) => validateScheduleBlockUniqueness(data.name, data.location_id),
    message: "Schedule block name must be unique within location"
  },
  {
    name: "active_schedule_limits",
    validate: (data, user) => validateActiveScheduleLimits(data.location_id),
    message: "Maximum active schedules exceeded for location"
  }
];
```

### Week Schedule Business Rules

```typescript
const weekScheduleBusinessRules = [
  {
    name: "parent_schedule_exists",
    validate: (data) => validateScheduleBlockExists(data.scheduleBlockId),
    message: "Parent schedule block must exist"
  },
  {
    name: "week_number_sequence",
    validate: (data) => validateWeekNumberSequence(data.weekNumber, data.scheduleBlockId),
    message: "Week numbers must follow logical sequence"
  },
  {
    name: "date_range_logic",
    validate: (data) => validateDateRangeLogic(data.startDate, data.endDate),
    message: "End date must be after start date"
  }
];
```

### Shift Business Rules

```typescript
const shiftBusinessRules = [
  {
    name: "time_logic",
    validate: (data) => validateTimeLogic(data.startTime, data.endTime),
    message: "End time must be after start time"
  },
  {
    name: "competency_requirements",
    validate: (data) => validateCompetencyRequirements(data.competencyRequirements),
    message: "Competency requirements must be valid and accessible"
  },
  {
    name: "shift_overlap",
    validate: (data) => validateShiftOverlap(data, data.weekScheduleId),
    message: "Shifts cannot overlap within same time period"
  }
];
```

---

## Performance Optimization

### Caching Strategy

**React Query Configuration**:
```typescript
// Scheduler data caching
const schedulerQueryConfig = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: true
};
```

**Cache Invalidation Patterns**:
```typescript
// After successful CRUD operations
queryClient.invalidateQueries(['api', 'validation', 'v3', 'execute']);
queryClient.invalidateQueries(['api', 'scheduler', 'schedule-blocks']);
queryClient.invalidateQueries(['api', 'scheduler', 'week-schedules']);
```

### Individual Fetch Pattern

**Session Isolation Prevention**:
```typescript
// Sequential queries prevent session conflicts
const { data: scheduleBlocks } = useQuery({
  queryKey: ['scheduleBlocks', locationId],
  queryFn: () => fetchScheduleBlocks(locationId),
  staleTime: 2 * 60 * 1000
});

const { data: locations } = useQuery({
  queryKey: ['locations'],
  queryFn: () => fetchLocations(),
  staleTime: 10 * 60 * 1000,
  enabled: !!scheduleBlocks // Sequential dependency
});
```

---

## Error Handling

### ValidationEngine30 Error Structure

```json
{
  "overall": {
    "isValid": false,
    "operation": "create",
    "entityType": "scheduleBlock"
  },
  "threads": {
    "assembly": { "status": "passed" },
    "schema": { 
      "status": "failed",
      "errors": ["name is required", "location_id must be a number"]
    },
    "permissions": { "status": "passed" },
    "businessRules": { 
      "status": "failed",
      "errors": ["User lacks access to specified location"]
    },
    "transaction": { "status": "skipped" }
  },
  "error": "Validation failed",
  "details": "Schema and business rule validation errors"
}
```

### Frontend Error Handling

```typescript
// Mutation error handling
const createScheduleMutation = useMutation({
  mutationFn: createScheduleBlock,
  onError: (error) => {
    console.error('Schedule creation failed:', error);
    toast({
      title: "Creation Failed",
      description: error.message || "Unable to create schedule block",
      variant: "destructive"
    });
  },
  onSuccess: (data) => {
    if (!data.overall.isValid) {
      // Handle validation errors
      const errorMessages = [
        ...data.threads.schema?.errors || [],
        ...data.threads.businessRules?.errors || []
      ];
      toast({
        title: "Validation Failed",
        description: errorMessages.join(", "),
        variant: "destructive"
      });
    } else {
      // Success handling
      queryClient.invalidateQueries(['scheduleBlocks']);
      toast({
        title: "Success",
        description: "Schedule block created successfully"
      });
    }
  }
});
```

---

## Future Enhancements

### Planned Improvements

1. **Bulk Operations**: Multi-select deletion with batch processing
2. **Template System**: Reusable schedule templates with inheritance
3. **Conflict Detection**: Advanced shift overlap and resource conflict detection
4. **Audit Trail**: Complete change history with rollback capabilities
5. **Real-time Updates**: WebSocket integration for live schedule updates

### Performance Enhancements

1. **Lazy Loading**: Progressive data loading for large schedules
2. **Virtual Scrolling**: Efficient rendering of extensive shift lists
3. **Optimistic Updates**: Immediate UI feedback with rollback on errors
4. **Background Sync**: Offline capability with conflict resolution

---

## Conclusion

The CrewPlots Pro scheduler CRUD architecture demonstrates sophisticated integration between frontend React components, ValidationEngine30 validation framework, and PostgreSQL database persistence. The Russian Doll cascade deletion system ensures data integrity while providing powerful hierarchical schedule management capabilities.

Key architectural strengths:
- **Unified Validation**: Single ValidationEngine30 handles all CRUD operations
- **Permission Integration**: Role-based access control throughout CRUD lifecycle
- **Business Rules**: Domain-specific validation ensuring data quality
- **Cascade Management**: Intelligent hierarchical deletion with referential integrity
- **Performance Optimization**: Caching and session isolation prevention

This architecture provides a robust foundation for complex production scheduling workflows while maintaining code maintainability and system reliability.

---

**Technical References:**
- ValidationEngine30 Core: `server/services/validation/ValidationEngine30.ts`
- Package Registry: `server/services/validation/packageRegistry30.ts`
- Schedule Packages: `server/modules/scheduler/validation/`
- Frontend Components: `client/src/modules/scheduler/`
- Database Schema: `shared/schema.ts`