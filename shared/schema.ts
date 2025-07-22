import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  timestamp, 
  date,
  json, 
  jsonb,
  foreignKey, 
  varchar, 
  decimal,
  index,
  uniqueIndex,
  unique,
  primaryKey
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Utility function to generate secure public IDs
export function generatePublicId(length: number = 12): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return result;
}

// Locations (different bars/restaurants)
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  public_id: text("public_id").unique(),
  name: text("name").notNull(),
  address: text("address"),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  logoUrl: text("logo_url"), // File path for uploaded logo
  welcomeContent: text("welcome_content"), // MongoDB ObjectId for rich content
  status: text("status").default("active"), // active, inactive, archived
  timezone: text("timezone").default("Europe/Amsterdam"),
  settings: jsonb("settings"), // Location-specific settings
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ownerId: integer("owner_id"), // Set after user creation to avoid circular reference
});

// Roles table
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Role Permissions junction table
export const rolePermissions = pgTable("role_permissions", {
  roleId: integer("role_id").references(() => roles.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  };
});

// Users & Auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  public_id: text("public_id").unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),            // Add firstName field (nullable for migration)
  lastName: text("last_name"),              // Add lastName field (nullable for migration)
  name: text("name").notNull(),             // Keep for backwards compatibility
  // Default role for backward compatibility, will be replaced by user_locations table
  role: text("role", { enum: ["administrator", "owner", "manager", "app_manager", "crew_chief", "crew_manager", "crew_member", "applicant"] }).notNull(),
  // locationId kept for backward compatibility
  locationId: integer("location_id").references(() => locations.id),
  phoneNumber: text("phone_number"),        // Combined phone number in format +xx xxxxxxx
  // Applicant-specific fields (for users with role="applicant")
  status: text("status", { enum: ["new", "contacted", "interviewed", "hired", "rejected", "short-listed"] }).default("new"),
  resumeUrl: text("resume_url"),
  notes: text("notes"),
  // Workflow-based permissions system
  workflowPermissions: jsonb("workflow_permissions").$type<{
    [workflowName: string]: string[] // array of permissions like ['view', 'hire', 'delete']
  }>(),
  blockedPermissions: jsonb("blocked_permissions").$type<{
    [workflowName: string]: string[] // permissions to BLOCK for administrators
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Locations junction table is defined below with crew member support

// Competencies - now explicitly associated with locations
export const competencies = pgTable("competencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  locationId: integer("location_id").references(() => locations.id).notNull(), // Each competency belongs to a specific location
  createdBy: integer("created_by").references(() => users.id), // Track who created the competency
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Positions/Functions - defined by crew managers for their location
export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  locationId: integer("location_id").references(() => locations.id).notNull(), // Each position belongs to a specific location
  createdBy: integer("created_by").references(() => users.id), // Track who created the position
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Position Required Competencies - mapping positions to required competencies with minimum levels
export const positionCompetencies = pgTable("position_competencies", {
  positionId: integer("position_id").references(() => positions.id).notNull(),
  competencyId: integer("competency_id").references(() => competencies.id).notNull(),
  minimumLevel: integer("minimum_level").default(1).notNull(), // 0-5 scale, default to 1
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.positionId, table.competencyId] }),
  };
});

// User-Location Assignments (multi-location crew member support)
export const userLocations = pgTable("user_locations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  roleAtLocation: text("role_at_location", { 
    enum: ["crew_member", "crew_manager", "floor_manager"] 
  }).notNull(),
  position: text("position"), // Position at this specific location
  department: text("department"), // Department at this specific location
  hireDate: timestamp("hire_date"), // When hired at this location
  status: text("status", { enum: ["active", "inactive", "on_leave"] }).default("active"),
  wantedHours: integer("wanted_hours"), // Desired hours at this location
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Ensure unique user-location combinations
    userLocationUnique: primaryKey({ columns: [table.userId, table.locationId] }),
    // Indexes for efficient querying
    userIdIdx: index("idx_user_locations_user_id").on(table.userId),
    locationIdIdx: index("idx_user_locations_location_id").on(table.locationId),
    activeStatusIdx: index("idx_user_locations_active").on(table.locationId, table.status),
  };
});

