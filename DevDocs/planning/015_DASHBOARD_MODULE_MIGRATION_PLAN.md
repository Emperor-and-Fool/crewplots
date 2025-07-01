# Dashboard Module Migration Plan
**Document ID:** Dashboard Module Migration Strategy  
**Created:** June 25, 2025  
**Complexity:** Medium (Cross-Module Dependencies)  
**Testing Strategy:** Multi-Phase with Cross-Module Integration  
**Risk Level:** Medium (Core UI Component)

## Migration Overview

This plan transforms the current dashboard system into a cohesive module following the proven methodology from auth, users, messaging, and location module migrations. The migration preserves all dashboard functionality, statistics display, and cross-module integrations while establishing consistent modular architecture.

### Critical Preservation Requirements

**Must Preserve:**
- Dashboard statistics display (applicants, staff, shifts, hours)
- Location-based filtering and context switching
- Role-based access control and data filtering
- Admin session management functionality
- Weekly schedule and staff overview components
- Cash management summary integration
- Cross-module integration with auth, users, locations modules

**Must NOT Break:**
- Dashboard load performance and responsiveness
- Statistics calculation accuracy
- Location context functionality
- Role-based data restrictions (crew_manager, floor_manager)
- Admin-only features (session clearing)
- Integration with existing modules
- Real-time data updates

## Current Dashboard Analysis

### Dashboard Page Structure (418 lines)
```typescript
// dashboard.tsx contains:
- Authentication & session management (lines 23, 36-79)
- Location context integration (lines 10, 33, 111-129) 
- Statistics queries (lines 84-108, 111-125)
- Role-based filtering (lines 131-146)
- Admin session clearing functionality (lines 36-79)
- Stats cards rendering (lines 148+)
- Component orchestration
```

### Dashboard Components Analysis
1. **WeeklySchedule** (`components/dashboard/weekly-schedule.tsx`) - 200+ lines
   - Shift scheduling display with time slots
   - Location-specific filtering capability
   - Table-based weekly view with popover details
   - Direct API integration with `/api/shifts`

2. **StaffOverview** (`components/dashboard/staff-overview.tsx`) - 150+ lines  
   - Staff member cards with competencies display
   - Location-based staff filtering
   - **ISSUE**: Uses legacy Staff schema instead of User module
   - Avatar display and badge system integration

3. **CashManagementSummary** (`components/dashboard/cash-management-summary.tsx`) - 100+ lines
   - Daily cash count summaries with status indicators
   - Location-specific cash data filtering
   - Integration with cash management system
   - Alert system for incomplete counts

### Cross-Module Dependencies Analysis
```typescript
// Current imports show module integration:
import { LocationHeader } from "@/modules/locations";          // ✅ Modular
import { useLocationContext } from "@/contexts/location-context"; // 🔄 Context dependency
import { ApplicantsSummary } from "@/modules/users/components/workflows"; // ✅ Modular
import { useAuth } from "@/hooks/use-auth";                    // 🔄 Should use @/modules/auth
```

**Integration Points:**
- **Auth Module**: User authentication and role-based permissions
- **Users Module**: ApplicantsSummary component integration
- **Locations Module**: LocationHeader and context integration
- **Legacy Dependencies**: Direct context usage instead of module patterns

### Performance Analysis
```typescript
// Current query structure:
const { data: shiftsStats } = useQuery({ queryKey: ['/api/shifts'] });
const { data: profileData } = useQuery({ queryKey: ['/api/profile-data'] });
const { data: userLocations } = useQuery({ queryKey: ['/api/user-locations', user?.id] });

// Performance characteristics:
- Multiple independent queries (good for parallelization)
- Conditional queries based on user role (efficient)
- Computed statistics with filtering (needs optimization)
```

## Phase 1: Foundation Setup (Low Risk)
**Duration:** 30 minutes  
**Risk Level:** Low  
**Goal:** Create dashboard module structure without touching existing dashboard system

### Tasks
1. **Create Dashboard Module Directory Structure**
   ```bash
   mkdir -p client/src/modules/dashboard/{components,hooks,pages,types,services}
   mkdir -p client/src/modules/dashboard/components/{cards,summaries,overviews,layouts}
   touch client/src/modules/dashboard/index.ts
   ```

