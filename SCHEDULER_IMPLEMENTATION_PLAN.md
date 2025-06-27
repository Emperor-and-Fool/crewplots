# Scheduler Implementation Plan

## Executive Summary

This plan outlines the complete implementation of the CrewPlots scheduler system, incorporating lessons learned from successful session management patterns in the crew profile page. The approach combines immediate fixes using proven individual fetch() patterns with long-term architectural improvements through session consolidation.

## Current Status

### Completed Components
- ✅ Database schema (shift_requirements, shift_subscriptions, shift_assignments, scheduling_windows)
- ✅ Backend API endpoints and storage methods
- ✅ Frontend shift creation page with tabbed interface
- ✅ Permission system (scheduler_development.read/.write/.execute)
- ✅ Session consolidation backend module

### Critical Issues Identified
- ❌ Session isolation causing authentication failures on shift-creation page
- ❌ Week schedule dropdown not populating due to parallel query conflicts
- ❌ Form validation errors (weekScheduleId receiving NaN)

## Implementation Strategy

### Phase 1: Immediate Fixes (Individual Fetch Pattern)
**Timeline:** 1-2 days  
**Goal:** Make shift-creation page functional using proven patterns

#### 1.1 Query Pattern Refactoring
Replace current parallel queries with sequential individual fetch() calls:

```typescript
// Current problematic pattern (parallel queries)
const { data: locations } = useQuery({ queryKey: ['/api/locations'] });
const { data: competencies } = useQuery({ queryKey: ['/api/competencies'] });
const { data: weekSchedules } = useQuery({ queryKey: ['/api/week-schedules'] });

// New pattern (proven from CrewMemberProfile)
const { data: locations = [] } = useQuery({
  queryKey: ['/api/locations'],
  queryFn: async () => {
    const response = await fetch('/api/locations');
    if (!response.ok) throw new Error('Failed to fetch locations');
    return response.json();
  },
  enabled: permissions.canCreateShifts,
  staleTime: 10 * 60 * 1000, // 10 minutes cache
  cacheTime: 60 * 60 * 1000, // 1 hour in memory
});
```

#### 1.2 Sequential Data Loading
Implement proper dependency chain:
1. First: Load locations and competencies (parallel safe)
2. Second: Load week schedules (enabled after auth confirmed)
3. Third: Load schedule-specific data (enabled after schedule selected)

#### 1.3 Form Validation Fix
Ensure weekScheduleId is properly populated:
- Add null checks before form submission
- Validate selected schedule state
- Provide clear error messages for missing data

### Phase 2: Enhanced Scheduler Features (2-3 weeks)
**Goal:** Complete scheduler functionality with robust session management

#### 2.1 Week Schedule Management
- ✅ Week schedule creation (completed)
- 🔄 Week schedule editing and versioning
- 🔄 Schedule template library
- 🔄 Schedule duplication and sharing

#### 2.2 Shift Assignment Workflow
- 🔄 Crew availability tracking (shift_subscriptions)
- 🔄 Automatic assignment algorithm based on competencies
- 🔄 Manual assignment override interface
- 🔄 Conflict detection and resolution

#### 2.3 Calendar Integration
- 🔄 Week view calendar component
- 🔄 Drag-and-drop shift editing
- 🔄 Real-time updates and collaboration
- 🔄 Export to external calendar systems

### Phase 3: Session Consolidation Migration (1-2 weeks)
**Goal:** Implement architectural improvements for scalability

#### 3.1 Consolidation Endpoints
Migrate to single-request data loading:
- `/api/scheduler/creation-data` - All shift creation dependencies
- `/api/scheduler/week-view/{weekId}` - Complete week schedule view
- `/api/scheduler/assignment-data/{scheduleId}` - Assignment workflow data

#### 3.2 Performance Optimization
- Redis caching for complex queries
- Background data pre-loading
- Optimistic UI updates
- Real-time WebSocket integration

## Technical Architecture

### Proven Session Management Pattern
Based on successful CrewMemberProfile implementation:

```typescript
// Individual fetch() calls maintain session context
const fetchWithAuth = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
};

// Sequential loading with proper enabled conditions
const { data: baseData } = useQuery({
  queryKey: ['scheduler-base'],
  queryFn: () => fetchWithAuth('/api/locations'),
  enabled: hasPermissions,
  staleTime: 10 * 60 * 1000
});

const { data: scheduleData } = useQuery({
  queryKey: ['scheduler-schedules'],
  queryFn: () => fetchWithAuth('/api/week-schedules'),
  enabled: !!baseData && hasPermissions,
  staleTime: 5 * 60 * 1000
});
```

### Database Relationships
```sql
week_schedules (templates)
├── shifts (individual time slots)
│   ├── shift_requirements (competency needs)
│   ├── shift_subscriptions (crew interest)
│   └── shift_assignments (final assignments)
└── scheduling_windows (role-based access)
```

### Permission Hierarchy
- **administrator/owner**: Full scheduler access
- **app_manager**: Create and manage schedules
- **crew_chief**: View and assign within location
- **crew_member**: View assigned shifts only

## Risk Mitigation

### Session Isolation Prevention
1. **Use individual fetch() calls** instead of parallel queryClient requests
2. **Implement proper enabled conditions** for query dependencies
3. **Add explicit error boundaries** for authentication failures
4. **Maintain session consolidation as backup** for complex pages

### Data Integrity Safeguards
1. **Server-side validation** for all schedule operations
2. **Optimistic locking** for concurrent editing
3. **Audit trail** for schedule changes
4. **Backup and rollback** capabilities

### Performance Considerations
1. **Implement caching strategies** (Redis + browser cache)
2. **Use pagination** for large schedule lists
3. **Background processing** for complex calculations
4. **Progressive loading** for calendar views

## Success Metrics

### Immediate (Phase 1)
- ✅ Shift creation page loads without authentication errors
- ✅ Week schedule dropdown populates correctly
- ✅ Form submissions complete successfully
- ✅ No session isolation errors in logs

### Medium-term (Phase 2)
- 📊 Complete shift assignment workflow functional
- 📊 Calendar view displays schedules correctly
- 📊 Crew availability tracking operational
- 📊 Performance under 2 seconds for all operations

### Long-term (Phase 3)
- 🎯 Single-request data loading implemented
- 🎯 Real-time collaboration features active
- 🎯 Zero session-related bugs reported
- 🎯 Scheduler system ready for production deployment

## Dependencies

### External
- PostgreSQL database (configured)
- Redis cache (configured)
- Authentication system (functional)

### Internal
- User module (completed)
- Location module (completed)
- Permission system (operational)
- Navigation system (unified)

## Timeline Summary

**Week 1**: Phase 1 fixes using individual fetch() pattern  
**Weeks 2-4**: Phase 2 complete scheduler features  
**Weeks 5-6**: Phase 3 session consolidation migration  

**Total estimated completion**: 6 weeks for full scheduler system

---

*This plan prioritizes proven patterns over architectural purity, ensuring immediate functionality while building toward long-term scalability.*