// User Competencies (replacing staff_competencies, attached to users directly)
export const userCompetencies = pgTable("user_competencies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  competencyId: integer("competency_id").references(() => competencies.id).notNull(),
  level: integer("level").notNull(), // 0-5 scale
  assessedBy: integer("assessed_by").references(() => users.id), // Who assessed this competency
  assessedAt: timestamp("assessed_at"), // When the assessment was done
  locationId: integer("location_id").references(() => locations.id), // Competency assessment context
  notes: text("notes"), // Optional assessment notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Ensure unique user-competency combinations per location
    userCompetencyLocationUnique: primaryKey({ columns: [table.userId, table.competencyId, table.locationId] }),
    userIdIdx: index("idx_user_competencies_user_id").on(table.userId),
    competencyIdIdx: index("idx_user_competencies_competency_id").on(table.competencyId),
    locationIdIdx: index("idx_user_competencies_location_id").on(table.locationId),
  };
});





// User Documents
export const userNotes = pgTable("user_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  noteName: text("note_name").notNull(),
  noteUrl: text("note_url").notNull(),
  fileType: text("file_type"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
});

// Schedule Templates
export const scheduleTemplates = pgTable("schedule_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Template Shifts - Simplified for future development
export const templateShifts = pgTable("template_shifts", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => scheduleTemplates.id),
  dayOfWeek: integer("day_of_week"), // 0-6 for Sunday-Saturday
  startTime: text("start_time"),
  endTime: text("end_time"),
  position: text("position"), // Basic position field for future role mapping
  notes: text("notes"),
});

// Schedule Blocks - Multi-week containers for production planning
export const scheduleBlocks = pgTable("schedule_blocks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // e.g. "Production Season 1", "Festival Block 2024"
  description: text("description"),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  maxWeeks: integer("max_weeks"), // Week count - NULL until manager sets it, then immutable
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  locationIdx: index("idx_schedule_blocks_location").on(table.locationId),
  nameIdx: index("idx_schedule_blocks_name").on(table.name),
}));

// Week Schedules - Now simplified to focus on week-specific data
export const weekSchedules = pgTable("week_schedules", {
  id: serial("id").primaryKey(),
  scheduleBlockId: integer("schedule_block_id").references(() => scheduleBlocks.id).notNull(),
  weekNumber: integer("week_number").notNull(), // Week position within schedule block
  templateId: integer("template_id").references(() => scheduleTemplates.id),
  weekStructureLocked: boolean("week_structure_locked").notNull().default(false), // Controls week structure immutability
  createdBy: integer("created_by").references(() => users.id).notNull(), // Database has this field
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  scheduleBlockIdx: index("idx_week_schedules_block").on(table.scheduleBlockId),
  templateIdx: index("idx_week_schedules_template").on(table.templateId),
  blockWeekUnique: unique("week_schedules_block_week_unique").on(table.scheduleBlockId, table.weekNumber),
}));

// Shifts (actual scheduled shifts) - Enhanced for scheduler
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id"), // Legacy field - still in database
  weekScheduleId: integer("week_schedule_id").references(() => weekSchedules.id), // Current field
  shiftGroupId: text("shift_group_id"), // Groups shifts created together for multi-day template editing
  batchId: text("batch_id"), // Groups shifts created together across multiple weeks
  userId: integer("user_id").references(() => users.id),
  date: date("date"), // Database uses date type
  dayOfWeek: text("day_of_week", { 
    enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] 
  }),
  startTime: text("start_time"), // Database uses time type but stored as text
  endTime: text("end_time"), // Database uses time type but stored as text
  title: varchar("title", { length: 255 }).notNull().default("Untitled Shift"),
  position: varchar("position"),
  maxSlots: integer("max_slots").default(1).notNull(),
  subscriptionDeadline: timestamp("subscription_deadline"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  weekScheduleIdx: index("idx_shifts_week_schedule").on(table.weekScheduleId),
  shiftGroupIdx: index("idx_shifts_group").on(table.shiftGroupId),
  batchIdx: index("idx_shifts_batch").on(table.batchId),
  dayOfWeekIdx: index("idx_shifts_day_of_week").on(table.dayOfWeek),

  subscriptionDeadlineIdx: index("idx_shifts_subscription_deadline").on(table.subscriptionDeadline),
}));