2. **Create Type Extensions** (NEW FILES - No Schema Duplication)
   ```typescript
   // types/dashboard.types.ts - UI-only extensions of schema types
   export interface DashboardStats {
     totalApplicants: number;
     totalStaff: number;
     shiftsThisWeek: number;
     hoursScheduled: number;
   }

   export interface DashboardFilters {
     selectedLocationId?: number;
     isAllLocations: boolean;
     assignedLocationIds: number[];
     isLocationRestricted: boolean;
   }

   export interface AdminActions {
     clearAllSessions: () => Promise<void>;
     isClearing: boolean;
   }
   ```

3. **Create Service Layer** (NEW FILE - API Abstraction)
   ```typescript
   // services/dashboardService.ts
   export const dashboardService = {
     getProfileData: () => fetch('/api/profile-data', { credentials: 'include' }),
     getShiftsData: () => fetch('/api/shifts', { credentials: 'include' }),
     getUserLocations: (userId: number) => fetch(`/api/user-locations/${userId}`, { credentials: 'include' }),
     clearAllSessions: () => fetch('/api/auth/clear-sessions', { method: 'POST', credentials: 'include' })
   };
   ```

**Validation Checkpoint 1:**
- [ ] Module directory structure created
- [ ] Type definitions established
- [ ] Service layer abstraction defined
- [ ] No existing functionality affected
- [ ] TypeScript compilation successful

---

## Phase 2: Hook Extraction (Medium Risk)
**Duration:** 45 minutes  
**Risk Level:** Medium  
**Goal:** Extract business logic from dashboard page into focused, reusable hooks

### Hook Extraction Strategy

#### Task 2.1: Extract useDashboardData Hook
```typescript
// hooks/useDashboardData.tsx (~80 lines)
export const useDashboardData = (selectedLocationId?: number) => {
  const profileQuery = useQuery({
    queryKey: ['/api/profile-data'],
    queryFn: () => dashboardService.getProfileData(),
  });
  
  const shiftsQuery = useQuery({
    queryKey: ['/api/shifts'],
    queryFn: () => dashboardService.getShiftsData(),
  });

  // Extracted computed values with memoization
  const statsData: DashboardStats = useMemo(() => ({
    totalApplicants: profileQuery.data?.filter(u => u.role === 'applicant')?.length || 0,
    totalStaff: profileQuery.data?.filter(u => 
      ['staff', 'crew_member', 'crew_manager', 'floor_manager', 'manager', 'administrator'].includes(u.role)
    )?.length || 0,
    shiftsThisWeek: shiftsQuery.data?.length || 0,
    hoursScheduled: shiftsQuery.data?.reduce((total, shift) => {
      const start = new Date(`1970-01-01T${shift.startTime}`);
      const end = new Date(`1970-01-01T${shift.endTime}`);
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0) || 0
  }), [profileQuery.data, shiftsQuery.data]);

  return { 
    statsData, 
    profileQuery, 
    shiftsQuery,
    isLoading: profileQuery.isLoading || shiftsQuery.isLoading 
  };
};
```

#### Task 2.2: Extract useDashboardFilters Hook
```typescript
// hooks/useDashboardFilters.tsx (~60 lines)
export const useDashboardFilters = (user: User, selectedLocationId?: number) => {
  const { data: userLocations } = useQuery({
    queryKey: ['/api/user-locations', user?.id],
    queryFn: () => dashboardService.getUserLocations(user.id),
    enabled: !!user?.id && (user?.role === 'crew_manager' || user?.role === 'floor_manager')
  });

  const filters: DashboardFilters = useMemo(() => {
    const assignedLocationIds = userLocations?.map(ul => ul.locationId) || [];
    const isLocationRestricted = (user?.role === 'crew_manager' || user?.role === 'floor_manager') && assignedLocationIds.length > 0;
    
    return {
      selectedLocationId,
      isAllLocations: !selectedLocationId,
      assignedLocationIds,
      isLocationRestricted
    };
  }, [userLocations, selectedLocationId, user?.role]);

  const applyLocationFilter = useCallback((data: any[]) => {
    if (!filters.isLocationRestricted) return data;
    
    return data.filter(item => 
      !item.locationId || filters.assignedLocationIds.includes(item.locationId)
    );
  }, [filters]);

  return { filters, applyLocationFilter };
};
```

#### Task 2.3: Extract useAdminActions Hook
```typescript
// hooks/useAdminActions.tsx (~50 lines)
export const useAdminActions = () => {
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const clearAllSessions = useCallback(async () => {
    if (!user || user.role !== 'administrator') {
      toast({
        title: "Access Denied",
        description: "Only administrators can clear sessions",
        variant: "destructive"
      });
      return;
    }
    
    if (confirm("Are you sure you want to clear ALL sessions? This will log out all users.")) {
      setIsClearing(true);
      try {
        const response = await dashboardService.clearAllSessions();
        const data = await response.json();
        
        if (response.ok) {
          toast({
            title: "Success",
            description: "All sessions have been cleared",
          });
        } else {
          throw new Error(data.message || 'Failed to clear sessions');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to clear sessions',
          variant: "destructive"
        });
      } finally {
        setIsClearing(false);
      }
    }
  }, [user, toast]);

  return { clearAllSessions, isClearing };
};
```

