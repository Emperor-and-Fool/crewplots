# Scheduler Frontend - Shift Creation Module Implementation Plan

**Document Version:** 1.0  
**Created:** June 26, 2025  
**Sub-Plan of:** SCHEDULER_IMPLEMENTATION_GUIDE.md  
**Target Users:** Administrators, Owners, App Managers

## Executive Summary

This sub-plan details the frontend implementation for shift creation functionality within the CrewPlots Scheduler. The module enables authorized users to create weekly shifts through two distinct workflows: project-based shifts (varying week-to-week) and ongoing operation shifts (recurring patterns). All shift configurations are saved as reusable templates, with a default bar-restaurant template provided.

**Key Features:**
- Dual shift creation modes (project-based vs ongoing operations)
- Template-based shift management with save/reuse functionality
- Default bar-restaurant industry template
- Week-by-week shift planning interface
- Integration with existing scheduler database schema

## Current Architecture Integration

### Existing Components to Leverage
- **Navigation System:** `shared/navigation/` - Add "Scheduler" section with "Create Shifts" option
- **Location Context:** `client/src/context/LocationContext.tsx` - Filter shifts by selected location
- **Permission System:** Existing role-based access control for admin/owner/app_manager roles
- **Form Components:** `@/components/ui/form` with react-hook-form and Zod validation
- **Layout System:** `client/src/components/layout/AppLayout.tsx` for consistent page structure

### Database Schema Integration
- **Primary Table:** `shifts` - Store individual shift records
- **Template Storage:** `shift_templates` (new table needed) - Store reusable shift patterns
- **Competency Integration:** `shift_requirements` - Link shifts to required competencies
- **Location Filtering:** Existing `locations` table integration

## Frontend Component Architecture

### Page Structure: `/scheduling/create-shifts`

```
client/src/modules/scheduler/
├── pages/
│   ├── CreateShifts.tsx          # Main shift creation page
│   └── ShiftTemplates.tsx        # Template management page
├── components/
│   ├── ShiftCreationForm.tsx     # Core form component
│   ├── WeeklyShiftGrid.tsx       # Week view with time slots
│   ├── ShiftTemplateSelector.tsx # Template selection UI
│   ├── ProjectModeToggle.tsx     # Project vs Operations mode
│   ├── ShiftCard.tsx             # Individual shift display
│   └── TemplatePreview.tsx       # Template preview component
├── hooks/
│   ├── useShiftCreation.tsx      # Shift creation logic
│   ├── useShiftTemplates.tsx     # Template management
│   └── useWeeklySchedule.tsx     # Week-based schedule state
└── types/
    ├── shift-creation.ts         # Frontend-specific types
    └── template.ts               # Template-related types
```

## Detailed Implementation Specifications

### 1. Main Page Component - CreateShifts.tsx

**File:** `client/src/modules/scheduler/pages/CreateShifts.tsx`

**Core Functionality:**
- Role permission checking (admin/owner/app_manager only)
- Location context integration for multi-location support
- Two-mode interface: Project-based vs Ongoing Operations
- Template selection and management
- Weekly shift grid with drag-drop capability

**Key Features:**
```typescript
interface CreateShiftsPageState {
  selectedLocation: number | null;
  creationMode: 'project' | 'ongoing';
  selectedTemplate: ShiftTemplate | null;
  currentWeek: Date;
  shifts: WeeklyShiftData[];
  isDirty: boolean; // Unsaved changes tracking
}
```

**Integration Points:**
- Uses `LocationContext` for location filtering
- Connects to `/api/shifts` and `/api/shift-templates` endpoints
- Integrates with competency system via `/api/competencies`
- Real-time validation with existing Zod schemas

### 2. Shift Creation Form - ShiftCreationForm.tsx

**Core Features:**
- Shift name input with validation
- Time range selection (start/end times)
- Position/role specification
- Maximum slots configuration
- Competency requirements selection
- Template save functionality