// Shift Requirements - Link shifts to required competencies
export const shiftRequirements = pgTable("shift_requirements", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => shifts.id, { onDelete: "cascade" }).notNull(),
  competencyId: integer("competency_id").references(() => competencies.id).notNull(),
  minimumLevel: integer("minimum_level").default(1).notNull(),
  requiredCount: integer("required_count").default(1).notNull(),
  weight: decimal("weight", { precision: 3, scale: 2 }).default("1.0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  shiftCompetencyUnique: uniqueIndex("unique_shift_competency").on(table.shiftId, table.competencyId),
  shiftIdIdx: index("idx_shift_requirements_shift").on(table.shiftId),
  competencyIdIdx: index("idx_shift_requirements_competency").on(table.competencyId),
}));

// Shift Subscriptions - Crew member interest tracking
export const shiftSubscriptions = pgTable("shift_subscriptions", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => shifts.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  interestLevel: integer("interest_level").default(3).notNull(),
  availabilityConfirmed: boolean("availability_confirmed").default(true).notNull(),
  notes: text("notes"),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
}, (table) => ({
  shiftUserUnique: uniqueIndex("unique_shift_subscription").on(table.shiftId, table.userId),
  shiftIdIdx: index("idx_shift_subscriptions_shift").on(table.shiftId),
  userIdIdx: index("idx_shift_subscriptions_user").on(table.userId),
}));

// Shift Assignments - Final crew assignments
export const shiftAssignments = pgTable("shift_assignments", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => shifts.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id).notNull(),
  competencyMatchScore: decimal("competency_match_score", { precision: 5, scale: 2 }),
  assignmentNotes: text("assignment_notes"),
  status: text("status", { enum: ["confirmed", "pending", "cancelled"] }).default("confirmed").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => ({
  shiftUserUnique: uniqueIndex("unique_shift_assignment").on(table.shiftId, table.userId),
  shiftIdIdx: index("idx_shift_assignments_shift").on(table.shiftId),
  userIdIdx: index("idx_shift_assignments_user").on(table.userId),
}));

// Scheduling Windows - Configurable viewing periods
export const schedulingWindows = pgTable("scheduling_windows", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  role: text("role").notNull(),
  weeksAhead: integer("weeks_ahead").default(4).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  locationRoleUnique: uniqueIndex("unique_location_role").on(table.locationId, table.role),
}));

// Cash Management
export const cashCounts = pgTable("cash_counts", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  countType: text("count_type", { enum: ["opening", "midday", "closing"] }).notNull(),
  countDate: timestamp("count_date").notNull(),
  cashAmount: decimal("cash_amount", { precision: 10, scale: 2 }).notNull(),
  cardAmount: decimal("card_amount", { precision: 10, scale: 2 }).notNull(),
  floatAmount: decimal("float_amount", { precision: 10, scale: 2 }).notNull(),
  expectedAmount: decimal("expected_amount", { precision: 10, scale: 2 }),
  discrepancy: decimal("discrepancy", { precision: 10, scale: 2 }),
  notes: text("notes"),
  verifiedBy: integer("verified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
});

