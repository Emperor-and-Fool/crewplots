# Production Backlog

## ValidationEngine30 Package-Driven Migration Status
**Priority**: Critical Architecture  
**Effort**: High  
**Risk**: Performance regression and technical debt accumulation  

### Migration Overview
ValidationEngine30 currently contains 21 hardcoded entity blocks that bypass the existing package system. All corresponding packages already exist and are registered, creating architectural boundary violations. This section tracks the gradual migration to pure package-driven architecture.

### Hardcoded Blocks Migration Progress

#### **Messaging Module** ✅ READY
| Line | Entity | Operation | Status | Package Location |
|------|---------|-----------|--------|------------------|
| 506 | messaging | all | ❌ Hardcoded | `server/modules/messaging/validation/messagingPackage.ts` |

#### **Scheduler Module** ✅ READY  
| Line | Entity | Operation | Status | Package Location |
|------|---------|-----------|--------|------------------|
| 516 | scheduleBlock | create | ❌ Hardcoded | `server/modules/scheduler/validation/scheduleBlockPackage.ts` |
| 519 | scheduleBlock | update | ❌ Hardcoded | `server/modules/scheduler/validation/scheduleBlockPackage.ts` |
| 522 | weekSchedule | create | ❌ Hardcoded | `server/modules/scheduler/validation/weekSchedulePackage.ts` |
| 525 | weekSchedule | update | ❌ Hardcoded | `server/modules/scheduler/validation/weekSchedulePackage.ts` |
| 528 | shift | create | ❌ Hardcoded | `server/modules/scheduler/validation/shiftPackage.ts` |
| 532 | shift | update | ❌ Hardcoded | `server/modules/scheduler/validation/shiftPackage.ts` |
| 534 | scheduleBlock | read | ❌ Hardcoded | `server/modules/scheduler/validation/scheduleBlockPackage.ts` |
| 570 | scheduleBlock | delete | ❌ Hardcoded | `server/modules/scheduler/validation/scheduleBlockPackage.ts` |
| 598 | weekSchedule | read | ❌ Hardcoded | `server/modules/scheduler/validation/weekSchedulePackage.ts` |
| 605 | weekSchedule | list | ❌ Hardcoded | `server/modules/scheduler/validation/weekSchedulePackage.ts` |
| 618 | weekSchedule | delete | ❌ Hardcoded | `server/modules/scheduler/validation/weekSchedulePackage.ts` |
| 622 | shift | read | ❌ Hardcoded | `server/modules/scheduler/validation/shiftPackage.ts` |
| 629 | shift | list | ❌ Hardcoded **+ Bug** | `server/modules/scheduler/validation/shiftPackage.ts` |
| 634 | shift | delete | ❌ Hardcoded | `server/modules/scheduler/validation/shiftPackage.ts` |
| 703 | scheduleBlock | list | ❌ Hardcoded | `server/modules/scheduler/validation/scheduleBlockPackage.ts` |

**🚨 Critical Bug**: Line 629-633 shift list operation ignores `assembledData.weekScheduleId` filter

#### **User Module** ✅ READY
| Line | Entity | Operation | Status | Package Location |
|------|---------|-----------|--------|------------------|
| 640 | authProfile | read | ❌ Hardcoded | `server/modules/users/validation/authProfilePackage.ts` |
| 651 | userRegistration | create | ❌ Hardcoded | `server/modules/users/validation/userRegistrationPackage.ts` |
| 661 | userManagement | all | ❌ Hardcoded | `server/modules/users/validation/userManagementPackage.ts` |
| 666 | userBulk | all | ❌ Hardcoded | `server/modules/users/validation/userBulkPackage.ts` |
| 691 | userSingle | all | ❌ Hardcoded | `server/modules/users/validation/userSinglePackage.ts` |
| 696 | userList | read | ❌ Hardcoded | `server/modules/users/validation/userListPackage.ts` |

#### **Location Module** ✅ READY
| Line | Entity | Operation | Status | Package Location |
|------|---------|-----------|--------|------------------|
| 710 | location | list | ❌ Hardcoded | `server/modules/locations/validation/locationPackage.ts` |

