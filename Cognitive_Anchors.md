# COGNITIVE ANCHORS - PLAN REFERENCE STRATEGY

**Problem:** During intensive implementation, developers lose track of architectural decisions, evidence sources, and scope boundaries.

**Solution:** Embed regular plan check reminders within the implementation plan itself, including scope boundary validation.

## COGNITIVE ANCHOR FORMULATIONS

### **At Phase Transitions:**

```
🔄 PLAN CHECK REMINDER: Before proceeding to next phase, verify:
- Current phase objectives achieved per plan evidence criteria
- Architecture decisions from this plan still being followed
- Any deviations documented with evidence justification
- Scope boundaries maintained (no protected system modifications)
- Reference plan document for architectural questions
```

### **Within Complex Phases:**

```
⚠️ IMPLEMENTATION CHECKPOINT: Return to this plan section if:
- Architecture questions arise (check plan evidence)
- Multiple approaches seem possible (follow plan decisions)
- Implementation differs from planned approach (document why)
- Performance targets unclear (reference specific plan metrics)
- Scope boundary violations detected (check protected systems)
```

### **At Critical Decision Points:**

```
📋 DECISION VALIDATION: Confirm this choice aligns with:
- Plan phase objectives and evidence sources
- Documented architectural decisions and safety measures
- Zero Risk Implementation strategy (parallel development)
- Defined scope boundaries and exclusion zones
```

### **Scope Boundary Checks:**

```
🚧 SCOPE BOUNDARY VALIDATION: Before any file modification, verify:
- File is within defined migration scope (check included/excluded lists)
- No Core API Modules affected (Categories 1-3 protected)
- BACKUP FILES CREATED (.bak, .bak1, .bak2) for ANY core system modification
- No unplanned dependencies introduced
- Rollback capability maintained (backup files created)
- Change aligns with architectural isolation requirements
```

### **Emergency Scope Violation Response:**

```
🚨 SCOPE VIOLATION DETECTED: If implementation exceeds boundaries:
- STOP immediately and return to plan scope definition
- Document what caused the scope expansion need
- Reassess migration approach within original boundaries
- Do NOT proceed without explicit scope boundary revision
- Maintain zero-disruption guarantee to working application
```

## IMPLEMENTATION STRATEGY

### **Pre-Implementation Anchors:**
- Always read scope boundary document before starting any phase
- Confirm all files to be modified are within included scope
- Verify protected systems remain untouched
- Create backup files as specified in rollback strategy

### **During Implementation Anchors:**
- Check cognitive anchors at every decision point
- Validate scope boundaries before any file modification
- Document any unexpected discoveries or scope questions
- Reference plan evidence when implementation questions arise

### **Post-Implementation Anchors:**
- Verify all changes stayed within defined scope boundaries
- Confirm no protected systems were affected
- Test rollback procedure to ensure 60-second restoration capability
- Document any scope boundary insights for future plans

## SCOPE BOUNDARY PROTECTION

### **Protected Systems (Backup Required Before ANY Modification):**
```typescript
// Core API Modules (Categories 1-3) - BACKUP REQUIRED
app.use('/api/auth', authRoutes);
app.use('/api/validation/v3', validationV3Routes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/applicant-portal', applicantPortalRoutes);
app.use('/api/mongodb', mongodbMessagesRoutes);
app.use('/api/messaging/notes', notesRoutes);
```

### **MANDATORY BACKUP PROTOCOL:**
```bash
# Before modifying ANY core system file, create backup:
cp filename.ts filename.bak       # First backup
cp filename.ts filename.bak1      # If .bak exists
cp filename.ts filename.bak2      # If .bak1 exists
# Continue sequence as needed (.bak3, .bak4, etc.)
```

**⚠️ CRITICAL RULE:** Core elements can ONLY be modified AFTER creating .bak, .bak1, .bak2, etc. backups. NO EXCEPTIONS.

### **Migration Touch Points (Minimal Changes Only):**
```typescript
// Feature-Specific Routes (Category 4) - LIMITED MODIFICATIONS
app.use('/api/email', emailRoutes);        // Line 160 - source change only
import emailRoutes from './routes/email';  // Line 69 - path change only
```

This creates **cognitive anchors** that pull you back to evidence-based decision making AND scope boundary compliance during intensive coding phases, ensuring zero disruption to working application functionality.