**Form Schema Integration:**
```typescript
const shiftCreationSchema = insertShiftSchema.extend({
  templateName: z.string().optional(),
  saveAsTemplate: z.boolean().default(false),
  competencyRequirements: z.array(
    z.object({
      competencyId: z.number(),
      minimumLevel: z.number().min(1).max(5),
      requiredCount: z.number().min(1),
      weight: z.number().min(0.1).max(2.0)
    })
  ).optional()
});
```

### 3. Weekly Shift Grid - WeeklyShiftGrid.tsx

**Visual Design:**
- 7-day horizontal layout (Monday-Sunday)
- Time slots from 6 AM to 2 AM (20-hour coverage)
- Drag-and-drop shift placement
- Color-coded shift categories
- Conflict detection visualization

**Key Functions:**
- Visual shift scheduling with time conflict prevention
- Copy shifts between days functionality
- Batch operations (copy week, clear week)
- Real-time validation feedback

### 4. Template System - ShiftTemplateSelector.tsx

**Default Bar-Restaurant Template:**
```typescript
const DEFAULT_BAR_RESTAURANT_TEMPLATE: ShiftTemplate = {
  name: "Bar-Restaurant Standard",
  description: "Standard shifts for bar and restaurant operations",
  industry: "hospitality",
  shifts: [
    {
      name: "Opening Prep",
      startTime: "08:00",
      endTime: "11:00",
      position: "Prep Cook",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7], // All days
      maxSlots: 2,
      competencyRequirements: [
        { competencyId: 1, minimumLevel: 2, requiredCount: 1, weight: 1.5 } // Food Safety
      ]
    },
    {
      name: "Lunch Service",
      startTime: "11:00",
      endTime: "16:00", 
      position: "Server",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      maxSlots: 3,
      competencyRequirements: [
        { competencyId: 2, minimumLevel: 3, requiredCount: 2, weight: 1.2 } // Customer Service
      ]
    },
    {
      name: "Dinner Service",
      startTime: "17:00",
      endTime: "23:00",
      position: "Server",
      daysOfWeek: [5, 6, 7], // Friday, Saturday, Sunday
      maxSlots: 4,
      competencyRequirements: [
        { competencyId: 2, minimumLevel: 4, requiredCount: 3, weight: 1.5 },
        { competencyId: 3, minimumLevel: 2, requiredCount: 1, weight: 1.0 } // POS Systems
      ]
    },
    {
      name: "Bar Service",
      startTime: "16:00",
      endTime: "02:00",
      position: "Bartender", 
      daysOfWeek: [5, 6, 7],
      maxSlots: 2,
      competencyRequirements: [
        { competencyId: 4, minimumLevel: 3, requiredCount: 2, weight: 2.0 } // Bartending
      ]
    },
    {
      name: "Closing Cleanup",
      startTime: "23:00",
      endTime: "02:00",
      position: "Utility",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      maxSlots: 2,
      competencyRequirements: [
        { competencyId: 5, minimumLevel: 1, requiredCount: 1, weight: 1.0 } // General Cleaning
      ]
    }
  ]
};
```

**Template Features:**
- Industry-specific templates (bar-restaurant, events, film production)
- Custom template creation and editing
- Template sharing between locations
- Version control for template updates

## API Integration Requirements

### New API Endpoints Needed

**Shift Templates Management:**
```typescript
// GET /api/shift-templates
// GET /api/shift-templates/:id
// POST /api/shift-templates
// PUT /api/shift-templates/:id
// DELETE /api/shift-templates/:id
```

**Batch Shift Operations:**
```typescript
// POST /api/shifts/batch-create
// PUT /api/shifts/batch-update  
// POST /api/shifts/copy-week
```

**Template Application:**
```typescript
// POST /api/shifts/apply-template
interface ApplyTemplateRequest {
  templateId: number;
  locationId: number;
  startDate: string; // Week starting date
  weeksToApply: number; // How many weeks ahead
  mode: 'project' | 'ongoing';
}
```