#### **Email Module** ✅ READY
| Line | Entity | Operation | Status | Package Location |
|------|---------|-----------|--------|------------------|
| 717 | emailConfig | read | ❌ Hardcoded | `server/modules/email/validation/emailConfigPackage.ts` |
| 743 | emailConfig | create/update | ❌ Hardcoded | `server/modules/email/validation/emailConfigPackage.ts` |
| 755 | emailTest | create/send | ❌ Hardcoded | `server/modules/development/validation/packages/emailTestPackage.ts` |
| 767 | emailSent | read | ❌ Hardcoded | `server/modules/email/validation/emailSentPackage.ts` |
| 773 | emailSent | delete | ❌ Hardcoded | `server/modules/email/validation/emailSentPackage.ts` |

### Migration Implementation Requirements

#### **Phase 1: VE30Package Interface Extension**
- ✅ All packages exist and are registered in `packageRegistry30.ts` (lines 40-69)
- ❌ Missing: `storageActions` section in VE30Package interface
- ❌ Missing: Package storage action implementations

#### **Phase 2: ValidationEngine30 Package Discovery**
- ❌ Missing: Dynamic package storage action detection
- ❌ Missing: Package-driven execution logic
- ❌ Missing: Fallback to hardcoded blocks during transition

#### **Phase 3: Gradual Migration Tracking**
- **Total Hardcoded Blocks**: 21
- **Migrated to Package-Driven**: 0
- **Remaining Hardcoded**: 21
- **Critical Bugs to Fix**: 1 (shift list filter)

### Success Criteria
- [ ] All 21 hardcoded blocks eliminated from ValidationEngine30
- [ ] Package-driven architecture operational across all modules
- [ ] Shift list filtering bug resolved (line 629-633)
- [ ] Zero performance regression (within 10% tolerance)
- [ ] All existing functionality preserved

### Migration Strategy
Following **Plan 066: VE30 Hybrid Package-Driven Architecture Implementation** for systematic migration starting with scheduler module as proof-of-concept, then expanding to all modules.

---

## High Priority - Production Stability

### 1. Race Condition Protection for Multi-User Environment
**Priority**: Critical
**Effort**: High
**Risk**: System failure under concurrent load

**Problem**: Current server-side upsert logic vulnerable to race conditions when multiple users are messaging simultaneously. If MongoDB connection drops or PostgreSQL queries are slow, multiple requests might bypass duplicate prevention.

**Solution Requirements**:
- Distributed locking mechanism using Redis
- Lock key pattern: `note:lock:${userId}:${workflow}`
- 5-second timeout with automatic release
- Request queuing for locked operations

### 2. Circuit Breaker Pattern Implementation
**Priority**: Critical
**Effort**: Medium
**Risk**: Resource exhaustion during outages

**Problem**: System continues attempting MongoDB operations indefinitely during failures, leading to connection pool exhaustion and cascade failures.

**Solution Requirements**:
- Stop processing after 3 failures within 30-second window
- Automatic service degradation to read-only mode
- Clear error responses to prevent client retry storms
- Health check endpoint for load balancer integration

### 3. Data Integrity Cleanup Strategy
**Priority**: High
**Effort**: Medium
**Risk**: Database corruption and orphaned documents

**Problem**: Failed hybrid operations can leave orphaned MongoDB documents or broken PostgreSQL ObjectId references.

**Solution Requirements**:
- Scheduled cleanup job for orphaned MongoDB documents
- PostgreSQL integrity checks for invalid ObjectId references
- Automatic rollback mechanism for failed hybrid operations
- Data consistency verification tools

### 4. Graceful Degradation and User Experience
**Priority**: High
**Effort**: Medium
**Risk**: Poor user experience during outages

**Problem**: Users receive generic errors and lose content when messaging system fails.

**Solution Requirements**:
- Read-only mode during MongoDB outages
- Write operation queuing for later processing
- Clear user notifications about system status
- Content preservation during failures

## Medium Priority - Code Quality

### 5. Authentication Redirect Naming Standardization
**Priority**: Medium
**Effort**: Low
**Risk**: Developer confusion and maintenance overhead

**Problem**: Inconsistent naming between `redirectUrl` and `redirectScript` across authentication system components.

**Current State**: 
- Server: Uses `redirectScript` variable and field
- Comments/documentation: References both `redirectUrl` and `redirectScript`
- Historical code: Mixed usage patterns

**Solution Requirements**:
- Choose single naming convention (`redirectUrl` OR `redirectScript`)
- Update all auth-related components consistently
- Update comments and documentation
- Ensure frontend/backend field name alignment

### 6. Fix Normal Logout ✅ COMPLETED
**Priority**: High
**Effort**: Low
**Status**: RESOLVED - July 16, 2025

**Problem**: AuthService.logout() was using development-only `/api/auth/dev-logout` endpoint causing passport reference issues in production flow.

