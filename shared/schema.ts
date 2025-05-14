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
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users & Auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["manager", "floor_manager", "staff"] }).notNull(),
  locationId: integer("location_id").references(() => locations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Locations (different bars/restaurants)
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Competencies
export const competencies = pgTable("competencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
});

// Staff (people who are hired and working)
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  position: text("position").notNull(),
  wantedHours: integer("wanted_hours").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Staff Competencies (junction table)
export const staffCompetencies = pgTable("staff_competencies", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  competencyId: integer("competency_id").references(() => competencies.id).notNull(),
  level: integer("level").notNull(), // 0-5 scale
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Applicants (people who applied for a job)
export const applicants = pgTable("applicants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  positionApplied: text("position_applied").notNull(),
  status: text("status", { enum: ["new", "contacted", "interviewed", "hired", "rejected"] }).default("new").notNull(),
  resumeUrl: text("resume_url"),
  notes: text("notes"),
  locationId: integer("location_id").references(() => locations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const insertCompetencySchema = createInsertSchema(competencies).omit({ id: true, createdAt: true });
export const insertStaffSchema = createInsertSchema(staff).omit({ id: true, createdAt: true });
export const insertStaffCompetencySchema = createInsertSchema(staffCompetencies).omit({ id: true, createdAt: true });
export const insertApplicantSchema = createInsertSchema(applicants).omit({ id: true, createdAt: true });
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
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  positionApplied: z.string().min(1, "Position is required"),
  phone: z.string().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type InsertCompetency = z.infer<typeof insertCompetencySchema>;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type InsertStaffCompetency = z.infer<typeof insertStaffCompetencySchema>;
export type InsertApplicant = z.infer<typeof insertApplicantSchema>;
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
