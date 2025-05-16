/**
 * Database Schema Definition Module
 * 
 * This module defines the entire database structure for Crew Plots Pro using Drizzle ORM.
 * It includes table definitions, relationships, constraints, and validation schemas.
 * 
 * The schema follows a role-based permission model with support for multiple locations,
 * staff competency tracking, scheduling, and applicant management.
 */

import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  timestamp, 
  json, 
  foreignKey, 
  varchar, 
  decimal,
  index,
  primaryKey
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Locations Table
 * 
 * Represents different bar/restaurant locations within the business.
 * Each location has its own staff, competencies, and schedules.
 * 
 * Key relationships:
 * - One-to-many with users (via userLocations junction table)
 * - One-to-many with competencies (location-specific skills)
 * - One-to-many with positions (location-specific roles)
 * - One-to-many with schedules (location-specific staffing)
 */
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ownerId: integer("owner_id"), // Set after user creation to avoid circular reference
});

/**
 * Roles Table
 * 
 * Defines system-level roles that determine access rights.
 * Examples: administrator, manager, crew_manager, crew_member
 * 
 * Key relationships:
 * - Many-to-many with permissions (via rolePermissions junction)
 * - Many-to-many with users and locations (via userLocations junction)
 */
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Permissions Table
 * 
 * Defines granular access permissions that can be assigned to roles.
 * Examples: manage_users, view_reports, edit_schedules
 * 
 * Key relationships:
 * - Many-to-many with roles (via rolePermissions junction)
 */
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Role Permissions Junction Table
 * 
 * Many-to-many relationship between roles and permissions.
 * Allows each role to have multiple permissions.
 */
export const rolePermissions = pgTable("role_permissions", {
  roleId: integer("role_id").references(() => roles.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  };
});

/**
 * Users Table
 * 
 * Core user account information for all users in the system.
 * Includes authentication data and basic profile information.
 * 
 * Note: Some fields (role, locationId) are maintained for backward 
 * compatibility but will be replaced by the userLocations junction table
 * in future updates for more flexible role management.
 * 
 * Key relationships:
 * - Many-to-many with locations (via userLocations junction)
 * - One-to-many with staff profiles
 * - One-to-many with applicant profiles
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),            // Add firstName field (nullable for migration)
  lastName: text("last_name"),              // Add lastName field (nullable for migration)
  name: text("name").notNull(),             // Keep for backwards compatibility
  // Default role for backward compatibility, will be replaced by user_locations table
  role: text("role", { enum: ["administrator", "manager", "crew_manager", "crew_member", "applicant"] }).notNull(),
  // locationId kept for backward compatibility
  locationId: integer("location_id").references(() => locations.id),
  phoneNumber: text("phone_number"),        // Combined phone number in format +xx xxxxxxx
  uniqueCode: text("unique_code").unique(), // Unique reference code for the user
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * User Locations Junction Table
 * 
 * Maps users to locations with specific roles, allowing a single user
 * to have different roles at different locations.
 * 
 * This is a critical table for the multi-location management feature,
 * enabling staff to work across multiple venues with appropriate permissions.
 * 
 * Example: A user could be a crew_manager at one location but a crew_member at another.
 */
export const userLocations = pgTable("user_locations", {
  userId: integer("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.locationId] }),
  };
});

/**
 * Competencies Table
 * 
 * Defines skills, certifications, or qualifications needed for positions.
 * Each competency is specific to a location, allowing different venues
 * to define their own skill requirements.
 * 
 * Key relationships:
 * - Many-to-many with positions (via positionCompetencies junction)
 * - Many-to-many with staff (via staffCompetencies junction)
 * - One-to-many with shifts (for required skill levels)
 */