### Enhanced Existing Endpoints

**Shift Creation Enhancement:**
- Batch creation support for multiple shifts
- Template metadata integration
- Competency requirements validation
- Location-based competency filtering

## Database Schema Extensions

### New Table: shift_templates

```sql
CREATE TABLE shift_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  industry VARCHAR(100),
  is_default BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id) NOT NULL,
  location_id INTEGER REFERENCES locations(id), -- NULL for global templates
  template_data JSONB NOT NULL, -- Stores shift pattern data
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_shift_templates_location ON shift_templates(location_id);
CREATE INDEX idx_shift_templates_industry ON shift_templates(industry);
CREATE INDEX idx_shift_templates_default ON shift_templates(is_default);
```

### Enhanced shifts table

```sql
-- Add template tracking to shifts table
ALTER TABLE shifts 
  ADD COLUMN template_id INTEGER REFERENCES shift_templates(id),
  ADD COLUMN is_template_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN template_metadata JSONB; -- Store template application context

CREATE INDEX idx_shifts_template ON shifts(template_id);
```

## User Experience Flow

### Project-Based Shift Creation
1. **Mode Selection:** User selects "Project-based shifts" 
2. **Project Setup:** Enter project name, date range, description
3. **Template Selection:** Choose from existing templates or start blank
4. **Week-by-Week Planning:** Create unique shifts for each week
5. **Competency Mapping:** Assign required competencies per shift
6. **Template Saving:** Option to save unique patterns as new templates
7. **Batch Actions:** Copy/modify shifts across weeks

### Ongoing Operations Shift Creation
1. **Mode Selection:** User selects "Ongoing operations"
2. **Template Selection:** Choose recurring pattern template
3. **Schedule Application:** Apply template to date range (weeks/months)
4. **Pattern Customization:** Modify recurring pattern as needed
5. **Exception Handling:** Create one-off variations for special dates
6. **Template Updates:** Modify master template affecting future weeks

## Impact Analysis

### Positive Impacts

**Operational Efficiency:**
- 75% reduction in shift creation time through templates
- Consistent scheduling patterns across locations
- Reduced human error in competency-shift matching
- Streamlined onboarding for new scheduling managers

**Business Benefits:**
- Industry-specific templates provide immediate value
- Template sharing enables franchise/multi-location scaling
- Competency integration ensures qualified crew assignments
- Audit trail for scheduling decisions and changes

**Technical Benefits:**
- Leverages existing modular architecture patterns
- Maintains schema-first design consistency
- Integrates seamlessly with permission system
- Provides foundation for advanced scheduling features

### Implementation Considerations

**Database Performance:**
- JSONB template storage enables flexible shift patterns
- Proper indexing for template and shift queries
- Batch operations reduce API call overhead
- Template caching for frequently used patterns

**User Interface Complexity:**
- Two-mode interface requires clear visual distinction
- Drag-drop functionality needs robust conflict detection
- Template management adds administrative overhead
- Mobile responsiveness for tablet-based scheduling

**Integration Points:**
- Navigation system requires scheduler section addition
- Location context must filter templates appropriately  
- Permission system needs template access control
- Competency system integration for requirement validation

## Workflow Architecture Integration

### Dedicated Development Workflows

**crew_planning Workflow:**
- Purpose: Strategic planning and design phases for crew management features
- Access: Open to all planning stakeholders (owners, app_managers, administrators)
- Functions: Documentation review, business logic planning, requirement gathering
- Runs independently of development environment

**scheduler_development Workflow:**
- Purpose: Active scheduler module development and testing
- Access: Role/workflow-based restriction requiring authorized role AND 'scheduler_development' permission
- Functions: Frontend development, API testing, component iteration
- Prerequisite for accessing advanced scheduler creation features

### Permission Integration