**Solution Implemented**:
- Changed from GET `/api/auth/dev-logout` to POST `/api/auth/logout`
- Updated to use production logout endpoint with proper headers
- Added Content-Type application/json and POST method
- Maintained error handling for silent failure

### 7. Figure Out Protected Routes Configuration
**Priority**: High
**Effort**: Medium
**Risk**: Security vulnerabilities and inconsistent access control

**Problem**: Current protected route system has inconsistencies across the application with mixed permission checking patterns. Need unified approach for route protection that works consistently across all pages and API endpoints.

**Current Issues**:
- Mixed authentication middleware patterns
- Inconsistent permission validation  
- Some routes bypass protection checks
- Complex role-based access control needs simplification

**Solution Requirements**:
- Centralized route protection configuration
- Consistent permission checking across frontend and backend
- Clear documentation of which routes require which permissions
- Unified ProtectedRoute component for React routes
- Standardized middleware for API route protection
- Automatic retry with exponential backoff

## Medium Priority - Monitoring and Observability

### 5. Production Monitoring Dashboard
**Priority**: Medium
**Effort**: Medium

**Requirements**:
- Real-time metrics for hybrid cache hit/miss ratios
- MongoDB connection health monitoring
- Auto-save operation success/failure rates
- User session distribution and load patterns

### 6. Prevent Duplicate Notes
**Priority**: Medium
**Effort**: Medium

### 7. Performance Optimization
**Priority**: Medium
**Effort**: Low

**Requirements**:
- Connection pooling optimization
- Cache TTL tuning based on usage patterns
- Database query optimization
- Batch operation support for bulk updates

## Low Priority - Future Enhancements

### 7. Message Versioning System
**Priority**: Low
**Effort**: High

**Requirements**:
- Document history tracking in MongoDB
- Conflict resolution for simultaneous edits
- Version comparison and merge capabilities

### 8. Advanced Security Features
**Priority**: Low
**Effort**: Medium

**Requirements**:
- Message encryption at rest in MongoDB
- Audit logging for all note operations
- Rate limiting per user/session
- Content validation and sanitization

### 9. Dynamic Import Module Resolution Configuration
**Priority**: Low
**Effort**: Medium
**Risk**: ValidationEngine30 functionality limited

**Problem**: TypeScript/Node.js ESM dynamic import resolution ignores project directory structure. Dynamic imports resolve to `/workspace/services/` instead of `/workspace/server/services/` while static imports work correctly.

**Evidence**: 
- Static imports: `import { func } from '../services/validation/file'` ✅ Working
- Dynamic imports: `await import('../services/validation/file')` ❌ Failed (wrong path resolution)
- Error: `Cannot find module '/home/runner/workspace/services/validation/file.js'`

**Impact**: 
- ValidationEngine30 /api/validation/v3/execute endpoint broken
- Applicants page data loading fails
- Permission mapping centralization blocked

**Solution Requirements**:
- Investigate tsx/Vite ESM module resolution configuration
- Fix dynamic import path resolution to respect server/ directory
- Alternative: Refactor to static imports with conditional loading patterns

### 10. Permission Mapping Architecture Code Duplication
**Priority**: Medium
**Effort**: Low

**Problem**: Permission mapping logic duplicated across validation routes despite centralized service creation.

**Evidence**:
- Centralized service: `server/services/validation/validation-perm-mapping.ts` ✅ Created
- Static imports working: `validation/test.ts` and `validation/engine.ts` ✅ Using service
- Dynamic import broken: `validation-v3.ts` ❌ Cannot import service

**Current State**:
- 2 files use centralized service successfully
- 1 file reverted to duplicated logic due to dynamic import failure
- Architecture partially implemented

**Solution Requirements**:
- Resolve dynamic import issue (see #9)
- Complete migration to centralized permission mapping
- Eliminate remaining duplicate permission logic

## Implementation Notes

**Testing Strategy**:
- Load testing with concurrent users
- Chaos engineering for MongoDB failures
- Network latency simulation
- Connection pool exhaustion scenarios

**Rollout Plan**:
1. Implement distributed locking first (highest impact)
2. Add circuit breaker pattern
3. Deploy cleanup mechanisms
4. Enhance user experience features

**Success Metrics**:
- Zero data loss during outages
- <100ms response time for note operations
- 99.9% uptime for messaging functionality
- User satisfaction scores above 4.5/5

---

*Last Updated*: June 25, 2025
*Priority Review Date*: July 15, 2025