// Knowledge Base Categories
export const kbCategories = pgTable("kb_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Knowledge Base Articles
export const kbArticles = pgTable("kb_articles", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => kbCategories.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  images: json("images").$type<string[]>(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});





// Document Attachments - Feature not implemented yet
// TODO: Implement document attachment system when adding file management
/*
export const documentAttachments = pgTable("document_attachments", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => uploadedFiles.id).notNull(),
  entityType: text("entity_type", { 
    enum: ["applicant", "staff", "location", "kb_article", "cash_count"] 
  }).notNull(),
  entityId: integer("entity_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
*/

// Note References - Main note metadata and references
export const noteRefs = pgTable("note_refs", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(), // Stores MongoDB ObjectId OR actual content (fallback mode)
  messageType: text("message_type", { 
    enum: ["text", "rich-text", "system", "notification"] 
  }).default("text").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id), // Optional recipient
  isPrivate: boolean("is_private").default(false).notNull(),
  attachmentUrl: text("attachment_url"), // Legacy field
  noteReference: text("note_reference"), // MongoDB note ID for sensitive files
  metadata: jsonb("metadata"), // Extensible field for emoji, formatting, etc.
  isRead: boolean("is_read").default(false).notNull(),
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] }).default("normal").notNull(),
  workflow: text("workflow"),
  visibleToRoles: text("visible_to_roles").array(), // Array of roles that can view this note
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
  // New hybrid architecture fields
  noteId: varchar("note_id", { length: 24 }), // MongoDB ObjectId reference
  noteType: text("note_type").default("motivation"), // 'motivation', 'message', 'feedback', etc.
  title: text("title"), // Optional short description/subject
  status: text("status", { enum: ["draft", "published", "archived"] }).default("draft"),
  
  // Content Analytics
  wordCount: integer("word_count").default(0),
  characterCount: integer("character_count").default(0),
  htmlLength: integer("html_length").default(0),
  
  // Access Control
  visibility: text("visibility", { enum: ["private", "admins", "public"] }).default("private"),
  isEditable: boolean("is_editable").default(true),
  lastEditedAt: timestamp("last_edited_at"),
  
  // System Tracking
  version: integer("version").default(1),
  tags: jsonb("tags"), // JSON array for categorization
});

// Note Files - PostgreSQL fallback for MongoDB note storage
export const noteFiles = pgTable("note_files", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").references(() => noteRefs.id), // Back reference to PostgreSQL note
  content: text("content").notNull(), // Rich note content (HTML, markdown, etc.)
  contentType: text("content_type", { 
    enum: ["rich-text", "plain-text", "markdown"] 
  }).default("rich-text").notNull(),
  workflow: text("workflow", { 
    enum: ["application", "crew", "location", "scheduling", "knowledge", "statistics"] 
  }),
  wordCount: integer("word_count").default(0),
  characterCount: integer("character_count").default(0),
  htmlLength: integer("html_length").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Virtual Redis Cache - PostgreSQL fallback for Redis caching
export const redisCache = pgTable("redis_cache", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(), // Store any JSON data
  expiresAt: timestamp("expires_at"), // TTL equivalent
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Express Session Store - PostgreSQL backend for session storage
export const sessions = pgTable("sessions", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { mode: 'date' }).notNull(),
});

