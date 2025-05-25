# Schema Migration Guide: Safe Field Removal

This guide outlines the proper steps for removing fields from the database schema in a production environment.

## 1. The Problem

Removing a field from a database schema seems straightforward, but can cause cascading errors:

- Database queries fail with "column does not exist" errors
- TypeScript interfaces become incompatible with actual data
- UI components try to render undefined fields
- Race conditions between schema changes and query execution

In our specific case with the `positionApplied` field in applicants, removing it from the schema first led to database queries failing because they were still referencing the removed field.

## 2. Safe Migration Process

### Step 1: Update All Database Queries First
Locate and update ALL references to the field in your application code:

```typescript
// Find all select queries using the field
const [applicant] = await db.select({
  id: applicants.id,
  name: applicants.name,
  email: applicants.email,
  phone: applicants.phone,
  positionApplied: applicants.positionApplied, // ← REMOVE THIS LINE
  status: applicants.status,
  // other fields...
}).from(applicants).where(eq(applicants.userId, userId));
```

Command-line search to find all references:
```bash
grep -r "positionApplied" server/ --include="*.ts"
```

### Step 2: Update Type Definitions
Update all TypeScript interfaces and type definitions to match the new schema:

```typescript
interface ApplicantProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  // positionApplied: string; // ← REMOVE THIS LINE
  status: string;
  resumeUrl: string | null;
  notes: string | null;
  // ...
}
```

### Step 3: Update UI Components
Remove all references to the field in UI components:

```tsx
// Remove field from display
<div>
  <p className="text-sm font-medium text-gray-500">Position Applied</p>
  <p className="text-lg">{profile.positionApplied}</p>
</div>

// Remove field from tables
<TableHead>Position</TableHead>

// Remove field from table rows
<TableCell>{applicant.positionApplied}</TableCell>
```

### Step 4: Update Schema Definition
Only after all code references are updated, modify the schema definition:

```typescript
export const applicants = pgTable("applicants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  // positionApplied: text("position_applied").notNull(), // ← REMOVE THIS LINE
  status: text("status", { enum: ["new", "contacted", "interviewed", "hired", "rejected"] }).default("new").notNull(),
  // ...
});
```

### Step 5: Test Before Restarting
- Ensure all query code is updated
- Make sure all UI components no longer reference the field
- Verify that type definitions are updated

### Step 6: Restart the Server
Only after all the above steps are complete, restart the server to apply the schema changes.

## 3. Common Pitfalls

- **Partial Updates**: Missing some references to the field in database queries
- **Order Mistake**: Changing the schema first, then trying to update queries
- **Schema vs. Database**: Not realizing that schema changes don't automatically alter the actual database (requires migrations or pushes)

## 4. Database Migration Tools

If using a tool like Drizzle:
```bash
npm run db:push
```

Or for more complex migrations:
```bash
npx drizzle-kit generate:pg
```

## 5. Lessons Learned

1. **Always update code before changing schema**: This prevents runtime errors
2. **Use grep or search tools**: Find ALL references to the field
3. **Small, incremental changes**: Change one thing at a time, verify it works
4. **Test with real data**: Ensure existing records still work after changes
5. **Script-based approach**: For bulk changes, consider writing scripts rather than manual edits

By following this systematic approach, we can safely remove or modify fields in the database schema without causing application crashes or data inconsistencies.