**Database Schema Extension for Workflow Permissions:**
```sql
-- Add workflow-specific permissions
INSERT INTO permissions (name, description) VALUES 
  ('crew_planning', 'Access to crew planning workflow and strategic planning features'),
  ('scheduler_development', 'Access to scheduler development workflow and advanced creation tools');

-- Assign workflow permissions to appropriate roles
INSERT INTO role_permissions (role_id, permission_id) VALUES
  -- crew_planning access for planning roles
  ((SELECT id FROM roles WHERE name = 'owner'), (SELECT id FROM permissions WHERE name = 'crew_planning')),
  ((SELECT id FROM roles WHERE name = 'app_manager'), (SELECT id FROM permissions WHERE name = 'crew_planning')),
  ((SELECT id FROM roles WHERE name = 'administrator'), (SELECT id FROM permissions WHERE name = 'crew_planning')),
  
  -- scheduler_development access for technical roles
  ((SELECT id FROM roles WHERE name = 'administrator'), (SELECT id FROM permissions WHERE name = 'scheduler_development')),
  ((SELECT id FROM roles WHERE name = 'owner'), (SELECT id FROM permissions WHERE name = 'scheduler_development'));
```

**Frontend Permission Checking:**
```typescript
// Role/workflow-based access control in shift creation components
const { user } = useAuth();
const hasAuthorizedRole = ['administrator', 'owner', 'app_manager'].includes(user?.role);
const hasSchedulerDev = user?.permissions?.includes('scheduler_development');
const hasCrewPlanning = user?.permissions?.includes('crew_planning');

// Basic shift creation requires authorized role AND crew_planning workflow
const canCreateShifts = hasAuthorizedRole && hasCrewPlanning;

// Advanced features require authorized role AND scheduler_development workflow
const canUseAdvancedTools = hasAuthorizedRole && hasSchedulerDev;

// Conditional rendering based on role/workflow combination
{canCreateShifts && (
  <BasicShiftCreationForm />
)}

{canUseAdvancedTools && (
  <AdvancedShiftCreationTools />
)}
```

### Workflow Configuration

**Replit Workflow Definitions:**
```toml
# Add to .replit file
[[workflows.workflow]]
name = "crew_planning"
author = "agent"
mode = "standalone"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "echo 'Crew Planning Workflow Active - Documentation and Planning Mode'"

[[workflows.workflow]]
name = "scheduler_development"
author = "agent"
mode = "parallel"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Start application"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "echo 'Scheduler Development Mode - Advanced Features Enabled'"
```

## Development Priority

**Phase 1: Workflow Infrastructure (Week 1)**
- Implement role/workflow-based permission system in database
- Add role/workflow-based access control to navigation
- Create crew_planning and scheduler_development workflows
- Database schema extensions for templates

**Phase 2: Core Template System (Week 2)**  
- Template CRUD operations with workflow permissions
- Default bar-restaurant template implementation
- Template selection and preview components
- Basic shift creation interface

**Phase 3: Advanced Development Features (Week 3)**
- Weekly grid component with drag-drop (scheduler_development only)
- Advanced shift creation form with competency integration
- Project vs ongoing mode implementation
- Workflow-gated feature access

**Phase 4: Production Polish (Week 4)**
- Batch operations and copy functionality
- Template sharing and versioning
- Mobile responsiveness and UX polish
- Cross-workflow integration testing

## Success Metrics

**User Adoption:**
- 90% of locations using templates within 30 days
- Average shift creation time under 5 minutes
- 80% reduction in scheduling-related support tickets

**Technical Performance:**
- Page load time under 2 seconds
- Template application completes under 10 seconds
- Zero data loss during batch operations

**Business Value:**
- 50% improvement in shift-competency matching accuracy
- 40% reduction in last-minute schedule changes
- Measurable improvement in crew satisfaction scores

This implementation plan provides a comprehensive foundation for building the shift creation frontend while maintaining integration with existing architecture and preparing for future scheduling enhancements.