export const competencies = pgTable("competencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  locationId: integer("location_id").references(() => locations.id).notNull(), // Each competency belongs to a specific location
  createdBy: integer("created_by").references(() => users.id), // Track who created the competency
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Positions Table
 * 
 * Defines job roles or functions that staff members can perform.
 * Each position is specific to a location and may require different competencies.
 * 
 * Examples: Bartender, Server, Host, Kitchen Staff, etc.
 * 
 * Key relationships:
 * - Many-to-many with competencies (via positionCompetencies junction)
 * - One-to-many with staff members (assigned positions)
 * - Referenced in scheduling templates and shifts
 */
export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  locationId: integer("location_id").references(() => locations.id).notNull(), // Each position belongs to a specific location
  createdBy: integer("created_by").references(() => users.id), // Track who created the position
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Position Competencies Junction Table
 * 
 * Maps positions to required competencies with minimum proficiency levels.
 * Defines what skills are needed for each position and at what level of expertise.
 * 
 * For example:
 * - Bartender position might require Cocktail Making competency at level 3
 * - Server position might require Menu Knowledge competency at level 2
 * 
 * This table is used when scheduling to ensure staff members have
 * appropriate skills for assigned shifts.
 */
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

/**
 * Staff Table
 * 
 * Represents employees who are actively working at a location.
 * Each staff record links a user to a specific location and position.
 * 
 * This table contains employment-specific details like position and 
 * desired working hours that don't belong in the core user profile.
 * 
 * Key relationships:
 * - Many-to-one with users (each staff record belongs to one user)
 * - Many-to-one with locations (each staff member belongs to one location)
 * - Many-to-one with positions (each staff member has one primary position)
 * - Many-to-many with competencies (via staffCompetencies junction)
 */
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  positionId: integer("position_id").references(() => positions.id), // Link to a defined position
  position: text("position").notNull(), // Keep for backward compatibility
  wantedHours: integer("wanted_hours").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Staff Competencies Junction Table
 * 
 * Tracks competency levels for each staff member with assessment history.
 * This enables skill-based scheduling and training management.
 * 
 * Unlike positionCompetencies, this table tracks actual staff skills
 * rather than required skills for positions. The assessment tracking
 * creates an audit trail for skill verification.
 * 
 * The level field uses a 0-5 scale where:
 * 0 = Not applicable/trained
 * 1 = Basic awareness
 * 2 = Beginner level
 * 3 = Competent
 * 4 = Advanced
 * 5 = Expert/can train others
 */
export const staffCompetencies = pgTable("staff_competencies", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  competencyId: integer("competency_id").references(() => competencies.id).notNull(),
  level: integer("level").notNull(), // 0-5 scale
  assessedBy: integer("assessed_by").references(() => users.id), // Who assessed this competency
  assessedAt: timestamp("assessed_at"), // When the assessment was done
  notes: text("notes"), // Optional assessment notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Applicants Table
 * 
 * Stores information about job applicants who haven't yet been hired.
 * Applicants enter the system through the application portal and can
 * be tracked through different stages of the hiring process.
 * 
 * The status field tracks progression:
 * - new: Initial application
 * - contacted: Initial outreach made
 * - interviewed: Interview conducted
 * - hired: Accepted and moved to staff
 * - rejected: Not proceeding
 * 
 * Key relationships:
 * - Many-to-one with locations (which venue they applied to)
 * - Many-to-one with users (linked account if created)
 * - One-to-many with applicant documents
 */
export const applicants = pgTable("applicants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status", { enum: ["new", "contacted", "interviewed", "hired", "rejected"] }).default("new").notNull(),
  resumeUrl: text("resume_url"),
  notes: text("notes"),
  extraMessage: text("extra_message"),
  userId: integer("user_id").references(() => users.id),
  locationId: integer("location_id").references(() => locations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Applicant Documents Table
 * 
 * Stores documents submitted by applicants for verification.
 * This includes resumes, identity documents, certifications, etc.
 * 
 * The system tracks both the upload and verification processes with
 * timestamps for audit purposes.
 * 
 * Document files are stored as URLs pointing to the actual file storage location.
 * The cascade delete ensures all documents are removed when an applicant is deleted.
 */
export const applicantDocuments = pgTable("applicant_documents", {
  id: serial("id").primaryKey(),
  applicantId: integer("applicant_id").references(() => applicants.id, { onDelete: 'cascade' }).notNull(),
  documentName: text("document_name").notNull(),
  documentUrl: text("document_url").notNull(),
  fileType: text("file_type"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
});

/**
 * Schedule Templates Table
 * 
 * Stores reusable schedule patterns that can be applied to create
 * weekly schedules quickly and consistently.
 * 
 * Templates are location-specific and contain a collection of shift patterns
 * that represent the typical staffing needs for that venue.
 * 
 * Key relationships:
 * - Many-to-one with locations
 * - One-to-many with template shifts
 * - Referenced by weekly schedules when creating from a template
 */
export const scheduleTemplates = pgTable("schedule_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Template Shifts Table
 * 
 * Defines individual shift patterns within a schedule template.
 * Each template shift represents a recurring shift on a specific day of the week.
 * 
 * Template shifts can optionally specify required competencies and levels
 * to ensure proper skill matching when the template is used to create
 * an actual schedule.
 * 
 * The dayOfWeek field uses 0-6 for Sunday through Saturday.
 */
export const templateShifts = pgTable("template_shifts", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => scheduleTemplates.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 for Sunday-Saturday
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  role: text("role").notNull(),
  requiredCompetencyLevel: integer("required_competency_level"),
  competencyId: integer("competency_id").references(() => competencies.id),
  notes: text("notes"),
});

/**
 * Weekly Schedules Table
 * 
 * Represents a week's worth of shifts for a specific location.
 * Weekly schedules can be created from templates or from scratch.
 * 
 * The isPublished flag controls visibility to staff members:
 * - false: Draft mode, only visible to managers
 * - true: Published and visible to all staff
 * 
 * Key relationships:
 * - Many-to-one with locations
 * - Many-to-one with schedule templates (optional)
 * - One-to-many with individual shifts
 */
export const weeklySchedules = pgTable("weekly_schedules", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  templateId: integer("template_id").references(() => scheduleTemplates.id),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Shifts Table
 * 
 * Represents individual work assignments within a weekly schedule.
 * Each shift can be assigned to a staff member or left unassigned.
 * 
 * Shifts can include competency requirements to ensure appropriate
 * skill matching when assigning staff.
 * 
 * The system uses date + startTime/endTime rather than timestamp ranges
 * to simplify time representation and UI handling.
 * 
 * Key relationships:
 * - Many-to-one with weekly schedules
 * - Many-to-one with staff (when assigned)
 * - Many-to-one with competencies (optional requirement)
 */
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => weeklySchedules.id).notNull(),
  staffId: integer("staff_id").references(() => staff.id),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  role: text("role").notNull(),
  requiredCompetencyLevel: integer("required_competency_level"),
  competencyId: integer("competency_id").references(() => competencies.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Cash Counts Table
 * 
 * Records cash handling activities at different times of the business day.
 * This table enables financial tracking and reconciliation across shifts.
 * 
 * Count types:
 * - opening: Start of business day cash count
 * - midday: Mid-shift cash handover count
 * - closing: End of business day cash count
 * 
 * The system tracks:
 * - Physical cash amount
 * - Card payment totals
 * - Float amount (starting cash)
 * - Expected amounts based on sales
 * - Discrepancies between expected and actual
 * 
 * Key relationships:
 * - Many-to-one with locations
 * - Many-to-one with users (who created and verified)
 */
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

/**
 * Knowledge Base Categories Table
 * 
 * Organizes knowledge base articles into logical groupings.
 * Categories are location-specific to allow different venues
 * to maintain their own specialized knowledge repositories.
 * 
 * Examples of categories might include:
 * - Operating Procedures
 * - Menu Information
 * - Health & Safety
 * - Equipment Usage
 * 
 * Key relationships:
 * - Many-to-one with locations
 * - One-to-many with articles
 */
export const kbCategories = pgTable("kb_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Knowledge Base Articles Table
 * 
 * Stores training materials, procedures, and reference information
 * for staff members to access.
 * 
 * Articles are organized by category and can include rich text content
 * and images. Each article tracks creation and update information
 * for audit purposes.
 * 
 * The images field stores an array of URLs to related images.
 * 
 * Key relationships:
 * - Many-to-one with categories
 * - Many-to-one with users (author/editor)
 */
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

/**
 * Uploaded Files Table
 * 
 * Central repository for all uploaded files in the system.
 * Stores metadata about the files rather than the file contents themselves.
 * 
 * The actual file content is stored on the filesystem or cloud storage,
 * while this table maintains metadata and references.
 * 
 * This design allows for:
 * - Efficient file deduplication
 * - Consistent file permission checking
 * - Centralized file access audit
 * 
 * Key relationships:
 * - Many-to-one with users (uploader)
 * - One-to-many with document attachments
 */
export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Document Attachments Table
 * 
 * Links uploaded files to various entities in the system.
 * This creates a flexible, polymorphic relationship between files
 * and different parts of the application.
 * 
 * The entityType enum specifies what kind of record the file is attached to:
 * - applicant: Resume, ID documents, etc.
 * - staff: Certifications, training records, etc.
 * - location: Floor plans, safety documents, etc.
 * - kb_article: Illustrations, diagrams for knowledge base articles
 * - cash_count: Receipt images, audit documentation
 * 
 * This design allows a single file to be referenced by multiple entities
 * without duplication.
 */
export const documentAttachments = pgTable("document_attachments", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => uploadedFiles.id).notNull(),
  entityType: text("entity_type", { 
    enum: ["applicant", "staff", "location", "kb_article", "cash_count"] 
  }).notNull(),
  entityId: integer("entity_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Insert Schemas
 * 
 * These schemas are used to validate data before inserting into database tables.
 * Each schema is derived from its corresponding table but omits auto-generated fields.
 * 
 * For example:
 * - id fields are omitted because they are auto-incremented
 * - createdAt fields are omitted because they have default values
 * 
 * These schemas are used with the Zod validator to ensure data integrity
 * when handling form submissions and API requests.
 */
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true, createdAt: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ createdAt: true });
export const insertUserLocationSchema = createInsertSchema(userLocations).omit({ createdAt: true });
export const insertPositionSchema = createInsertSchema(positions).omit({ id: true, createdAt: true });
export const insertPositionCompetencySchema = createInsertSchema(positionCompetencies).omit({ createdAt: true });
export const insertCompetencySchema = createInsertSchema(competencies).omit({ id: true, createdAt: true });
export const insertStaffSchema = createInsertSchema(staff).omit({ id: true, createdAt: true });
export const insertStaffCompetencySchema = createInsertSchema(staffCompetencies).omit({ id: true, createdAt: true });
export const insertApplicantSchema = createInsertSchema(applicants).omit({ id: true, createdAt: true });
export const insertApplicantDocumentSchema = createInsertSchema(applicantDocuments).omit({ id: true, uploadedAt: true, verifiedAt: true });
export const insertScheduleTemplateSchema = createInsertSchema(scheduleTemplates).omit({ id: true, createdAt: true });
export const insertTemplateShiftSchema = createInsertSchema(templateShifts).omit({ id: true });
export const insertWeeklyScheduleSchema = createInsertSchema(weeklySchedules).omit({ id: true, createdAt: true });
export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true, createdAt: true });
export const insertCashCountSchema = createInsertSchema(cashCounts).omit({ id: true, createdAt: true });
export const insertKbCategorySchema = createInsertSchema(kbCategories).omit({ id: true, createdAt: true });
export const insertKbArticleSchema = createInsertSchema(kbArticles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({ id: true, createdAt: true });
export const insertDocumentAttachmentSchema = createInsertSchema(documentAttachments).omit({ id: true, createdAt: true });

/**
 * Authentication Schemas
 * 
 * These schemas validate user authentication-related data
 * and provide specific error messages for form validation.
 */

/**
 * Login Schema
 * 
 * Validates username and password for login attempts.
 * Used in login forms and API endpoints.
 */
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Registration Schema
 * 
 * Comprehensive validation for new user registration.
 * Includes validation for all required user profile fields
 * and additional checks like password confirmation.
 * 
 * The phone number regex enforces international format with country code.
 * 
 * The refine method adds a custom validation rule to ensure
 * password and confirmPassword fields match.
 */
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
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Types for drizzle tables
export type ApplicantDocument = typeof applicantDocuments.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type InsertUserLocation = z.infer<typeof insertUserLocationSchema>;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type InsertPositionCompetency = z.infer<typeof insertPositionCompetencySchema>;
export type InsertCompetency = z.infer<typeof insertCompetencySchema>;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type InsertStaffCompetency = z.infer<typeof insertStaffCompetencySchema>;
export type InsertApplicant = z.infer<typeof insertApplicantSchema>;
export type InsertApplicantDocument = z.infer<typeof insertApplicantDocumentSchema>;
export type InsertScheduleTemplate = z.infer<typeof insertScheduleTemplateSchema>;
export type InsertTemplateShift = z.infer<typeof insertTemplateShiftSchema>;
export type InsertWeeklySchedule = z.infer<typeof insertWeeklyScheduleSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type InsertCashCount = z.infer<typeof insertCashCountSchema>;
export type InsertKbCategory = z.infer<typeof insertKbCategorySchema>;
export type InsertKbArticle = z.infer<typeof insertKbArticleSchema>;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type InsertDocumentAttachment = z.infer<typeof insertDocumentAttachmentSchema>;
export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;

export type User = typeof users.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type UserLocation = typeof userLocations.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type PositionCompetency = typeof positionCompetencies.$inferSelect;
export type Competency = typeof competencies.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type StaffCompetency = typeof staffCompetencies.$inferSelect;
export type Applicant = typeof applicants.$inferSelect;
export type ScheduleTemplate = typeof scheduleTemplates.$inferSelect;
export type TemplateShift = typeof templateShifts.$inferSelect;
export type WeeklySchedule = typeof weeklySchedules.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type CashCount = typeof cashCounts.$inferSelect;
export type KbCategory = typeof kbCategories.$inferSelect;
export type KbArticle = typeof kbArticles.$inferSelect;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type DocumentAttachment = typeof documentAttachments.$inferSelect;

// Session storage for database sessions
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => {
    return {
      expireIdx: index("sessions_expire_idx").on(table.expire),
    };
  }
);
