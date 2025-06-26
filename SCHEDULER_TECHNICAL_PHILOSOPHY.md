# CrewPlots Scheduler - Technical Philosophy

**Document Version:** 1.0  
**Created:** June 26, 2025  
**Reference:** Session 2 of Three-Session Scheduler Documentation Approach

## Core Technical Philosophy

The CrewPlots Scheduler builds upon the proven technical foundation established through successful module migrations (messaging, location, user, auth). This scheduler extends the platform's modular architecture while leveraging the hybrid database capabilities that distinguish CrewPlots from single-database competitors.

### Foundational Design Principles

**1. Schema-First Architecture**
- All scheduler components use `@shared/schema` types as single source of truth
- No duplicate type definitions or module-specific schemas
- TypeScript compilation ensures consistency across frontend and backend
- Zod validation provides runtime type safety for all scheduler operations

**2. Modular Component Organization**
Following proven patterns from successful module migrations:
```
client/src/modules/scheduler/
├── components/          # UI components focused on specific responsibilities
├── hooks/              # Business logic and data management
├── pages/              # Route-level page components
├── services/           # Validation and utilities
└── index.ts           # Centralized module exports
```

**3. Hybrid Database Optimization**
- **PostgreSQL**: Shift metadata, competency assignments, schedule templates
- **MongoDB**: Rich content for shift descriptions, complex scheduling rules
- **Redis**: Cache layer for frequently accessed scheduling data
- **Explicit Failure Design**: System fails visibly when databases unavailable

## Technical Integration Strategy

### Leveraging Proven Module Patterns

**Navigation Integration**
The scheduler inherits the unified navigation architecture:
- Permission-driven menu sections based on role hierarchy
- Centralized navigation configuration in `shared/navigation/`
- Consistent access control across desktop and mobile interfaces

**Authentication & Authorization**
Building on the completed auth module migration:
- Session-based authentication with passport.js
- Role-based access control (5-role hierarchy)
- Workflow permissions for granular scheduling access

**Data Management Architecture**
Following messaging module success patterns:
- TanStack Query for server state management
- React Hook Form with Zod validation for forms
- Standardized error handling and toast notifications

### Service Layer Architecture

**SchedulerService Class**
Implementing hybrid database compilation pattern:

```typescript
class SchedulerService {
  // Core scheduling operations
  async createShift(shiftData: InsertShift): Promise<CompiledShift>
  async getShiftsByLocation(locationId: number): Promise<CompiledShift[]>
  async assignCrewToShift(shiftId: number, userId: number): Promise<ShiftAssignment>
  
  // Competency-based assignment
  async getEligibleCrew(shiftId: number): Promise<CompetencyMatch[]>
  async calculateCompetencyFit(userId: number, requiredCompetencies: Competency[]): Promise<number>
  
  // Template and schedule management
  async createScheduleTemplate(templateData: InsertTemplate): Promise<ScheduleTemplate>
  async generateShiftsFromTemplate(templateId: number, dateRange: DateRange): Promise<Shift[]>
  
  // MongoDB integration for complex content
  private async compileShiftDetails(postgresShift: Shift): Promise<CompiledShift>
}
```

**Data Compilation Strategy**
- PostgreSQL stores shift metadata, time slots, competency requirements
- MongoDB stores rich shift descriptions, complex scheduling rules, custom instructions
- Service layer compiles complete shift objects for frontend consumption
- Redis caches frequently accessed shift data and competency matrices

### Type System Architecture

**Core Scheduler Types**
Extending existing schema with scheduler-specific entities:

```typescript
// Extended from @shared/schema
export interface CompetencyMatch {
  userId: number;
  competencyScore: number;
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  preferenceLevel: number; // 1-5 scale
}

export interface CompiledShift {
  ...Shift; // Base PostgreSQL metadata
  richDescription?: string; // MongoDB content
  requiredCompetencies: CompetencyRequirement[];
  eligibleCrew: CompetencyMatch[];
  currentAssignments: ShiftAssignment[];
}

export interface SchedulingWindow {
  startDate: Date;
  endDate: Date;
  viewingRole: 'crew_member' | 'crew_chief' | 'app_manager' | 'owner';
  locationIds: number[];
}
```

## Competitive Technical Advantages

### 1. Unlimited Creation Model
**Technical Implementation:**
- Dynamic competency creation without predefined limits
- Soft limits based on usage analytics rather than hard database constraints
- Horizontal scaling through per-customer database isolation

**Database Design:**
```sql
-- Competencies table supports unlimited custom competencies per location
CREATE TABLE competencies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location_id INTEGER REFERENCES locations(id),
  category TEXT, -- Custom categorization
  skill_level_required INTEGER DEFAULT 1, -- 1-5 scale
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User competencies with assessment tracking
CREATE TABLE user_competencies (
  user_id INTEGER REFERENCES users(id),
  competency_id INTEGER REFERENCES competencies(id),
  assessed_level INTEGER NOT NULL, -- 0-5 scale
  assessed_by INTEGER REFERENCES users(id),
  location_id INTEGER REFERENCES locations(id),
  PRIMARY KEY (user_id, competency_id, location_id)
);
```

