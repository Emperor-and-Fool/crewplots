# Database Schema Documentation

## Overview
CrewPlotsManager uses PostgreSQL with Drizzle ORM for type-safe database operations. The schema is defined in `shared/schema.ts` and supports a comprehensive restaurant management system.

## Core Tables

### Users Table
Central user management for all system participants.

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  name: varchar('name', { length: 255 }).notNull(),
  role: roleEnum('role').notNull(),
  locationId: integer('location_id').references(() => locations.id),
  phoneNumber: varchar('phone_number', { length: 20 }),
  uniqueCode: varchar('unique_code', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

#### Role Enumeration
```typescript
export const roleEnum = pgEnum('role', [
  'administrator',
  'manager', 
  'crew_manager',
  'crew_member',
  'applicant'
]);
```

### Applicants Table
Job application management and tracking.

```typescript
export const applicants = pgTable('applicants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  status: applicantStatusEnum('status').notNull().default('new'),
  resumeUrl: varchar('resume_url', { length: 500 }),
  notes: text('notes'),
  extraMessage: text('extra_message'),
  locationId: integer('location_id').references(() => locations.id),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

#### Applicant Status Flow
```typescript
export const applicantStatusEnum = pgEnum('applicant_status', [
  'new',
  'contacted', 
  'interviewed',
  'hired',
  'rejected',
  'short-listed'
]);
```

### Messages Table
Communication system between staff and applicants.

```typescript
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  applicantId: integer('applicant_id').notNull().references(() => applicants.id),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  messageType: messageTypeEnum('message_type').notNull().default('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messageTypeEnum = pgEnum('message_type', ['note', 'communication']);
```

### Locations Table
Multi-location support for restaurant chains.

```typescript
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  contactPerson: varchar('contact_person', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  ownerId: integer('owner_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Staff Management Tables

### Departments Table
Organizational structure within locations.

```typescript
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  locationId: integer('location_id').notNull().references(() => locations.id),
  description: text('description'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Staff Table
Employee records and position tracking.

```typescript
export const staff = pgTable('staff', {
  id: serial('id').primaryKey(),
  locationId: integer('location_id').notNull().references(() => locations.id),
  userId: integer('user_id').notNull().references(() => users.id),
  position: varchar('position', { length: 255 }).notNull(),
  positionId: integer('position_id').references(() => positions.id),
  wantedHours: integer('wanted_hours').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Positions Table
Standardized job positions across locations.

```typescript
export const positions = pgTable('positions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  departmentId: integer('department_id').references(() => departments.id),
  basePayRate: decimal('base_pay_rate', { precision: 8, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Competency Management

### Competencies Table
Skills and competency definitions.

```typescript
export const competencies = pgTable('competencies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  maxLevel: integer('max_level').notNull().default(5),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Staff Competencies Table
Individual competency assessments.

```typescript
export const staffCompetencies = pgTable('staff_competencies', {
  id: serial('id').primaryKey(),
  competencyId: integer('competency_id').notNull().references(() => competencies.id),
  staffId: integer('staff_id').notNull().references(() => staff.id),
  level: integer('level').notNull(),
  notes: text('notes'),
  assessedBy: integer('assessed_by').references(() => users.id),
  assessedAt: timestamp('assessed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Scheduling System

### Schedule Templates Table
Reusable scheduling patterns.

```typescript
export const scheduleTemplates = pgTable('schedule_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  locationId: integer('location_id').notNull().references(() => locations.id),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Template Shifts Table
Individual shifts within templates.

```typescript
export const templateShifts = pgTable('template_shifts', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').notNull().references(() => scheduleTemplates.id),
  role: varchar('role', { length: 255 }).notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 6 = Saturday
  startTime: varchar('start_time', { length: 10 }).notNull(), // HH:MM format
  endTime: varchar('end_time', { length: 10 }).notNull(),
  competencyId: integer('competency_id').references(() => competencies.id),
  requiredCompetencyLevel: integer('required_competency_level'),
  notes: text('notes'),
});
```

### Schedules Table
Actual published schedules.

```typescript
export const schedules = pgTable('schedules', {
  id: serial('id').primaryKey(),
  locationId: integer('location_id').notNull().references(() => locations.id),
  templateId: integer('template_id').references(() => scheduleTemplates.id),
  weekStartDate: date('week_start_date').notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Shifts Table
Individual assigned shifts.

```typescript
export const shifts = pgTable('shifts', {
  id: serial('id').primaryKey(),
  scheduleId: integer('schedule_id').notNull().references(() => schedules.id),
  staffId: integer('staff_id').references(() => staff.id),
  role: varchar('role', { length: 255 }).notNull(),
  date: date('date').notNull(),
  startTime: varchar('start_time', { length: 10 }).notNull(),
  endTime: varchar('end_time', { length: 10 }).notNull(),
  competencyId: integer('competency_id').references(() => competencies.id),
  requiredCompetencyLevel: integer('required_competency_level'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Cash Management

### Cash Counts Table
Daily cash reconciliation tracking.

```typescript
export const cashCounts = pgTable('cash_counts', {
  id: serial('id').primaryKey(),
  locationId: integer('location_id').notNull().references(() => locations.id),
  createdBy: integer('created_by').notNull().references(() => users.id),
  countType: countTypeEnum('count_type').notNull(),
  countDate: date('count_date').notNull(),
  cashAmount: decimal('cash_amount', { precision: 10, scale: 2 }).notNull(),
  cardAmount: decimal('card_amount', { precision: 10, scale: 2 }).notNull(),
  floatAmount: decimal('float_amount', { precision: 10, scale: 2 }).notNull(),
  discrepancies: decimal('discrepancies', { precision: 10, scale: 2 }),
  notes: text('notes'),
  verifiedBy: integer('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const countTypeEnum = pgEnum('count_type', ['opening', 'midday', 'closing']);
```

## Document Management

### Document Attachments Table
File attachments for various entities.

```typescript
export const documentAttachments = pgTable('document_attachments', {
  id: serial('id').primaryKey(),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  uploadedBy: integer('uploaded_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const entityTypeEnum = pgEnum('entity_type', [
  'applicant',
  'staff', 
  'location',
  'kb_article',
  'cash_count'
]);
```

## Knowledge Base

### KB Articles Table
Internal documentation and procedures.

```typescript
export const kbArticles = pgTable('kb_articles', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }),
  tags: varchar('tags', { length: 500 }), // JSON array as string
  isPublished: boolean('is_published').notNull().default(false),
  authorId: integer('author_id').notNull().references(() => users.id),
  locationId: integer('location_id').references(() => locations.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

## Relationships and Constraints

### Foreign Key Relationships
```typescript
// User-Location relationship
users.locationId → locations.id

// Applicant relationships
applicants.locationId → locations.id
applicants.userId → users.id

// Message relationships  
messages.applicantId → applicants.id
messages.userId → users.id

// Staff management relationships
staff.locationId → locations.id
staff.userId → users.id
staff.positionId → positions.id

// Scheduling relationships
schedules.locationId → locations.id
schedules.templateId → scheduleTemplates.id
shifts.scheduleId → schedules.id
shifts.staffId → staff.id

// Document attachments (polymorphic)
documentAttachments.entityId → various tables based on entityType
```

### Unique Constraints
```typescript
// Prevent duplicate usernames
users.username (UNIQUE)

// Prevent duplicate staff assignments
UNIQUE(staff.locationId, staff.userId)

// Prevent duplicate competency assessments
UNIQUE(staffCompetencies.staffId, staffCompetencies.competencyId)
```

## Schema Migration Strategy

### Development Workflow
```bash
# Apply schema changes to development database
npm run db:push

# Generate migrations for production
npm run db:generate

# Apply migrations to production
npm run db:migrate
```

### Important Notes
- Never manually write SQL migrations
- Always use `npm run db:push` for development
- Use Drizzle's migration system for production deployments
- Database constraints enforce data integrity at the database level

## Type Generation

### Drizzle Types
```typescript
// Generated select types
export type User = typeof users.$inferSelect;
export type Applicant = typeof applicants.$inferSelect;
export type Message = typeof messages.$inferSelect;

// Generated insert types  
export type InsertUser = typeof users.$inferInsert;
export type InsertApplicant = typeof applicants.$inferInsert;
export type InsertMessage = typeof messages.$inferInsert;
```

### Zod Schema Integration
```typescript
// Validation schemas derived from database schema
export const insertUserSchema = createInsertSchema(users);
export const insertApplicantSchema = createInsertSchema(applicants);
export const insertMessageSchema = createInsertSchema(messages);

// Runtime type inference
export type InsertUserType = z.infer<typeof insertUserSchema>;
export type InsertApplicantType = z.infer<typeof insertApplicantSchema>;
```

This schema provides a robust foundation for the restaurant management system, with proper relationships, constraints, and type safety throughout the application.