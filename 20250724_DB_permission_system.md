**INVESTIGATION COMPLETE - HARD DATA FOUND:**

1. ALL ROLES IN DATABASE:

```
administrator  (highest)
manager        
crew_manager   
crew_member    
applicant      (lowest)
```

2. SCHEDULE MODULE PERMISSIONS IN DATABASE:

```
schedule.assign_users        - Assign users to shifts
schedule.create             - Create new schedule blocks  
schedule.delete             - Remove schedule blocks
schedule.manage_permissions - Manage scheduling permissions
schedule.read               - View existing schedule blocks
schedule.update             - Modify existing schedule blocks
scheduler_development       - Base access to scheduler workflow
scheduler_development.execute - Execute access to promote templates
scheduler_development.read    - Read access to view shift plans
scheduler_development.write   - Write access to modify shift plans
```

3. CURRENT ROLE-PERMISSION MAPPING (Administrator Only):

**Database shows only `administrator` role has schedule permissions assigned.**

```
administrator → ALL 10 schedule permissions
manager       → NO schedule permissions  
crew_manager  → NO schedule permissions
crew_member   → NO schedule permissions
applicant     → NO schedule permissions

```
4. MISSING DATA TABLES NEEDED:

- **Role Capability Levels:** What CRUD level each role can achieve
- **Module Permission Sets:** All available permissions per module
- **Workflow-Module Gates:** Which workflows access which modules

**PROOF:** Current hardcoded lines 88-139 contradicts database reality - most roles have zero schedule permissions in database but hardcoded permissions in code.