import {
  users, locations, competencies, staff, staffCompetencies, userDocuments,
  scheduleTemplates, templateShifts, weeklySchedules, shifts, cashCounts,
  kbCategories, kbArticles, uploadedFiles, documentAttachments, noteRefs,
  type User, type Location, type Competency, type Staff, type StaffCompetency,
  type UserDocument, type ScheduleTemplate, type TemplateShift, type WeeklySchedule,
  type Shift, type CashCount, type KbCategory, type KbArticle, type NoteRef,
  type UploadedFile, type DocumentAttachment,
  type InsertUser, type InsertLocation, type InsertCompetency, type InsertStaff,
  type InsertStaffCompetency, type InsertUserDocument, type InsertScheduleTemplate,
  type InsertTemplateShift, type InsertWeeklySchedule, type InsertShift,
  type InsertCashCount, type InsertKbCategory, type InsertKbArticle, type InsertNoteRef,
  type InsertUploadedFile, type InsertDocumentAttachment,
  generatePublicId
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";

// Simple in-memory cache for frequently accessed data
const queryCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCacheKey(operation: string, params: any): string {
  return `${operation}:${JSON.stringify(params)}`;
}

function getFromCache(key: string): any {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  queryCache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  queryCache.set(key, { data, timestamp: Date.now() });
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByLocation(locationId: number): Promise<User[]>;

  // Locations
  getLocation(id: number): Promise<Location | undefined>;
  getLocations(): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;

  // Competencies
  getCompetency(id: number): Promise<Competency | undefined>;
  getCompetencies(): Promise<Competency[]>;
  getCompetenciesByLocation(locationId: number): Promise<Competency[]>;
  createCompetency(competency: InsertCompetency): Promise<Competency>;
  updateCompetency(id: number, competency: Partial<InsertCompetency>): Promise<Competency | undefined>;
  deleteCompetency(id: number): Promise<boolean>;

  // Staff
  getStaff(id: number): Promise<Staff | undefined>;
  getStaffMembers(): Promise<Staff[]>;
  getStaffByLocation(locationId: number): Promise<Staff[]>;
  getStaffByUser(userId: number): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: number, staff: Partial<InsertStaff>): Promise<Staff | undefined>;
  deleteStaff(id: number): Promise<boolean>;

  // Staff Competencies
  getStaffCompetency(id: number): Promise<StaffCompetency | undefined>;
  getStaffCompetencies(): Promise<StaffCompetency[]>;
  getStaffCompetenciesByStaff(staffId: number): Promise<StaffCompetency[]>;
  getStaffCompetenciesByCompetency(competencyId: number): Promise<StaffCompetency[]>;
  createStaffCompetency(staffCompetency: InsertStaffCompetency): Promise<StaffCompetency>;
  updateStaffCompetency(id: number, staffCompetency: Partial<InsertStaffCompetency>): Promise<StaffCompetency | undefined>;
  deleteStaffCompetency(id: number): Promise<boolean>;

  // Applicants (now using User type with role filtering)
  getApplicant(id: number): Promise<User | undefined>;
  getApplicants(): Promise<User[]>;
  getApplicantsByLocation(locationId: number): Promise<User[]>;
  getApplicantsByStatus(status: string): Promise<User[]>;
  getApplicantByUserId(userId: number): Promise<User | undefined>;
  createApplicant(applicant: InsertUser): Promise<User>;
  updateApplicant(id: number, applicant: Partial<InsertUser>): Promise<User | undefined>;
  deleteApplicant(id: number): Promise<boolean>;
  createApplicantDocument(document: { applicantId: number, documentName: string, documentUrl: string, fileType?: string }): Promise<any>;
  getApplicantDocuments(applicantId: number): Promise<any[]>;
  getApplicantDocument(id: number): Promise<any | undefined>;
  deleteApplicantDocument(id: number): Promise<boolean>;

  // Schedule Templates
  getScheduleTemplate(id: number): Promise<ScheduleTemplate | undefined>;
  getScheduleTemplates(): Promise<ScheduleTemplate[]>;
  getScheduleTemplatesByLocation(locationId: number): Promise<ScheduleTemplate[]>;
  createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate>;
  updateScheduleTemplate(id: number, template: Partial<InsertScheduleTemplate>): Promise<ScheduleTemplate | undefined>;
  deleteScheduleTemplate(id: number): Promise<boolean>;

  // Template Shifts
  getTemplateShift(id: number): Promise<TemplateShift | undefined>;
  getTemplateShifts(): Promise<TemplateShift[]>;
  getTemplateShiftsByTemplate(templateId: number): Promise<TemplateShift[]>;
  getTemplateShiftsByDay(templateId: number, dayOfWeek: number): Promise<TemplateShift[]>;
  createTemplateShift(shift: InsertTemplateShift): Promise<TemplateShift>;
  updateTemplateShift(id: number, shift: Partial<InsertTemplateShift>): Promise<TemplateShift | undefined>;
  deleteTemplateShift(id: number): Promise<boolean>;

  // Weekly Schedules
  getWeeklySchedule(id: number): Promise<WeeklySchedule | undefined>;
  getWeeklySchedules(): Promise<WeeklySchedule[]>;
  getWeeklySchedulesByLocation(locationId: number): Promise<WeeklySchedule[]>;
  getWeeklyScheduleByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<WeeklySchedule[]>;
  createWeeklySchedule(schedule: InsertWeeklySchedule): Promise<WeeklySchedule>;
  updateWeeklySchedule(id: number, schedule: Partial<InsertWeeklySchedule>): Promise<WeeklySchedule | undefined>;
  deleteWeeklySchedule(id: number): Promise<boolean>;

  // Shifts
  getShift(id: number): Promise<Shift | undefined>;
  getShifts(): Promise<Shift[]>;
  getShiftsBySchedule(scheduleId: number): Promise<Shift[]>;
  getShiftsByStaff(staffId: number): Promise<Shift[]>;
  getShiftsByDate(scheduleId: number, date: Date): Promise<Shift[]>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift | undefined>;
  deleteShift(id: number): Promise<boolean>;

  // Cash Counts
  getCashCount(id: number): Promise<CashCount | undefined>;
  getCashCounts(): Promise<CashCount[]>;
  getCashCountsByLocation(locationId: number): Promise<CashCount[]>;
  getCashCountsByShift(shiftId: number): Promise<CashCount[]>;
  getCashCountsByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<CashCount[]>;
  createCashCount(cashCount: InsertCashCount): Promise<CashCount>;
  updateCashCount(id: number, cashCount: Partial<InsertCashCount>): Promise<CashCount | undefined>;
  deleteCashCount(id: number): Promise<boolean>;

  // KB Categories
  getKbCategory(id: number): Promise<KbCategory | undefined>;
  getKbCategories(): Promise<KbCategory[]>;
  getKbCategoriesByLocation(locationId: number): Promise<KbCategory[]>;
  createKbCategory(category: InsertKbCategory): Promise<KbCategory>;
  updateKbCategory(id: number, category: Partial<InsertKbCategory>): Promise<KbCategory | undefined>;
  deleteKbCategory(id: number): Promise<boolean>;

  // Knowledge Base Articles
  getKbArticle(id: number): Promise<KbArticle | undefined>;
  getKbArticles(): Promise<KbArticle[]>;
  getKbArticlesByCategory(categoryId: number): Promise<KbArticle[]>;
  createKbArticle(article: InsertKbArticle): Promise<KbArticle>;
  updateKbArticle(id: number, article: Partial<InsertKbArticle>): Promise<KbArticle | undefined>;
  deleteKbArticle(id: number): Promise<boolean>;

  // Upload Files
  getUploadedFile(id: number): Promise<UploadedFile | undefined>;
  getUploadedFiles(): Promise<UploadedFile[]>;
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  updateUploadedFile(id: number, file: Partial<InsertUploadedFile>): Promise<UploadedFile | undefined>;
  deleteUploadedFile(id: number): Promise<boolean>;

  // Document Attachments
  getDocumentAttachment(id: number): Promise<DocumentAttachment | undefined>;
  getDocumentAttachments(): Promise<DocumentAttachment[]>;
  getDocumentAttachmentsByEntity(entityType: string, entityId: number): Promise<DocumentAttachment[]>;
  getDocumentAttachmentsByFile(fileId: number): Promise<DocumentAttachment[]>;
  createDocumentAttachment(attachment: InsertDocumentAttachment): Promise<DocumentAttachment>;
  deleteDocumentAttachment(id: number): Promise<boolean>;
  deleteDocumentAttachmentsByEntity(entityType: string, entityId: number): Promise<boolean>;
  deleteDocumentAttachmentsByFile(fileId: number): Promise<boolean>;

  // Note References
  getNoteRef(id: number): Promise<NoteRef | undefined>;
  getNoteRefs(): Promise<NoteRef[]>;
  getNoteRefsByUser(userId: number): Promise<NoteRef[]>;
  getNoteRefsByApplicant(applicantId: number): Promise<NoteRef[]>;
  createNoteRef(noteRef: InsertNoteRef): Promise<NoteRef>;
  updateNoteRef(id: number, noteRef: Partial<InsertNoteRef>): Promise<NoteRef | undefined>;
  deleteNoteRef(id: number): Promise<boolean>;
  userHasAccessToApplicant(userId: number, applicantId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select({
      id: users.id,
      public_id: users.public_id,
      username: users.username,
      password: users.password,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      name: users.name,
      role: users.role,
      locationId: users.locationId,
      phoneNumber: users.phoneNumber,
      status: users.status,
      resumeUrl: users.resumeUrl,
      createdAt: users.createdAt
    }).from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select({
      id: users.id,
      public_id: users.public_id,
      username: users.username,
      password: users.password,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      name: users.name,
      role: users.role,
      locationId: users.locationId,
      phoneNumber: users.phoneNumber,
      status: users.status,
      resumeUrl: users.resumeUrl,
      createdAt: users.createdAt
    }).from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getUsersByLocation(locationId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.locationId, locationId));
  }

  // Locations
  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [createdLocation] = await db.insert(locations).values(location).returning();
    return createdLocation;
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const [updatedLocation] = await db
      .update(locations)
      .set(location)
      .where(eq(locations.id, id))
      .returning();
    return updatedLocation;
  }

  async deleteLocation(id: number): Promise<boolean> {
    await db.delete(locations).where(eq(locations.id, id));
    return true;
  }

  // Competencies (stub implementations)
  async getCompetency(id: number): Promise<Competency | undefined> {
    return undefined;
  }

  async getCompetencies(): Promise<Competency[]> {
    return [];
  }

  async getCompetenciesByLocation(locationId: number): Promise<Competency[]> {
    return [];
  }

  async createCompetency(competency: InsertCompetency): Promise<Competency> {
    throw new Error('Not implemented');
  }

  async updateCompetency(id: number, competency: Partial<InsertCompetency>): Promise<Competency | undefined> {
    return undefined;
  }

  async deleteCompetency(id: number): Promise<boolean> {
    return false;
  }

  // Staff (stub implementations)
  async getStaff(id: number): Promise<Staff | undefined> {
    return undefined;
  }

  async getStaffMembers(): Promise<Staff[]> {
    return [];
  }

  async getStaffByLocation(locationId: number): Promise<Staff[]> {
    return [];
  }

  async getStaffByUser(userId: number): Promise<Staff | undefined> {
    return undefined;
  }

  async createStaff(staff: InsertStaff): Promise<Staff> {
    throw new Error('Not implemented');
  }

  async updateStaff(id: number, staff: Partial<InsertStaff>): Promise<Staff | undefined> {
    return undefined;
  }

  async deleteStaff(id: number): Promise<boolean> {
    return false;
  }

  // Staff Competencies (stub implementations)
  async getStaffCompetency(id: number): Promise<StaffCompetency | undefined> {
    return undefined;
  }

  async getStaffCompetencies(): Promise<StaffCompetency[]> {
    return [];
  }

  async getStaffCompetenciesByStaff(staffId: number): Promise<StaffCompetency[]> {
    return [];
  }

  async getStaffCompetenciesByCompetency(competencyId: number): Promise<StaffCompetency[]> {
    return [];
  }

  async createStaffCompetency(staffCompetency: InsertStaffCompetency): Promise<StaffCompetency> {
    throw new Error('Not implemented');
  }

  async updateStaffCompetency(id: number, staffCompetency: Partial<InsertStaffCompetency>): Promise<StaffCompetency | undefined> {
    return undefined;
  }

  async deleteStaffCompetency(id: number): Promise<boolean> {
    return false;
  }

  // Applicants
  async getApplicant(id: number): Promise<User | undefined> {
    const [applicant] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'applicant')));
    return applicant;
  }

  async getApplicants(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'applicant'));
  }

  async getApplicantsByLocation(locationId: number): Promise<User[]> {
    return await db.select().from(users).where(and(eq(users.role, 'applicant'), eq(users.locationId, locationId)));
  }

  async getApplicantsByStatus(status: string): Promise<User[]> {
    return await db.select().from(users).where(and(eq(users.role, 'applicant'), eq(users.status, status)));
  }

  async getApplicantByUserId(userId: number): Promise<User | undefined> {
    return await this.getApplicant(userId);
  }

  async createApplicant(applicant: InsertUser): Promise<User> {
    const applicantData = { ...applicant, role: 'applicant' as const };
    const [createdApplicant] = await db.insert(users).values(applicantData).returning();
    return createdApplicant;
  }

  async updateApplicant(id: number, applicant: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedApplicant] = await db
      .update(users)
      .set(applicant)
      .where(and(eq(users.id, id), eq(users.role, 'applicant')))
      .returning();
    return updatedApplicant;
  }

  async deleteApplicant(id: number): Promise<boolean> {
    await db.delete(users).where(and(eq(users.id, id), eq(users.role, 'applicant')));
    return true;
  }

  // Applicant Documents (stub implementations)
  async createApplicantDocument(document: { applicantId: number, documentName: string, documentUrl: string, fileType?: string }): Promise<any> {
    throw new Error('Not implemented');
  }

  async getApplicantDocuments(applicantId: number): Promise<any[]> {
    return [];
  }

  async getApplicantDocument(id: number): Promise<any | undefined> {
    return undefined;
  }

  async deleteApplicantDocument(id: number): Promise<boolean> {
    return false;
  }

  // Schedule Templates (stub implementations)
  async getScheduleTemplate(id: number): Promise<ScheduleTemplate | undefined> {
    return undefined;
  }

  async getScheduleTemplates(): Promise<ScheduleTemplate[]> {
    return [];
  }

  async getScheduleTemplatesByLocation(locationId: number): Promise<ScheduleTemplate[]> {
    return [];
  }

  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> {
    throw new Error('Not implemented');
  }

  async updateScheduleTemplate(id: number, template: Partial<InsertScheduleTemplate>): Promise<ScheduleTemplate | undefined> {
    return undefined;
  }

  async deleteScheduleTemplate(id: number): Promise<boolean> {
    return false;
  }

  // Template Shifts (stub implementations)
  async getTemplateShift(id: number): Promise<TemplateShift | undefined> {
    return undefined;
  }

  async getTemplateShifts(): Promise<TemplateShift[]> {
    return [];
  }

  async getTemplateShiftsByTemplate(templateId: number): Promise<TemplateShift[]> {
    return [];
  }

  async getTemplateShiftsByDay(templateId: number, dayOfWeek: number): Promise<TemplateShift[]> {
    return [];
  }

  async createTemplateShift(shift: InsertTemplateShift): Promise<TemplateShift> {
    throw new Error('Not implemented');
  }

  async updateTemplateShift(id: number, shift: Partial<InsertTemplateShift>): Promise<TemplateShift | undefined> {
    return undefined;
  }

  async deleteTemplateShift(id: number): Promise<boolean> {
    return false;
  }

  // Weekly Schedules (stub implementations)
  async getWeeklySchedule(id: number): Promise<WeeklySchedule | undefined> {
    return undefined;
  }

  async getWeeklySchedules(): Promise<WeeklySchedule[]> {
    return [];
  }

  async getWeeklySchedulesByLocation(locationId: number): Promise<WeeklySchedule[]> {
    return [];
  }

  async getWeeklyScheduleByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<WeeklySchedule[]> {
    return [];
  }

  async createWeeklySchedule(schedule: InsertWeeklySchedule): Promise<WeeklySchedule> {
    throw new Error('Not implemented');
  }

  async updateWeeklySchedule(id: number, schedule: Partial<InsertWeeklySchedule>): Promise<WeeklySchedule | undefined> {
    return undefined;
  }

  async deleteWeeklySchedule(id: number): Promise<boolean> {
    return false;
  }

  // Shifts (stub implementations)
  async getShift(id: number): Promise<Shift | undefined> {
    return undefined;
  }

  async getShifts(): Promise<Shift[]> {
    return [];
  }

  async getShiftsBySchedule(scheduleId: number): Promise<Shift[]> {
    return [];
  }

  async getShiftsByStaff(staffId: number): Promise<Shift[]> {
    return [];
  }

  async getShiftsByDate(scheduleId: number, date: Date): Promise<Shift[]> {
    return [];
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    throw new Error('Not implemented');
  }

  async updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift | undefined> {
    return undefined;
  }

  async deleteShift(id: number): Promise<boolean> {
    return false;
  }

  // Cash Counts (stub implementations)
  async getCashCount(id: number): Promise<CashCount | undefined> {
    return undefined;
  }

  async getCashCounts(): Promise<CashCount[]> {
    return [];
  }

  async getCashCountsByLocation(locationId: number): Promise<CashCount[]> {
    return [];
  }

  async getCashCountsByShift(shiftId: number): Promise<CashCount[]> {
    return [];
  }

  async getCashCountsByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<CashCount[]> {
    return [];
  }

  async createCashCount(cashCount: InsertCashCount): Promise<CashCount> {
    throw new Error('Not implemented');
  }

  async updateCashCount(id: number, cashCount: Partial<InsertCashCount>): Promise<CashCount | undefined> {
    return undefined;
  }

  async deleteCashCount(id: number): Promise<boolean> {
    return false;
  }

  // KB Categories (stub implementations)
  async getKbCategory(id: number): Promise<KbCategory | undefined> {
    return undefined;
  }

  async getKbCategories(): Promise<KbCategory[]> {
    return [];
  }

  async getKbCategoriesByLocation(locationId: number): Promise<KbCategory[]> {
    return [];
  }

  async createKbCategory(category: InsertKbCategory): Promise<KbCategory> {
    throw new Error('Not implemented');
  }

  async updateKbCategory(id: number, category: Partial<InsertKbCategory>): Promise<KbCategory | undefined> {
    return undefined;
  }

  async deleteKbCategory(id: number): Promise<boolean> {
    return false;
  }

  // Knowledge Base Articles (stub implementations)
  async getKbArticle(id: number): Promise<KbArticle | undefined> {
    return undefined;
  }

  async getKbArticles(): Promise<KbArticle[]> {
    return [];
  }

  async getKbArticlesByCategory(categoryId: number): Promise<KbArticle[]> {
    return [];
  }

  async createKbArticle(article: InsertKbArticle): Promise<KbArticle> {
    throw new Error('Not implemented');
  }

  async updateKbArticle(id: number, article: Partial<InsertKbArticle>): Promise<KbArticle | undefined> {
    return undefined;
  }

  async deleteKbArticle(id: number): Promise<boolean> {
    return false;
  }

  // Upload Files (stub implementations)
  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    return undefined;
  }

  async getUploadedFiles(): Promise<UploadedFile[]> {
    return [];
  }

  async createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    throw new Error('Not implemented');
  }

  async updateUploadedFile(id: number, file: Partial<InsertUploadedFile>): Promise<UploadedFile | undefined> {
    return undefined;
  }

  async deleteUploadedFile(id: number): Promise<boolean> {
    return false;
  }

  // Document Attachments (stub implementations)
  async getDocumentAttachment(id: number): Promise<DocumentAttachment | undefined> {
    return undefined;
  }

  async getDocumentAttachments(): Promise<DocumentAttachment[]> {
    return [];
  }

  async getDocumentAttachmentsByEntity(entityType: string, entityId: number): Promise<DocumentAttachment[]> {
    return [];
  }

  async getDocumentAttachmentsByFile(fileId: number): Promise<DocumentAttachment[]> {
    return [];
  }

  async createDocumentAttachment(attachment: InsertDocumentAttachment): Promise<DocumentAttachment> {
    throw new Error('Not implemented');
  }

  async deleteDocumentAttachment(id: number): Promise<boolean> {
    return false;
  }

  async deleteDocumentAttachmentsByEntity(entityType: string, entityId: number): Promise<boolean> {
    return false;
  }

  async deleteDocumentAttachmentsByFile(fileId: number): Promise<boolean> {
    return false;
  }

  // Message operations
  async getNoteRef(id: number): Promise<NoteRef | undefined> {
    const [message] = await db.select().from(noteRefs).where(eq(noteRefs.id, id));
    return message || undefined;
  }

  async getNoteRefs(): Promise<NoteRef[]> {
    return await db.select().from(noteRefs).orderBy(noteRefs.createdAt);
  }

  async getNoteRefsByUser(userId: number): Promise<NoteRef[]> {
    console.log(`Storage: Getting notes for user ${userId}`);
    const results = await db.select().from(noteRefs).where(eq(noteRefs.userId, userId)).orderBy(noteRefs.createdAt);
    console.log(`Storage: Found ${results.length} notes for user ${userId}`);
    return results;
  }

  async getNoteRefsByApplicant(applicantId: number): Promise<NoteRef[]> {
    return await db.select().from(noteRefs).where(eq(noteRefs.applicantId, applicantId)).orderBy(noteRefs.createdAt);
  }

  async createNoteRef(message: InsertNoteRef): Promise<NoteRef> {
    const [createdMessage] = await db.insert(noteRefs).values(message).returning();
    return createdMessage;
  }

  async updateNoteRef(id: number, message: Partial<InsertNoteRef>): Promise<NoteRef | undefined> {
    const [updatedMessage] = await db.update(noteRefs)
      .set(message)
      .where(eq(noteRefs.id, id))
      .returning();
    return updatedMessage || undefined;
  }

  async deleteNoteRef(id: number): Promise<boolean> {
    await db.delete(noteRefs).where(eq(noteRefs.id, id));
    return true;
  }

  async userHasAccessToApplicant(userId: number, applicantId: number): Promise<boolean> {
    // Check if user is admin/manager or if they are the applicant
    const user = await this.getUser(userId);
    if (!user) return false;
    
    // Admins and managers have access to all applicants
    if (user.role === 'administrator' || user.role === 'manager') {
      return true;
    }
    
    // Check if user is the applicant themselves
    const applicant = await this.getApplicant(applicantId);
    if (applicant && applicant.userId === userId) {
      return true;
    }
    
    return false;
  }
}

// Use DatabaseStorage implementation by default
export const storage = new DatabaseStorage();