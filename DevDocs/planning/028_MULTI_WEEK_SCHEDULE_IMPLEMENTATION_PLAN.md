# Multi-Week Schedule Implementation Plan

## Overview
Implement multi-week scheduling capability by adding a `multi_week_frames` grouping layer above existing `weekSchedules`, preserving all current functionality while enabling users to copy week schedules up to 8 times within a single frame.

## Phase 1: Database Schema Extension (Low Impact)
**Duration:** 1-2 hours  
**Risk:** Minimal - additive only

### Schema Changes:
- Add `multi_week_frames` table with basic metadata
- Add nullable `multiWeekFrameId` and `weekNumber` columns to `weekSchedules`
- All existing data remains unchanged (null values = single weeks)

### Validation:
- Verify existing scheduler functionality unchanged
- Test database migration safety
- Confirm backward compatibility

## Phase 2: Backend API Extensions (Medium Impact)
**Duration:** 3-4 hours  
**Risk:** Low - new endpoints only

### New Endpoints:
- `POST /api/multi-week-frames` - Create frame
- `POST /api/week-schedules/:id/copy` - Copy week to frame
- `GET /api/multi-week-frames/:id/weeks` - Get all weeks in frame
- `PATCH /api/multi-week-frames/:id` - Update frame metadata

### Validation:
- Test all new endpoints with Postman/curl
- Verify existing APIs still work
- Test copy functionality creates proper relationships

## Phase 3: Frontend "Add Week" Button (High Impact)
**Duration:** 2-3 hours  
**Risk:** Medium - UI changes

### Implementation:
- Add "Add Week" button to scheduler edit page
- Implement copy confirmation dialog
- Add week navigation when viewing multi-week frames
- Update scheduler list to show frame vs single week indicators

### User Testing Scenarios:
1. **Single Week User** - Verify existing workflow unchanged
2. **Multi-Week Creation** - Test "Add Week" button flow
3. **Independent Editing** - Verify copied weeks can be modified separately
4. **Navigation** - Test switching between weeks in a frame

## Phase 4: Enhanced UI & Polish (Medium Impact)
**Duration:** 2-3 hours  
**Risk:** Low - visual improvements

### Enhancements:
- Week tabs/navigation in scheduler edit page
- Frame name editing capability
- Visual indicators for multi-week vs single week schedules
- Improved scheduler list organization

### User Testing Focus:
- **Discoverability** - Can users find the "Add Week" feature?
- **Clarity** - Is it clear which week they're editing?
- **Workflow** - Does multi-week creation feel intuitive?

## User Testing Strategy

### Test Users:
- **Administrator** (existing admin account) - Full feature testing
- **Manager Role** - Scheduler creation and management
- **Crew Member** - View-only experience

### Test Scenarios:
1. **Baseline Test** - Existing single-week workflow
2. **Copy Test** - Create multi-week schedule from existing week
3. **Edit Test** - Modify individual weeks independently
4. **Navigation Test** - Switch between weeks in frame
5. **Integration Test** - Ensure shifts display correctly in timeline

### Success Criteria:
- Zero regressions in existing functionality
- Users can successfully create multi-week schedules
- Week independence maintained (editing week 2 doesn't affect week 1)
- Timeline preview works across all weeks
- Performance remains acceptable

## Risk Mitigation
- **Backup Strategy** - Full database backup before schema changes
- **Rollback Plan** - Remove nullable columns if issues arise
- **Incremental Deployment** - Each phase can be deployed independently
- **Feature Flag** - Hide "Add Week" button until fully tested

## Success Metrics
- Existing scheduler workflows maintain 100% functionality
- Multi-week creation completes successfully
- No performance degradation on timeline rendering
- User feedback confirms intuitive workflow

## Implementation Notes
- Preserve snake_case naming convention for database tables
- Maintain backward compatibility with existing single-week schedules
- Each copied week becomes completely independent with its own ID
- Multi-week frames serve purely as grouping mechanism
- Existing scheduler interface works unchanged for single weeks