### 2. Intelligent Assignment Algorithm
**Competency Weighting System:**
```typescript
// Algorithm for competency-based crew assignment
async calculateOptimalAssignment(shiftRequirements: CompetencyRequirement[], availableCrew: User[]): Promise<AssignmentRecommendation[]> {
  const recommendations = [];
  
  for (const crewMember of availableCrew) {
    let totalScore = 0;
    let matchedCompetencies = 0;
    
    for (const requirement of shiftRequirements) {
      const userCompetency = await this.getUserCompetency(crewMember.id, requirement.competencyId);
      
      if (userCompetency && userCompetency.level >= requirement.minimumLevel) {
        // Weighted scoring based on competency importance and user skill level
        const competencyScore = (userCompetency.level / 5) * requirement.weight;
        totalScore += competencyScore;
        matchedCompetencies++;
      }
    }
    
    // Overall fit score considering competency match percentage
    const fitScore = (totalScore / shiftRequirements.length) * (matchedCompetencies / shiftRequirements.length);
    
    recommendations.push({
      userId: crewMember.id,
      fitScore,
      matchedCompetencies,
      totalRequiredCompetencies: shiftRequirements.length
    });
  }
  
  return recommendations.sort((a, b) => b.fitScore - a.fitScore);
}
```

### 3. Subscription-Based Workflow
**Technical Implementation:**
- Crew members express interest through subscription system
- Chiefs make final assignments from interested and eligible crew
- Prevents choice paralysis while maintaining scheduling control

```typescript
// Subscription management system
interface ShiftSubscription {
  shiftId: number;
  userId: number;
  interestLevel: 1 | 2 | 3 | 4 | 5; // 1=low interest, 5=high interest
  availabilityConfirmed: boolean;
  notes?: string;
  subscribedAt: Date;
}

// Workflow: Crew subscribes → Chief assigns from subscribers
async handleShiftSubscription(shiftId: number, userId: number, interestLevel: number): Promise<ShiftSubscription> {
  // Validate user competency for shift
  const isEligible = await this.validateCrewEligibility(userId, shiftId);
  if (!isEligible) {
    throw new Error('User does not meet minimum competency requirements');
  }
  
  // Create subscription record
  return await this.createShiftSubscription({
    shiftId,
    userId,
    interestLevel,
    availabilityConfirmed: true,
    subscribedAt: new Date()
  });
}
```

## Performance and Scalability Architecture

### Caching Strategy
**Redis Implementation:**
- Cache competency matrices for fast assignment calculations
- Store frequently accessed shift data for dashboard performance
- Session-based caching for user preferences and location contexts

**Cache Keys:**
```typescript
const CACHE_KEYS = {
  USER_COMPETENCIES: (userId: number, locationId: number) => `competencies:${userId}:${locationId}`,
  SHIFT_ELIGIBILITY: (shiftId: number) => `eligibility:${shiftId}`,
  LOCATION_SCHEDULE: (locationId: number, weekStart: string) => `schedule:${locationId}:${weekStart}`,
  COMPETENCY_MATRIX: (locationId: number) => `matrix:${locationId}`
};
```

### Database Optimization
**Indexing Strategy:**
```sql
-- Performance indexes for scheduler queries
CREATE INDEX idx_shifts_location_date ON shifts(location_id, date);
CREATE INDEX idx_user_competencies_lookup ON user_competencies(user_id, location_id);
CREATE INDEX idx_shift_assignments_active ON shift_assignments(shift_id, status) WHERE status = 'confirmed';
CREATE INDEX idx_competency_requirements ON shift_competencies(shift_id, competency_id);
```

**Query Optimization:**
- Single query compilation for shift + competencies + assignments
- Batch operations for template-based shift generation
- Efficient filtering for viewing window constraints

### Multi-Tenant Scaling
**Customer Isolation:**
- Dedicated PostgreSQL, MongoDB, Redis instances per customer
- Location-based data partitioning within customer databases
- Independent scaling based on customer usage patterns

## Integration with Existing Systems

### Location Module Integration
- Scheduler respects location-based filtering established in dashboard
- Competencies and shifts inherit location context
- Location permissions control scheduler access

### User Module Integration
- Builds on user_locations table for crew assignment eligibility
- Integrates with user_competencies for skill-based matching
- Preserves authentication chain for applicant → crew member progression

### Messaging Module Integration
- Shift-specific notes and communications
- Assignment notifications and confirmations
- Integration with hybrid messaging storage system

## Development and Deployment Strategy

### Module Development Approach
**Phase-Based Implementation:**
1. **Core Infrastructure**: Database schema, service layer foundation
2. **Basic CRUD**: Shift and competency management interfaces
3. **Assignment Engine**: Competency-based matching algorithm
4. **Subscription Workflow**: Crew interest and chief assignment systems
5. **Advanced Features**: Templates, bulk operations, analytics

### Testing Strategy
**Component Testing:**
- Unit tests for competency calculation algorithms
- Integration tests for database compilation
- E2E tests for complete scheduling workflows

**Performance Testing:**
- Load testing for competency matrix calculations
- Stress testing for concurrent shift assignments
- Cache performance validation

### Deployment Integration
**Production Readiness:**
- Follows established Docker container architecture
- Integrates with existing Traefik routing
- Maintains database connection patterns
- Preserves session management systems

## Technical Risk Mitigation

### Data Integrity
- Referential integrity between PostgreSQL shift metadata and MongoDB content
- Validation of competency requirements during shift creation
- Atomic operations for assignment transactions

### Performance Monitoring
- Query performance tracking for competency calculations
- Cache hit ratio monitoring for scheduling data
- Assignment algorithm execution time optimization

### Scalability Safeguards
- Configurable limits for competency creation based on usage analytics
- Viewing window constraints to prevent database overload
- Efficient pagination for large shift datasets

## Conclusion

The CrewPlots Scheduler technical philosophy leverages proven architectural patterns while introducing innovative competency-based scheduling capabilities. By building on the established modular foundation and hybrid database architecture, the scheduler provides competitive advantages through unlimited creation models, intelligent assignment algorithms, and subscription-based workflows.

This technical approach ensures the scheduler integrates seamlessly with existing systems while providing the performance and scalability required for production deployment across multiple customer environments.