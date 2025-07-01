# AUTO-SAVE MIGRATION SUB-PLAN: SCHEDULER CREATE-EDIT CONSOLIDATION

**Date:** July 01, 2025  
**Project:** CrewPlots Auto-Save Migration  
**Scope:** Extract working auto-save from messaging module and consolidate scheduler create/edit pages

## EXECUTIVE SUMMARY

This plan addresses the consolidation of SchedulerCreatePage and SchedulerEditPage into a single adaptive component with proper auto-save functionality. Current implementation has auto-save configured for UPDATE operations on CREATE page, causing endpoint failures.

## IMPACT ASSESSMENT

### Current State Analysis

**Database State:**
- 4 active schedule blocks in production (IDs: 1, 4, 6, 20)
- Schedule ID 19 was deleted during testing - explains failed auto-save attempts
- Russian Doll architecture: schedule_blocks → week_schedules → shifts

**Code Architecture:**
- **DUPLICATE COMPONENTS**: SchedulerCreatePage (647 lines) and SchedulerEditPage (892 lines) with 80% shared logic
- **AUTO-SAVE INTEGRATION**: Currently in SchedulerCreatePage using `/api/scheduler/packages/update/19` (wrong endpoint)
- **WORKING PATTERN**: Messaging module has proven auto-save implementation (useAutoSave.tsx + AutoSaveIndicator.tsx)

**Technical Debt:**
- Code duplication between create/edit pages
- Session isolation issues with simultaneous requests
- Legacy authentication patterns in package endpoints
- Mixed POST/PUT method usage

### Risk Assessment

**HIGH RISK:**
- Data loss during consolidation if rollback procedures not followed
- Session conflicts during development affecting user experience
- Auto-save triggering unwanted creates/updates during testing

**MEDIUM RISK:**
- Performance impact from validation package service overhead
- Complex state management with Russian Doll data model

**LOW RISK:**
- UI consistency issues (manageable with proper testing)

## ROLLBACK STRATEGY

**File Safety Protocol:** On every occasion a file gets modified, it will be automatically renamed to `[filename].bak` before changes are made. This provides immediate rollback capability by simply renaming the .bak file back to its original name. Earlier commits serve as secondary rollback option.

## PHASE IMPLEMENTATION PLAN

### PHASE 1: INVESTIGATION (Estimated: 30 minutes)
**Objectives:** Complete technical investigation

**Tasks:**
1. **Technical Deep Dive**
   - Trace auto-save endpoint configuration in both pages
   - Analyze shared logic patterns between create/edit
   - Document minimum data threshold for create→edit transition

**Completion Criteria:**
- Technical analysis documented
- Implementation strategy confirmed

### PHASE 2: AUTO-SAVE CONFIGURATION FIX (Estimated: 45 minutes)
**Objectives:** Fix immediate auto-save failure and establish proper endpoint patterns

**Tasks:**
1. **Endpoint Correction**
   - Fix CREATE page: Use `/api/scheduler/packages/create` for initial save
   - Implement dynamic endpoint selection based on `createdScheduleId` state
   - Update HTTP method logic: POST for create, PUT for update

2. **Minimum Data Threshold Implementation**
   - Define required fields: `name`, `locationId`
   - Implement progressive save logic: first save creates, subsequent saves update
   - Add silent cleanup for incomplete drafts on navigation

3. **Authentication Middleware Fix**
   - Remove legacy auth patterns from package endpoints
   - Ensure all endpoints use `authenticateUser` middleware
   - Test authenticated requests

**Validation:**
- Auto-save indicator shows "saved" instead of "save failed"
- Create→edit transition works seamlessly
- Draft cleanup prevents database pollution

### PHASE 3: PAGE CONSOLIDATION (Estimated: 60 minutes)
**Objectives:** Merge SchedulerCreatePage and SchedulerEditPage into single adaptive component

