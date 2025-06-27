# Scheduler Module Migration Plan
## URL-Based Edit Mode Implementation

### Overview
Migrate the current standalone `/shift-creation` page to a fully modular scheduler system with URL-based state management, following established modular architecture patterns from auth, locations, and users modules.

### Current State Analysis
- **Existing**: `/shift-creation` route uses standalone `client/src/pages/shift-creation.tsx`
- **Available**: Complete scheduler module in `client/src/modules/scheduler/` (previously built but not integrated)
- **Challenge**: Form state synchronization issues when returning to edit mode
- **Solution**: URL-based routing with separate create/edit contexts

### URL Structure (Following Locations Pattern)
```
/scheduler                    → Week schedule list/selector page
/scheduler/new               → Create new week schedule
/scheduler/edit/:scheduleId  → Edit existing week schedule + add shifts
```

### Migration Phases

#### Phase 1: Module Integration Preparation
- [ ] Review existing scheduler module components for compliance with current patterns
- [ ] Update scheduler module exports to match established module structure
- [ ] Verify scheduler hooks follow the data/permissions/actions pattern
- [ ] Test scheduler module components in isolation

#### Phase 2: Route Migration and Creation
- [ ] Add new scheduler routes to `client/src/App.tsx`:
  - `/scheduler` → Schedule selection/list page
  - `/scheduler/new` → Create new schedule form
  - `/scheduler/edit/:scheduleId` → Edit schedule + shift management
- [ ] Update navigation configuration in `shared/navigation/config/workflow-sections.ts`
- [ ] Preserve existing permission requirements (`["owner", "app_manager", "administrator"]`)

#### Phase 3: Page Component Development
- [ ] Create `SchedulerListPage` component for schedule selection
- [ ] Create `SchedulerCreatePage` component for new schedule creation
- [ ] Create `SchedulerEditPage` component for schedule editing + shift management
- [ ] Implement URL parameter handling for `:scheduleId` in edit mode
- [ ] Add proper error handling for invalid schedule IDs

#### Phase 4: Component Integration
- [ ] Integrate existing `WeekScheduleEditor` component into create/edit pages
- [ ] Integrate existing `ShiftCreationPanel` component into edit page
- [ ] Integrate existing `WeeklyCalendarPreview` component into edit page
- [ ] Ensure all components use the scheduler module hooks correctly

#### Phase 5: State Management Implementation
- [ ] Implement URL-based state management (no local form state synchronization)
- [ ] Use React Query cache invalidation patterns from existing modules
- [ ] Implement the "individual fetch pattern" for session isolation prevention
- [ ] Add proper loading states and error boundaries

#### Phase 6: Navigation and UX Implementation
- [ ] Convert "+ Create New Week Schedule" dropdown to navigation button
- [ ] Implement "Back to Schedule Selection" as proper route navigation
- [ ] Ensure browser back/forward navigation works correctly
- [ ] Add breadcrumb navigation following app patterns

#### Phase 7: Legacy Cleanup and Testing
- [ ] Remove old `/shift-creation` route from App.tsx
- [ ] Move `client/src/pages/shift-creation.tsx` to backup location
- [ ] Update all internal links to use new scheduler routes
- [ ] Test complete create/edit/navigate workflow
- [ ] Verify permission-based access control

#### Phase 8: Documentation and Integration
- [ ] Update `replit.md` with new scheduler module architecture
- [ ] Document URL structure and routing patterns
- [ ] Add module completion to changelog
- [ ] Test integration with existing modular navigation system

### Technical Implementation Details

#### URL Parameter Handling
```typescript
// In SchedulerEditPage
const { scheduleId } = useParams<{ scheduleId: string }>();
const { data: schedule, isLoading } = useWeekSchedule(parseInt(scheduleId));
```

#### Navigation Patterns
```typescript
// Create button navigation
const navigate = useLocation()[1];
navigate('/scheduler/new');

// Edit selection navigation  
navigate(`/scheduler/edit/${schedule.id}`);

// Back navigation
navigate('/scheduler');
```

#### Form Initialization
```typescript
// Edit page form initialization
useEffect(() => {
  if (schedule) {
    form.reset({
      name: schedule.name,
      description: schedule.description,
      locationId: schedule.locationId,
      isActive: schedule.isActive
    });
  }
}, [schedule]);
```

### Benefits of This Approach
- **URL as source of truth**: Eliminates state synchronization issues
- **Browser-native navigation**: Back/forward buttons work correctly
- **Modular architecture compliance**: Follows established patterns
- **Cache-friendly**: React Query can properly cache by schedule ID
- **User-friendly**: Standard web application navigation patterns

### Success Criteria
- [ ] Create new week schedule workflow functions correctly
- [ ] Edit existing week schedule pre-fills form with current data
- [ ] Shift creation within edit context works properly
- [ ] "Back to Schedule Selection" preserves edit context via URL
- [ ] Browser navigation (back/forward) works as expected
- [ ] All existing permissions and security controls maintained