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

// Users & Auth
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

// User Locations - junction table mapping users to locations with specific roles
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

// Staff (people who are hired and working)
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  positionId: integer("position_id").references(() => positions.id), // Link to a defined position
  position: text("position").notNull(), // Keep for backward compatibility
  wantedHours: integer("wanted_hours").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Staff Competencies (junction table with assessment tracking)
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

// Applicants (people who applied for a job)
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

// Applicant Documents
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

// Schedule Templates
export const scheduleTemplates = pgTable("schedule_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Template Shifts
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

// Weekly Schedules
export const weeklySchedules = pgTable("weekly_schedules", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  templateId: integer("template_id").references(() => scheduleTemplates.id),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Shifts (actual scheduled shifts)
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

// Uploaded Files
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

// Document Attachments - for linking files to different entities
export const documentAttachments = pgTable("document_attachments", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => uploadedFiles.id).notNull(),
  entityType: text("entity_type", { 
    enum: ["applicant", "staff", "location", "kb_article", "cash_count"] 
  }).notNull(),
  entityId: integer("entity_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas
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