**Validation Checkpoint 2:**
- [ ] Hooks provide expected functionality
- [ ] Original dashboard page continues working unchanged
- [ ] Components can use either old or new hooks
- [ ] No data fetching disruptions
- [ ] Performance maintained or improved
- [ ] Error handling preserved

---

## Phase 3: Component Migration (High Risk)
**Duration:** 60 minutes  
**Risk Level:** High  
**Goal:** Migrate dashboard components to module structure while preserving functionality

### Migration Strategy
**Parallel Implementation**: Keep both old and new systems working simultaneously during migration.

#### Task 3.1: Migrate Dashboard Components
```typescript
// components/summaries/WeeklySummary.tsx (~200 lines)
import { WeeklySchedule } from '../../../components/dashboard/weekly-schedule';
export const WeeklySummary = WeeklySchedule; // Alias for compatibility

// components/summaries/StaffSummary.tsx (~150 lines)
// CRITICAL: Update to use User module instead of legacy Staff schema
import { useUserManagement } from '@/modules/users';

export const StaffSummary = ({ locationId }: { locationId: number }) => {
  // Replace legacy Staff queries with User module integration
  const { users, isLoading } = useUserManagement({
    filters: { locationId, roles: ['staff', 'crew_member', 'crew_manager'] }
  });
  
  // Preserve existing UI structure
  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Existing component structure with User data */}
      </CardContent>
    </Card>
  );
};

// components/summaries/CashSummary.tsx (~100 lines)
// Direct migration preserving existing functionality
```

#### Task 3.2: Create Dashboard Layout Component
```typescript
// components/layouts/DashboardLayout.tsx (~80 lines)
export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="space-y-6">
      <LocationHeader />
      {children}
    </div>
  );
};
```

#### Task 3.3: Create Main Dashboard Page
```typescript
// pages/DashboardPage.tsx (~200 lines)
import { useDashboardData, useDashboardFilters, useAdminActions } from '../hooks';
import { StatsCard } from '../components/cards';
import { WeeklySummary, StaffSummary, CashSummary } from '../components/summaries';
import { DashboardLayout } from '../components/layouts';

export const DashboardPage = () => {
  const { user } = useAuth(); // Updated to use @/modules/auth
  const { selectedLocationId, isAllLocations } = useLocationContext();
  
  const { statsData, isLoading } = useDashboardData(selectedLocationId);
  const { filters, applyLocationFilter } = useDashboardFilters(user, selectedLocationId);
  const { clearAllSessions, isClearing } = useAdminActions();

  return (
    <DashboardLayout>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Applicants" 
          value={statsData.totalApplicants}
          icon={UserPlus}
        />
        <StatsCard 
          title="Total Staff" 
          value={statsData.totalStaff}
          icon={Users}
        />
        <StatsCard 
          title="Shifts This Week" 
          value={statsData.shiftsThisWeek}
          icon={Calendar}
        />
        <StatsCard 
          title="Hours Scheduled" 
          value={statsData.hoursScheduled}
          icon={Clock}
        />
      </div>

      {/* Dashboard Components */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!isAllLocations && (
          <>
            <WeeklySummary locationId={selectedLocationId} />
            <StaffSummary locationId={selectedLocationId} />
            <CashSummary locationId={selectedLocationId} />
          </>
        )}
        
        {isAllLocations && (
          <ApplicantsSummary />
        )}
      </div>

      {/* Admin Actions */}
      {user?.role === 'administrator' && (
        <div className="flex gap-4">
          <Button 
            variant="destructive" 
            onClick={clearAllSessions}
            disabled={isClearing}
          >
            {isClearing ? "Clearing..." : "Clear All Sessions"}
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
};
```

#### Task 3.4: Update Module Exports
```typescript
// modules/dashboard/index.ts - Complete module API
export { DashboardPage } from './pages/DashboardPage';
export { DashboardLayout } from './components/layouts/DashboardLayout';
export { StatsCard } from './components/cards/StatsCard';
export { WeeklySummary, StaffSummary, CashSummary } from './components/summaries';
export { useDashboardData, useDashboardFilters, useAdminActions } from './hooks';
export * from './types/dashboard.types';

// Compatibility re-exports for gradual migration
export { default as Dashboard } from '../../pages/dashboard'; // Maintain old import
```

