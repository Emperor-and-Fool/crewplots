# Critical Development Guidelines

## MongoDB Integration Requirements

**NEVER FALL BACK TO POSTGRESQL FOR NOTE STORAGE**

The system MUST fail visibly when MongoDB is unavailable.
No fallback mechanisms are allowed.
No silent degradation to PostgreSQL storage.

### When MongoDB connection fails:
- Show clear error messages
- Display connection status
- Fail fast and loud
- Do NOT attempt PostgreSQL fallback

### This ensures:
- Data integrity maintained
- Infrastructure issues are visible
- No silent data loss or corruption
- Clear system health monitoring

**VIOLATION OF THIS RULE IS UNACCEPTABLE**

## User Requirement: Visible Failures Only

The system architecture prioritizes data integrity over availability. MongoDB unavailability should result in clear, visible failures rather than silent fallbacks that could compromise data consistency.