// Virtual Redis Sessions - PostgreSQL fallback for session storage
export const redisSessions = pgTable("redis_sessions", {
  id: text("id").primaryKey(), // Session ID
  sessionData: jsonb("session_data").notNull(), // Session content
  expiresAt: timestamp("expires_at").notNull(), // Session expiry
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, public_id: true, createdAt: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  public_id: true 
});
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true, createdAt: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ createdAt: true });
export const insertUserLocationSchema = createInsertSchema(userLocations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPositionSchema = createInsertSchema(positions).omit({ id: true, createdAt: true });
export const insertPositionCompetencySchema = createInsertSchema(positionCompetencies).omit({ createdAt: true });
export const insertCompetencySchema = createInsertSchema(competencies).omit({ id: true, createdAt: true });
export const insertUserCompetencySchema = createInsertSchema(userCompetencies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserNoteSchema = createInsertSchema(userNotes).omit({ id: true, uploadedAt: true, verifiedAt: true });
export const insertScheduleTemplateSchema = createInsertSchema(scheduleTemplates).omit({ id: true, createdAt: true });
export const insertTemplateShiftSchema = createInsertSchema(templateShifts).omit({ id: true });

export const insertScheduleBlockSchema = createInsertSchema(scheduleBlocks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWeekScheduleSchema = createInsertSchema(weekSchedules).omit({ id: true, createdAt: true, updatedAt: true });
// export const insertWeekSchema = createInsertSchema(weeks).omit({ id: true, createdAt: true, updatedAt: true }); // near-future-removal: Legacy table replaced with weekSchedules
export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true, createdAt: true });
export const updateShiftSchema = insertShiftSchema.partial();

// Creation-specific schemas for package validation (allow optional parent IDs)
export const createWeekScheduleSchema = z.object({
  weekNumber: z.number(),
  templateId: z.number().optional(),
  createdBy: z.number().optional(), // Optional during creation, set from package metadata
  scheduleBlockId: z.number().optional() // Optional during creation, will be set by transaction
});

export const createShiftSchema = z.object({
  title: z.string(),
  position: z.string().optional(),
  dayOfWeek: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  startTime: z.string(),
  endTime: z.string(),
  maxSlots: z.number().optional(),
  subscriptionDeadline: z.string().datetime().or(z.date()).optional(),
  weekScheduleId: z.number().optional() // Optional during creation, will be set by transaction
});
export const insertShiftRequirementSchema = createInsertSchema(shiftRequirements).omit({ id: true, createdAt: true });
export const insertShiftSubscriptionSchema = createInsertSchema(shiftSubscriptions).omit({ id: true, subscribedAt: true });
export const insertShiftAssignmentSchema = createInsertSchema(shiftAssignments).omit({ id: true, assignedAt: true });
export const insertSchedulingWindowSchema = createInsertSchema(schedulingWindows).omit({ id: true, createdAt: true });
export const insertCashCountSchema = createInsertSchema(cashCounts).omit({ id: true, createdAt: true });
export const insertKbCategorySchema = createInsertSchema(kbCategories).omit({ id: true, createdAt: true });
export const insertKbArticleSchema = createInsertSchema(kbArticles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNoteRefSchema = createInsertSchema(noteRefs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNoteFileSchema = createInsertSchema(noteFiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRedisCacheSchema = createInsertSchema(redisCache).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRedisSessionSchema = createInsertSchema(redisSessions).omit({ createdAt: true, updatedAt: true });

// export const insertNoteAttachmentSchema = createInsertSchema(documentAttachments).omit({ id: true, createdAt: true }); // near-future-removal: Feature not implemented yet

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// User registration schema (for applicants)
export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
  confirmPassword: z.string()
    .min(1, "Please confirm your password"),
  phoneNumber: z.string().min(1, "Phone number is required")
    .regex(/^\+\d{1,4}\s\d{5,12}$/, "Phone number must be in format +xx xxxxxxx"),
  address: z.string().min(1, "Address is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Types for drizzle tables
export type UserNote = typeof userNotes.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type InsertUserLocation = z.infer<typeof insertUserLocationSchema>;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type InsertPositionCompetency = z.infer<typeof insertPositionCompetencySchema>;
export type InsertCompetency = z.infer<typeof insertCompetencySchema>;
export type InsertUserCompetency = z.infer<typeof insertUserCompetencySchema>;
export type InsertUserNote = z.infer<typeof insertUserNoteSchema>;
export type InsertScheduleTemplate = z.infer<typeof insertScheduleTemplateSchema>;
export type InsertTemplateShift = z.infer<typeof insertTemplateShiftSchema>;

export type InsertScheduleBlock = z.infer<typeof insertScheduleBlockSchema>;
// export type InsertWeek = z.infer<typeof insertWeekSchema>; // near-future-removal: Legacy table replaced with weekSchedules
export type InsertWeekSchedule = z.infer<typeof insertWeekScheduleSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type InsertShiftRequirement = z.infer<typeof insertShiftRequirementSchema>;
export type InsertShiftSubscription = z.infer<typeof insertShiftSubscriptionSchema>;
export type InsertShiftAssignment = z.infer<typeof insertShiftAssignmentSchema>;
export type InsertSchedulingWindow = z.infer<typeof insertSchedulingWindowSchema>;
export type InsertCashCount = z.infer<typeof insertCashCountSchema>;
export type InsertKbCategory = z.infer<typeof insertKbCategorySchema>;
export type InsertKbArticle = z.infer<typeof insertKbArticleSchema>;
export type InsertMessage = z.infer<typeof insertNoteRefSchema>;
export type InsertNoteRef = z.infer<typeof insertNoteRefSchema>;
export type InsertNoteFile = z.infer<typeof insertNoteFileSchema>;
// export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>; // near-future-removal: Upload system removed
// export type InsertNoteAttachment = z.infer<typeof insertNoteAttachmentSchema>; // near-future-removal
export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;

export type User = typeof users.$inferSelect;

// Lazy Loading Permission Interfaces
export interface UserModulePermissions {
  user: {
    view: boolean;
    edit: boolean;
    hire: boolean;
    delete: boolean;
    manage_locations: boolean;
    view_applications: boolean;
  };
}

export interface SchedulerModulePermissions {
  schedule: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    assign_users: boolean;
    manage_permissions: boolean;
  };
}

export interface LocationModulePermissions {
  location: {
    access_all: boolean;
    access_owned: boolean;
    access_managed: boolean;
    access_assigned: boolean;
  };
}

export type Location = typeof locations.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type UserLocation = typeof userLocations.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type PositionCompetency = typeof positionCompetencies.$inferSelect;
export type Competency = typeof competencies.$inferSelect;
export type UserCompetency = typeof userCompetencies.$inferSelect;

export type ScheduleTemplate = typeof scheduleTemplates.$inferSelect;
export type TemplateShift = typeof templateShifts.$inferSelect;

export type ScheduleBlock = typeof scheduleBlocks.$inferSelect;
// export type Week = typeof weeks.$inferSelect; // near-future-removal: Legacy table replaced with weekSchedules
export type WeekSchedule = typeof weekSchedules.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type ShiftRequirement = typeof shiftRequirements.$inferSelect;
export type ShiftSubscription = typeof shiftSubscriptions.$inferSelect;
export type ShiftAssignment = typeof shiftAssignments.$inferSelect;
export type SchedulingWindow = typeof schedulingWindows.$inferSelect;
export type CashCount = typeof cashCounts.$inferSelect;
export type KbCategory = typeof kbCategories.$inferSelect;
export type KbArticle = typeof kbArticles.$inferSelect;

// Document attachment types - Feature not implemented yet
// TODO: Add DocumentAttachment and related types when implementing file management
export type Message = typeof noteRefs.$inferSelect;
export type NoteRef = typeof noteRefs.$inferSelect;
export type NoteFile = typeof noteFiles.$inferSelect;
export type HybridCache = typeof hybridCache.$inferSelect;
export type Session = typeof sessions.$inferSelect;

// Hybrid cache storage - PostgreSQL fallback for Redis cache
export const hybridCache = pgTable(
  "hybrid_cache",
  {
    key: varchar("key", { length: 255 }).primaryKey(),
    value: jsonb("value").notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    category: varchar("category", { length: 50 }).default("general").notNull(),
    size: integer("size").default(0).notNull(), // JSON size in bytes
  },
  (table) => {
    return {
      expiresAtIdx: index("hybrid_cache_expires_idx").on(table.expiresAt),
      categoryIdx: index("hybrid_cache_category_idx").on(table.category),
      createdAtIdx: index("hybrid_cache_created_idx").on(table.createdAt),
    };
  }
);