**Validation Checkpoint 3:**
- [ ] Dashboard page works identically with module components
- [ ] All statistics display correctly
- [ ] Location filtering functionality preserved
- [ ] Role-based access control working
- [ ] Admin session clearing functional
- [ ] Cross-module integrations maintained
- [ ] Performance equivalent or improved

---

## Phase 4: Integration Testing & Import Updates (High Risk)
**Duration:** 30 minutes  
**Risk Level:** High  
**Goal:** Update imports and comprehensive integration testing

### Integration Testing Strategy

#### Task 4.1: Update Authentication Imports
```typescript
// Update all dashboard module files to use @/modules/auth
import { useAuth } from '@/modules/auth';

// Update App.tsx routing
import { DashboardPage } from '@/modules/dashboard';
```

#### Task 4.2: Cross-Module Integration Testing
```bash
# Integration testing checklist:
- [ ] Dashboard loads with module architecture
- [ ] Auth module integration working (user state, permissions)
- [ ] Users module integration working (ApplicantsSummary)
- [ ] Locations module integration working (LocationHeader, context)
- [ ] Statistics calculations accurate
- [ ] Role-based filtering functional
- [ ] Admin actions working correctly
```

#### Task 4.3: Performance Testing
```bash
# Performance testing checklist:
- [ ] Dashboard load time <2 seconds
- [ ] Statistics calculation performance maintained
- [ ] Query optimization effective
- [ ] Memory usage stable
- [ ] No regression in responsiveness
```

**Validation Checkpoint 4:**
- [ ] All dashboard functionality tested and working
- [ ] Cross-module integrations verified  
- [ ] Performance metrics within acceptable ranges
- [ ] No regression in any dashboard feature
- [ ] Module provides complete dashboard functionality
- [ ] Rollback plan available and tested

---

## Risk Mitigation Strategies

### Dashboard Functionality Protection
```typescript
// Preserve dashboard functionality during migration
// 1. Keep original dashboard.tsx until migration complete
// 2. Maintain all existing API integrations
// 3. Preserve exact same statistics calculations
// 4. Test with real data and user roles
```

### Cross-Module Compatibility
```typescript
// Ensure seamless integration with existing modules
// 1. Use established module patterns (auth, users, locations)
// 2. Maintain existing context integrations where needed
// 3. Preserve cross-module data flow
// 4. Test role-based access scenarios
```

### Rollback Strategy
```typescript
// Emergency rollback plan:
// 1. Revert App.tsx to use original dashboard.tsx
// 2. Remove dashboard module imports 
// 3. Restore original component imports
// 4. Validate dashboard functionality restored
// 5. All changes are additive until Phase 4
```

## Success Metrics

### Technical Metrics
- **Component Modularity**: 8 focused components < 100 lines each (vs 1 page 418 lines + 3 components 450+ lines)
- **Import Simplification**: Single `@/modules/dashboard` import path
- **Type Safety**: 100% TypeScript coverage with schema compliance
- **Hook Reusability**: Dashboard logic usable in different contexts

### Functional Metrics  
- **Statistics Accuracy**: All calculations preserved and optimized
- **Cross-Module Integration**: Auth, users, locations modules working seamlessly
- **Performance**: No degradation in dashboard load times
- **Role-Based Access**: All permission systems working correctly

### Quality Metrics
- **Build Success**: Application builds without errors or warnings
- **Test Coverage**: All dashboard scenarios testable within module
- **Documentation**: Clear module API and usage patterns
- **Maintainability**: Easier to modify and extend dashboard features

## Production Deployment Strategy

### Pre-Migration Requirements
- [ ] Complete backup of dashboard system
- [ ] Staging environment testing with real user data
- [ ] Performance baseline measurements
- [ ] Cross-module integration verification

### Migration Deployment
- [ ] Deploy during low-traffic period
- [ ] Monitor dashboard performance during migration
- [ ] Real-time monitoring of statistics accuracy
- [ ] Immediate rollback capability available

### Post-Migration Verification
- [ ] Dashboard functionality monitoring for 24 hours
- [ ] Statistics calculation accuracy verification
- [ ] Cross-module integration testing
- [ ] Performance comparison with baseline

This migration plan provides a systematic approach to modernizing the dashboard system while preserving all critical functionality and maintaining the cross-module integrations established with auth, users, messaging, and locations modules.