**Tasks:**
1. **Component Analysis & Planning**
   - Extract shared logic patterns (80% overlap identified)
   - Design state-based routing: URL determines initial state, component adapts behavior
   - Plan parameter handling: `/scheduler/new` vs `/scheduler/edit/:scheduleId`

2. **Unified Component Creation**
   - Create `SchedulerPage.tsx` with dual-mode capability
   - Implement state-based logic: `scheduleId ? 'edit' : 'create'`
   - Integrate auto-save with proper endpoint selection

3. **Route Configuration Update**
   - Update `App.tsx` routing to use single component
   - Preserve existing URL patterns for compatibility
   - Test navigation between create/edit modes

**Validation:**
- Single component handles both create and edit scenarios
- URL changes trigger appropriate mode switches
- All existing functionality preserved

### PHASE 4: RUSSIAN DOLL AUTO-SAVE INTEGRATION (Estimated: 45 minutes)
**Objectives:** Integrate auto-save with complex scheduler data model

**Tasks:**
1. **Validation Package Integration**
   - Connect auto-save to ValidationPackageService
   - Implement 4-thread validation (Assembly, Integrity, Permission, Transaction)
   - Handle Russian Doll ID assignment properly

2. **Progressive Save Strategy**
   - Schedule Block level: name, description, location, isActive
   - Week Schedule level: week templates within block
   - Shift level: individual shifts within week schedules

3. **User Experience Enhancement**
   - Real-time auto-save feedback during complex operations
   - Prevent session isolation with individual fetch patterns
   - Graceful error handling for validation failures

**Validation:**
- Complex scheduler data saves correctly through auto-save
- Validation framework integrates seamlessly
- User receives clear feedback on save status

### PHASE 5: CLEANUP & OPTIMIZATION (Estimated: 30 minutes)
**Objectives:** Three-stage cleanup with approval checkpoints

**Tasks:**
1. **Cleanup Stage 1: Component Removal (Requires Approval)**
   - List files/components to be removed
   - Await user approval before deletion
   - Archive original SchedulerCreatePage/SchedulerEditPage
   - Update import references throughout codebase

2. **Cleanup Stage 2: Route and Export Cleanup (Requires Approval)**
   - List route changes and export modifications to be made
   - Await user approval before modification
   - Clean up unused exports
   - Remove legacy routing patterns

3. **Cleanup Stage 3: Documentation and Infrastructure (Requires Approval)**
   - List documentation and infrastructure changes to be made
   - Await user approval before cleanup
   - Update replit.md with new architecture
   - Remove unused auto-save types and interfaces
   - Archive outdated documentation files

**Validation:**
- All three cleanup stages approved and completed
- No duplicate code remaining
- Documentation reflects current implementation

### Database Cleanup (Optional)
7. **Remove orphaned draft schedules** - DELETE incomplete schedule blocks without minimum required data
8. **Cleanup test schedule data** - DELETE schedule blocks created during development/testing

## SUCCESS CRITERIA

### Technical Success
- ✅ Single adaptive component replaces duplicate pages
- ✅ Auto-save works correctly in both create and edit modes
- ✅ Russian Doll data model integrates with auto-save
- ✅ No session isolation issues
- ✅ All existing functionality preserved

### User Experience Success
- ✅ Seamless transition from create to edit mode
- ✅ Clear auto-save status feedback
- ✅ No data loss during operations
- ✅ Performance maintained or improved

### Architecture Success
- ✅ Code duplication eliminated
- ✅ Reusable auto-save pattern established
- ✅ Clean separation of concerns
- ✅ Proper error handling and recovery

## ESTIMATED TOTAL TIME: 3.5 HOURS

**Breakdown:**
- Phase 1 (Safety): 30 minutes
- Phase 2 (Auto-save Fix): 45 minutes  
- Phase 3 (Consolidation): 60 minutes
- Phase 4 (Integration): 45 minutes
- Phase 5 (Cleanup): 30 minutes

**Resource Requirements:**
- Database access for testing
- Git repository access for safety checkpoints
- User approval for cleanup tasks (8 items listed above)