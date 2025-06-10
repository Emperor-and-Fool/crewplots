import {
  users, locations, competencies, staff, staffCompetencies, userDocuments,
  scheduleTemplates, templateShifts, weeklySchedules, shifts, cashCounts,
  kbCategories, kbArticles, uploadedFiles, documentAttachments, messages,
  type User, type Location, type Competency, type Staff, type StaffCompetency,
  type UserDocument, type ScheduleTemplate, type TemplateShift, type WeeklySchedule,
  type Shift, type CashCount, type KbCategory, type KbArticle, type Message,
  type UploadedFile, type DocumentAttachment,
  type InsertUser, type InsertLocation, type InsertCompetency, type InsertStaff,
  type InsertStaffCompetency, type InsertUserDocument, type InsertScheduleTemplate,
  type InsertTemplateShift, type InsertWeeklySchedule, type InsertShift,
  type InsertCashCount, type InsertKbCategory, type InsertKbArticle, type InsertMessage,
  type InsertUploadedFile, type InsertDocumentAttachment
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

  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getMessages(): Promise<Message[]>;
  getMessagesByUser(userId: number): Promise<Message[]>;
  getMessagesByApplicant(applicantId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message | undefined>;
  deleteMessage(id: number): Promise<boolean>;
  userHasAccessToApplicant(userId: number, applicantId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location>;
  private competencies: Map<number, Competency>;
  private staff: Map<number, Staff>;
  private staffCompetencies: Map<number, StaffCompetency>;
  private applicants: Map<number, Applicant>;
  private scheduleTemplates: Map<number, ScheduleTemplate>;
  private templateShifts: Map<number, TemplateShift>;
  private weeklySchedules: Map<number, WeeklySchedule>;
  private shifts: Map<number, Shift>;
  private cashCounts: Map<number, CashCount>;
  private kbCategories: Map<number, KbCategory>;
  private kbArticles: Map<number, KbArticle>;
  private uploadedFiles: Map<number, UploadedFile>;
  private documentAttachments: Map<number, DocumentAttachment>;
  private _userDocuments: Map<number, any>;

  private currentUserId: number;
  private currentLocationId: number;
  private currentCompetencyId: number;
  private currentStaffId: number;
  private currentStaffCompetencyId: number;
  private currentApplicantId: number;
  private currentScheduleTemplateId: number;
  private currentTemplateShiftId: number;
  private currentWeeklyScheduleId: number;
  private currentShiftId: number;
  private currentCashCountId: number;
  private currentKbCategoryId: number;
  private currentKbArticleId: number;
  private currentUploadedFileId: number;
  private currentDocumentAttachmentId: number;

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.competencies = new Map();
    this.staff = new Map();
    this.staffCompetencies = new Map();
    this.applicants = new Map();
    this.scheduleTemplates = new Map();
    this.templateShifts = new Map();
    this.weeklySchedules = new Map();
    this.shifts = new Map();
    this.cashCounts = new Map();
    this.kbCategories = new Map();
    this.kbArticles = new Map();
    this.uploadedFiles = new Map();
    this.documentAttachments = new Map();
    this._userDocuments = new Map();

    this.currentUserId = 1;
    this.currentLocationId = 1;
    this.currentCompetencyId = 1;
    this.currentStaffId = 1;
    this.currentStaffCompetencyId = 1;
    this.currentApplicantId = 1;
    this.currentScheduleTemplateId = 1;
    this.currentTemplateShiftId = 1;
    this.currentWeeklyScheduleId = 1;
    this.currentShiftId = 1;
    this.currentCashCountId = 1;
    this.currentKbCategoryId = 1;
    this.currentKbArticleId = 1;
    this.currentUploadedFileId = 1;
    this.currentDocumentAttachmentId = 1;

    // Add default admin user
    this.createUser({
      username: "admin",
      password: "$2a$10$GQKjpzhl2PjwoZx8ZLOCruR0FiAzUOKYCC4JRkYdOjPALMrXbJgEq", // adminpass123
      email: "admin@example.com",
      name: "Admin User",
      role: "manager",
      locationId: null
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.currentUserId++,
      createdAt: new Date(),
      ...user
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }

    const updatedUser = {
      ...existingUser,
      ...user
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  async getUsersByLocation(locationId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.locationId === locationId);
  }

  // Locations
  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async getLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const newLocation: Location = {
      id: this.currentLocationId++,
      createdAt: new Date(),
      ...location
    };
    this.locations.set(newLocation.id, newLocation);
    return newLocation;
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const existingLocation = this.locations.get(id);
    if (!existingLocation) {
      return undefined;
    }

    const updatedLocation = {
      ...existingLocation,
      ...location
    };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async deleteLocation(id: number): Promise<boolean> {
    return this.locations.delete(id);
  }

  // Competencies
  async getCompetency(id: number): Promise<Competency | undefined> {
    return this.competencies.get(id);
  }

  async getCompetencies(): Promise<Competency[]> {
    return Array.from(this.competencies.values());
  }

  async getCompetenciesByLocation(locationId: number): Promise<Competency[]> {
    return Array.from(this.competencies.values()).filter(competency => competency.locationId === locationId);
  }

  async createCompetency(competency: InsertCompetency): Promise<Competency> {
    const newCompetency: Competency = {
      id: this.currentCompetencyId++,
      createdAt: new Date(),
      ...competency
    };
    this.competencies.set(newCompetency.id, newCompetency);
    return newCompetency;
  }

  async updateCompetency(id: number, competency: Partial<InsertCompetency>): Promise<Competency | undefined> {
    const existingCompetency = this.competencies.get(id);
    if (!existingCompetency) {
      return undefined;
    }

    const updatedCompetency = {
      ...existingCompetency,
      ...competency
    };
    this.competencies.set(id, updatedCompetency);
    return updatedCompetency;
  }

  async deleteCompetency(id: number): Promise<boolean> {
    return this.competencies.delete(id);
  }

  // Staff
  async getStaff(id: number): Promise<Staff | undefined> {
    return this.staff.get(id);
  }

  async getStaffMembers(): Promise<Staff[]> {
    return Array.from(this.staff.values());
  }

  async getStaffByLocation(locationId: number): Promise<Staff[]> {
    return Array.from(this.staff.values()).filter(staff => staff.locationId === locationId);
  }

  async getStaffByUser(userId: number): Promise<Staff | undefined> {
    return Array.from(this.staff.values()).find(staff => staff.userId === userId);
  }

  async createStaff(staffMember: InsertStaff): Promise<Staff> {
    const newStaff: Staff = {
      id: this.currentStaffId++,
      createdAt: new Date(),
      ...staffMember
    };
    this.staff.set(newStaff.id, newStaff);
    return newStaff;
  }

  async updateStaff(id: number, staffMember: Partial<InsertStaff>): Promise<Staff | undefined> {
    const existingStaff = this.staff.get(id);
    if (!existingStaff) {
      return undefined;
    }

    const updatedStaff = {
      ...existingStaff,
      ...staffMember
    };
    this.staff.set(id, updatedStaff);
    return updatedStaff;
  }

  async deleteStaff(id: number): Promise<boolean> {
    return this.staff.delete(id);
  }

  // Staff Competencies
  async getStaffCompetency(id: number): Promise<StaffCompetency | undefined> {
    return this.staffCompetencies.get(id);
  }

  async getStaffCompetencies(): Promise<StaffCompetency[]> {
    return Array.from(this.staffCompetencies.values());
  }

  async getStaffCompetenciesByStaff(staffId: number): Promise<StaffCompetency[]> {
    return Array.from(this.staffCompetencies.values()).filter(sc => sc.staffId === staffId);
  }

  async getStaffCompetenciesByCompetency(competencyId: number): Promise<StaffCompetency[]> {
    return Array.from(this.staffCompetencies.values()).filter(sc => sc.competencyId === competencyId);
  }

  async createStaffCompetency(staffCompetency: InsertStaffCompetency): Promise<StaffCompetency> {
    const newStaffCompetency: StaffCompetency = {
      id: this.currentStaffCompetencyId++,
      createdAt: new Date(),
      ...staffCompetency
    };
    this.staffCompetencies.set(newStaffCompetency.id, newStaffCompetency);
    return newStaffCompetency;
  }

  async updateStaffCompetency(id: number, staffCompetency: Partial<InsertStaffCompetency>): Promise<StaffCompetency | undefined> {
    const existingStaffCompetency = this.staffCompetencies.get(id);
    if (!existingStaffCompetency) {
      return undefined;
    }

    const updatedStaffCompetency = {
      ...existingStaffCompetency,
      ...staffCompetency
    };
    this.staffCompetencies.set(id, updatedStaffCompetency);
    return updatedStaffCompetency;
  }

  async deleteStaffCompetency(id: number): Promise<boolean> {
    return this.staffCompetencies.delete(id);
  }

  // Applicants (using unified users table approach)
  async getApplicant(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id && user.role === 'applicant');
  }

  async getApplicants(): Promise<User[]> {
    return this.users.filter(user => user.role === 'applicant');
  }

  async getApplicantsByLocation(locationId: number): Promise<User[]> {
    return this.users.filter(user => user.role === 'applicant' && user.locationId === locationId);
  }

  async getApplicantsByStatus(status: string): Promise<User[]> {
    return this.users.filter(user => user.role === 'applicant' && user.status === status);
  }

  async createApplicant(applicant: InsertUser): Promise<User> {
    const newApplicant: User = {
      id: this.currentUserId++,
      createdAt: new Date(),
      role: 'applicant',
      ...applicant
    };
    this.users.push(newApplicant);
    return newApplicant;
  }

  async updateApplicant(id: number, applicant: Partial<InsertUser>): Promise<User | undefined> {
    const existingApplicantIndex = this.users.findIndex(user => user.id === id && user.role === 'applicant');
    if (existingApplicantIndex === -1) {
      return undefined;
    }

    const updatedApplicant = {
      ...existingApplicant,
      ...applicant
    };
    this.applicants.set(id, updatedApplicant);
    return updatedApplicant;
  }

  async deleteApplicant(id: number): Promise<boolean> {
    return this.applicants.delete(id);
  }

  async getApplicantByUserId(userId: number): Promise<Applicant | undefined> {
    return Array.from(this.applicants.values()).find(applicant => applicant.userId === userId);
  }

  async createApplicantDocument(document: { applicantId: number, documentName: string, documentUrl: string, fileType?: string }): Promise<any> {
    const newDocument = {
      id: this.currentDocumentAttachmentId++,
      applicantId: document.applicantId,
      documentName: document.documentName,
      documentUrl: document.documentUrl,
      fileType: document.fileType || null,
      uploadedAt: new Date(),
      verifiedAt: null,
      notes: null
    };
    
    // For in-memory storage, we'll use a Map to store the documents
    if (!this._applicantDocuments) {
      this._applicantDocuments = new Map();
    }
    
    this._applicantDocuments.set(newDocument.id, newDocument);
    return newDocument;
  }

  async getApplicantDocuments(applicantId: number): Promise<any[]> {
    if (!this._applicantDocuments) {
      return [];
    }
    
    return Array.from(this._applicantDocuments.values())
      .filter(doc => doc.applicantId === applicantId);
  }

  async getApplicantDocument(id: number): Promise<any | undefined> {
    if (!this._applicantDocuments) {
      return undefined;
    }
    
    return this._applicantDocuments.get(id);
  }

  async deleteApplicantDocument(id: number): Promise<boolean> {
    if (!this._applicantDocuments) {
      return false;
    }
    
    return this._applicantDocuments.delete(id);
  }

  // Schedule Templates
  async getScheduleTemplate(id: number): Promise<ScheduleTemplate | undefined> {
    return this.scheduleTemplates.get(id);
  }

  async getScheduleTemplates(): Promise<ScheduleTemplate[]> {
    return Array.from(this.scheduleTemplates.values());
  }

  async getScheduleTemplatesByLocation(locationId: number): Promise<ScheduleTemplate[]> {
    return Array.from(this.scheduleTemplates.values()).filter(template => template.locationId === locationId);
  }

  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> {
    const newTemplate: ScheduleTemplate = {
      id: this.currentScheduleTemplateId++,
      createdAt: new Date(),
      ...template
    };
    this.scheduleTemplates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  async updateScheduleTemplate(id: number, template: Partial<InsertScheduleTemplate>): Promise<ScheduleTemplate | undefined> {
    const existingTemplate = this.scheduleTemplates.get(id);
    if (!existingTemplate) {
      return undefined;
    }

    const updatedTemplate = {
      ...existingTemplate,
      ...template
    };
    this.scheduleTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteScheduleTemplate(id: number): Promise<boolean> {
    return this.scheduleTemplates.delete(id);
  }

  // Template Shifts
  async getTemplateShift(id: number): Promise<TemplateShift | undefined> {
    return this.templateShifts.get(id);
  }

  async getTemplateShifts(): Promise<TemplateShift[]> {
    return Array.from(this.templateShifts.values());
  }

  async getTemplateShiftsByTemplate(templateId: number): Promise<TemplateShift[]> {
    return Array.from(this.templateShifts.values()).filter(shift => shift.templateId === templateId);
  }

  async getTemplateShiftsByDay(templateId: number, dayOfWeek: number): Promise<TemplateShift[]> {
    return Array.from(this.templateShifts.values()).filter(shift => 
      shift.templateId === templateId && shift.dayOfWeek === dayOfWeek
    );
  }

  async createTemplateShift(shift: InsertTemplateShift): Promise<TemplateShift> {
    const newShift: TemplateShift = {
      id: this.currentTemplateShiftId++,
      ...shift
    };
    this.templateShifts.set(newShift.id, newShift);
    return newShift;
  }

  async updateTemplateShift(id: number, shift: Partial<InsertTemplateShift>): Promise<TemplateShift | undefined> {
    const existingShift = this.templateShifts.get(id);
    if (!existingShift) {
      return undefined;
    }

    const updatedShift = {
      ...existingShift,
      ...shift
    };
    this.templateShifts.set(id, updatedShift);
    return updatedShift;
  }

  async deleteTemplateShift(id: number): Promise<boolean> {
    return this.templateShifts.delete(id);
  }

  // Weekly Schedules
  async getWeeklySchedule(id: number): Promise<WeeklySchedule | undefined> {
    return this.weeklySchedules.get(id);
  }

  async getWeeklySchedules(): Promise<WeeklySchedule[]> {
    return Array.from(this.weeklySchedules.values());
  }

  async getWeeklySchedulesByLocation(locationId: number): Promise<WeeklySchedule[]> {
    return Array.from(this.weeklySchedules.values()).filter(schedule => schedule.locationId === locationId);
  }

  async getWeeklyScheduleByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<WeeklySchedule[]> {
    return Array.from(this.weeklySchedules.values()).filter(schedule => 
      schedule.locationId === locationId &&
      schedule.weekStartDate >= startDate &&
      schedule.weekStartDate <= endDate
    );
  }

  async createWeeklySchedule(schedule: InsertWeeklySchedule): Promise<WeeklySchedule> {
    const newSchedule: WeeklySchedule = {
      id: this.currentWeeklyScheduleId++,
      createdAt: new Date(),
      ...schedule
    };
    this.weeklySchedules.set(newSchedule.id, newSchedule);
    return newSchedule;
  }

  async updateWeeklySchedule(id: number, schedule: Partial<InsertWeeklySchedule>): Promise<WeeklySchedule | undefined> {
    const existingSchedule = this.weeklySchedules.get(id);
    if (!existingSchedule) {
      return undefined;
    }

    const updatedSchedule = {
      ...existingSchedule,
      ...schedule
    };
    this.weeklySchedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  async deleteWeeklySchedule(id: number): Promise<boolean> {
    return this.weeklySchedules.delete(id);
  }

  // Shifts
  async getShift(id: number): Promise<Shift | undefined> {
    return this.shifts.get(id);
  }

  async getShifts(): Promise<Shift[]> {
    return Array.from(this.shifts.values());
  }

  async getShiftsBySchedule(scheduleId: number): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(shift => shift.scheduleId === scheduleId);
  }

  async getShiftsByStaff(staffId: number): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(shift => shift.staffId === staffId);
  }

  async getShiftsByDate(scheduleId: number, date: Date): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(shift => 
      shift.scheduleId === scheduleId && 
      shift.date.getFullYear() === date.getFullYear() &&
      shift.date.getMonth() === date.getMonth() &&
      shift.date.getDate() === date.getDate()
    );
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const newShift: Shift = {
      id: this.currentShiftId++,
      createdAt: new Date(),
      ...shift
    };
    this.shifts.set(newShift.id, newShift);
    return newShift;
  }

  async updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift | undefined> {
    const existingShift = this.shifts.get(id);
    if (!existingShift) {
      return undefined;
    }

    const updatedShift = {
      ...existingShift,
      ...shift
    };
    this.shifts.set(id, updatedShift);
    return updatedShift;
  }

  async deleteShift(id: number): Promise<boolean> {
    return this.shifts.delete(id);
  }

  // Cash Counts
  async getCashCount(id: number): Promise<CashCount | undefined> {
    return this.cashCounts.get(id);
  }

  async getCashCounts(): Promise<CashCount[]> {
    return Array.from(this.cashCounts.values());
  }

  async getCashCountsByLocation(locationId: number): Promise<CashCount[]> {
    return Array.from(this.cashCounts.values()).filter(cashCount => cashCount.locationId === locationId);
  }

  async getCashCountsByShift(shiftId: number): Promise<CashCount[]> {
    return Array.from(this.cashCounts.values()).filter(cashCount => cashCount.shiftId === shiftId);
  }

  async getCashCountsByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<CashCount[]> {
    return Array.from(this.cashCounts.values()).filter(cashCount => 
      cashCount.locationId === locationId &&
      cashCount.countDate >= startDate &&
      cashCount.countDate <= endDate
    );
  }

  async createCashCount(cashCount: InsertCashCount): Promise<CashCount> {
    const newCashCount: CashCount = {
      id: this.currentCashCountId++,
      createdAt: new Date(),
      ...cashCount
    };
    this.cashCounts.set(newCashCount.id, newCashCount);
    return newCashCount;
  }

  async updateCashCount(id: number, cashCount: Partial<InsertCashCount>): Promise<CashCount | undefined> {
    const existingCashCount = this.cashCounts.get(id);
    if (!existingCashCount) {
      return undefined;
    }

    const updatedCashCount = {
      ...existingCashCount,
      ...cashCount
    };
    this.cashCounts.set(id, updatedCashCount);
    return updatedCashCount;
  }

  async deleteCashCount(id: number): Promise<boolean> {
    return this.cashCounts.delete(id);
  }

  // KB Categories
  async getKbCategory(id: number): Promise<KbCategory | undefined> {
    return this.kbCategories.get(id);
  }

  async getKbCategories(): Promise<KbCategory[]> {
    return Array.from(this.kbCategories.values());
  }

  async getKbCategoriesByLocation(locationId: number): Promise<KbCategory[]> {
    return Array.from(this.kbCategories.values()).filter(category => category.locationId === locationId);
  }

  async createKbCategory(category: InsertKbCategory): Promise<KbCategory> {
    const newCategory: KbCategory = {
      id: this.currentKbCategoryId++,
      createdAt: new Date(),
      ...category
    };
    this.kbCategories.set(newCategory.id, newCategory);
    return newCategory;
  }

  async updateKbCategory(id: number, category: Partial<InsertKbCategory>): Promise<KbCategory | undefined> {
    const existingCategory = this.kbCategories.get(id);
    if (!existingCategory) {
      return undefined;
    }

    const updatedCategory = {
      ...existingCategory,
      ...category
    };
    this.kbCategories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteKbCategory(id: number): Promise<boolean> {
    return this.kbCategories.delete(id);
  }

  // Knowledge Base Articles
  async getKbArticle(id: number): Promise<KbArticle | undefined> {
    return this.kbArticles.get(id);
  }

  async getKbArticles(): Promise<KbArticle[]> {
    return Array.from(this.kbArticles.values());
  }

  async getKbArticlesByCategory(categoryId: number): Promise<KbArticle[]> {
    return Array.from(this.kbArticles.values()).filter(article => article.categoryId === categoryId);
  }

  async createKbArticle(article: InsertKbArticle): Promise<KbArticle> {
    const newArticle: KbArticle = {
      id: this.currentKbArticleId++,
      createdAt: new Date(),
      ...article
    };
    this.kbArticles.set(newArticle.id, newArticle);
    return newArticle;
  }

  async updateKbArticle(id: number, article: Partial<InsertKbArticle>): Promise<KbArticle | undefined> {
    const existingArticle = this.kbArticles.get(id);
    if (!existingArticle) {
      return undefined;
    }

    const updatedArticle = {
      ...existingArticle,
      ...article
    };
    this.kbArticles.set(id, updatedArticle);
    return updatedArticle;
  }

  async deleteKbArticle(id: number): Promise<boolean> {
    return this.kbArticles.delete(id);
  }

  // Upload Files
  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    return this.uploadedFiles.get(id);
  }

  async getUploadedFiles(): Promise<UploadedFile[]> {
    return Array.from(this.uploadedFiles.values());
  }

  async createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const newFile: UploadedFile = {
      id: this.currentUploadedFileId++,
      createdAt: new Date(),
      ...file
    };
    this.uploadedFiles.set(newFile.id, newFile);
    return newFile;
  }

  async updateUploadedFile(id: number, file: Partial<InsertUploadedFile>): Promise<UploadedFile | undefined> {
    const existingFile = this.uploadedFiles.get(id);
    if (!existingFile) {
      return undefined;
    }

    const updatedFile = {
      ...existingFile,
      ...file
    };
    this.uploadedFiles.set(id, updatedFile);
    return updatedFile;
  }

  async deleteUploadedFile(id: number): Promise<boolean> {
    // First delete all document attachments that reference this file
    await this.deleteDocumentAttachmentsByFile(id);
    return this.uploadedFiles.delete(id);
  }

  // Document Attachments
  async getDocumentAttachment(id: number): Promise<DocumentAttachment | undefined> {
    return this.documentAttachments.get(id);
  }

  async getDocumentAttachments(): Promise<DocumentAttachment[]> {
    return Array.from(this.documentAttachments.values());
  }

  async getDocumentAttachmentsByEntity(entityType: string, entityId: number): Promise<DocumentAttachment[]> {
    return Array.from(this.documentAttachments.values())
      .filter(attachment => attachment.entityType === entityType && attachment.entityId === entityId);
  }

  async getDocumentAttachmentsByFile(fileId: number): Promise<DocumentAttachment[]> {
    return Array.from(this.documentAttachments.values())
      .filter(attachment => attachment.fileId === fileId);
  }

  async createDocumentAttachment(attachment: InsertDocumentAttachment): Promise<DocumentAttachment> {
    const newAttachment: DocumentAttachment = {
      id: this.currentDocumentAttachmentId++,
      createdAt: new Date(),
      ...attachment
    };
    this.documentAttachments.set(newAttachment.id, newAttachment);
    return newAttachment;
  }

  async deleteDocumentAttachment(id: number): Promise<boolean> {
    return this.documentAttachments.delete(id);
  }

  async deleteDocumentAttachmentsByEntity(entityType: string, entityId: number): Promise<boolean> {
    const attachmentsToDelete = await this.getDocumentAttachmentsByEntity(entityType, entityId);
    attachmentsToDelete.forEach(attachment => {
      this.documentAttachments.delete(attachment.id);
    });
    return true;
  }

  async deleteDocumentAttachmentsByFile(fileId: number): Promise<boolean> {
    const attachmentsToDelete = await this.getDocumentAttachmentsByFile(fileId);
    attachmentsToDelete.forEach(attachment => {
      this.documentAttachments.delete(attachment.id);
    });
    return true;
  }
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  // Competencies
  async getCompetency(id: number): Promise<Competency | undefined> {
    const [competency] = await db.select().from(competencies).where(eq(competencies.id, id));
    return competency;
  }

  async getCompetencies(): Promise<Competency[]> {
    return await db.select().from(competencies);
  }

  async getCompetenciesByLocation(locationId: number): Promise<Competency[]> {
    return await db.select().from(competencies).where(eq(competencies.locationId, locationId));
  }

  async createCompetency(competency: InsertCompetency): Promise<Competency> {
    const [createdCompetency] = await db.insert(competencies).values(competency).returning();
    return createdCompetency;
  }

  async updateCompetency(id: number, competency: Partial<InsertCompetency>): Promise<Competency | undefined> {
    const [updatedCompetency] = await db
      .update(competencies)
      .set(competency)
      .where(eq(competencies.id, id))
      .returning();
    return updatedCompetency;
  }

  async deleteCompetency(id: number): Promise<boolean> {
    await db.delete(competencies).where(eq(competencies.id, id));
    return true;
  }

  // Staff
  async getStaff(id: number): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id));
    return staffMember;
  }

  async getStaffMembers(): Promise<Staff[]> {
    return await db.select().from(staff);
  }

  async getStaffByLocation(locationId: number): Promise<Staff[]> {
    return await db.select().from(staff).where(eq(staff.locationId, locationId));
  }

  async getStaffByUser(userId: number): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.userId, userId));
    return staffMember;
  }

  async createStaff(staffMember: InsertStaff): Promise<Staff> {
    const [createdStaff] = await db.insert(staff).values(staffMember).returning();
    return createdStaff;
  }

  async updateStaff(id: number, staffMember: Partial<InsertStaff>): Promise<Staff | undefined> {
    const [updatedStaff] = await db
      .update(staff)
      .set(staffMember)
      .where(eq(staff.id, id))
      .returning();
    return updatedStaff;
  }

  async deleteStaff(id: number): Promise<boolean> {
    await db.delete(staff).where(eq(staff.id, id));
    return true;
  }

  // Staff Competencies
  async getStaffCompetency(id: number): Promise<StaffCompetency | undefined> {
    const [staffCompetency] = await db.select().from(staffCompetencies).where(eq(staffCompetencies.id, id));
    return staffCompetency;
  }

  async getStaffCompetencies(): Promise<StaffCompetency[]> {
    return await db.select().from(staffCompetencies);
  }

  async getStaffCompetenciesByStaff(staffId: number): Promise<StaffCompetency[]> {
    return await db.select().from(staffCompetencies).where(eq(staffCompetencies.staffId, staffId));
  }

  async getStaffCompetenciesByCompetency(competencyId: number): Promise<StaffCompetency[]> {
    return await db.select().from(staffCompetencies).where(eq(staffCompetencies.competencyId, competencyId));
  }

  async createStaffCompetency(staffCompetency: InsertStaffCompetency): Promise<StaffCompetency> {
    const [createdStaffCompetency] = await db.insert(staffCompetencies).values(staffCompetency).returning();
    return createdStaffCompetency;
  }

  async updateStaffCompetency(id: number, staffCompetency: Partial<InsertStaffCompetency>): Promise<StaffCompetency | undefined> {
    const [updatedStaffCompetency] = await db
      .update(staffCompetencies)
      .set(staffCompetency)
      .where(eq(staffCompetencies.id, id))
      .returning();
    return updatedStaffCompetency;
  }

  async deleteStaffCompetency(id: number): Promise<boolean> {
    await db.delete(staffCompetencies).where(eq(staffCompetencies.id, id));
    return true;
  }

  // Applicants (now using unified users table)
  async getApplicant(id: number): Promise<User | undefined> {
    try {
      const [applicant] = await db.select()
        .from(users)
        .where(and(eq(users.id, id), eq(users.role, 'applicant')));
      
      return applicant;
    } catch (error) {
      console.error("Error in getApplicant:", error);
      return undefined;
    }
  }

  async getApplicants(): Promise<User[]> {
    try {
      // Get all users with applicant role from the unified users table
      const result = await db.select()
        .from(users)
        .where(eq(users.role, 'applicant'));
      
      return result;
    } catch (error) {
      console.error("Error in getApplicants:", error);
      return [];
    }
  }

  async getApplicantsByLocation(locationId: number): Promise<User[]> {
    try {
      // Get users with applicant role filtered by location from unified users table
      const result = await db.select()
        .from(users)
        .where(and(eq(users.role, 'applicant'), eq(users.locationId, locationId)));
      
      return result;
    } catch (error) {
      console.error("Error in getApplicantsByLocation:", error);
      return [];
    }
  }

  async getApplicantsByStatus(status: string): Promise<User[]> {
    try {
      // Get users with applicant role filtered by status from unified users table
      const result = await db.select()
        .from(users)
        .where(eq(users.role, 'applicant'))
        .where(eq(users.status, status));
      
      return result;
    } catch (error) {
      console.error("Error in getApplicantsByStatus:", error);
      return [];
    }
  }

  async createApplicant(applicant: InsertApplicant): Promise<Applicant> {
    const [createdApplicant] = await db.insert(applicants).values(applicant).returning();
    return createdApplicant;
  }

  async updateApplicant(id: number, applicant: Partial<InsertApplicant>): Promise<Applicant | undefined> {
    const [updatedApplicant] = await db
      .update(applicants)
      .set(applicant)
      .where(eq(applicants.id, id))
      .returning();
    return updatedApplicant;
  }

  async deleteApplicant(id: number): Promise<boolean> {
    await db.delete(applicants).where(eq(applicants.id, id));
    return true;
  }

  async getApplicantByUserId(userId: number): Promise<User | undefined> {
    try {
      console.log("Looking for applicant with userId:", userId);
      
      // Check cache first
      const cacheKey = getCacheKey('getApplicantByUserId', { userId });
      const cached = getFromCache(cacheKey);
      if (cached) {
        console.log("Found applicant (cached):", cached);
        return cached;
      }
      
      // Query users table for applicant role
      const [applicant] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.role, 'applicant')))
        .limit(1);
      
      console.log("Found applicant:", applicant || "None found");
      
      // Cache the result
      if (applicant) {
        setCache(cacheKey, applicant);
      }
      
      return applicant;
    } catch (error) {
      console.error("Error in getApplicantByUserId:", error);
      return undefined;
    }
  }
  
  async getAllApplicants(): Promise<Applicant[]> {
    try {
      // Include all needed columns in the selection
      const allApplicants = await db.select({
        id: applicants.id,
        name: applicants.name,
        email: applicants.email,
        phone: applicants.phone,
        
        status: applicants.status,
        resumeUrl: applicants.resumeUrl,
        notes: applicants.notes,
        extraMessage: applicants.extraMessage,
        userId: applicants.userId,
        locationId: applicants.locationId,
        createdAt: applicants.createdAt
      }).from(applicants);
      
      return allApplicants;
    } catch (error) {
      console.error("Error in getAllApplicants:", error);
      return [];
    }
  }

  async createApplicantDocument(document: { applicantId: number, documentName: string, documentUrl: string, fileType?: string }): Promise<ApplicantDocument> {
    const [newDoc] = await db
      .insert(applicantDocuments)
      .values({
        applicantId: document.applicantId,
        documentName: document.documentName,
        documentUrl: document.documentUrl,
        fileType: document.fileType || null,
        uploadedAt: new Date(),
      })
      .returning();
    
    return newDoc;
  }

  async getApplicantDocuments(applicantId: number): Promise<ApplicantDocument[]> {
    try {
      console.log("Fetching documents for applicant ID:", applicantId);
      
      // Check cache first
      const cacheKey = getCacheKey('getApplicantDocuments', { applicantId });
      const cached = getFromCache(cacheKey);
      if (cached) {
        console.log(`Found ${cached.length} documents (cached) for applicant ID ${applicantId}`);
        return cached;
      }
      
      // Optimized query with explicit ordering for consistent results
      const documents = await db
        .select()
        .from(applicantDocuments)
        .where(eq(applicantDocuments.applicantId, applicantId))
        .orderBy(applicantDocuments.uploadedAt);
      
      console.log(`Successfully retrieved ${documents.length} documents for applicant ID ${applicantId}`);
      
      // Cache the result
      setCache(cacheKey, documents);
      
      return documents;
    } catch (error) {
      console.error("Error in getApplicantDocuments:", error);
      return [];
    }
  }

  async getApplicantDocument(id: number): Promise<ApplicantDocument | undefined> {
    try {
      const [document] = await db
        .select()
        .from(applicantDocuments)
        .where(eq(applicantDocuments.id, id));
      
      return document;
    } catch (error) {
      console.error("Error in getApplicantDocument:", error);
      return undefined;
    }
  }

  async deleteApplicantDocument(id: number): Promise<boolean> {
    try {
      await db
        .delete(applicantDocuments)
        .where(eq(applicantDocuments.id, id));
      return true;
    } catch (error) {
      console.error("Error in deleteApplicantDocument:", error);
      return false;
    }
  }

  // Schedule Templates
  async getScheduleTemplate(id: number): Promise<ScheduleTemplate | undefined> {
    const [template] = await db.select().from(scheduleTemplates).where(eq(scheduleTemplates.id, id));
    return template;
  }

  async getScheduleTemplates(): Promise<ScheduleTemplate[]> {
    return await db.select().from(scheduleTemplates);
  }

  async getScheduleTemplatesByLocation(locationId: number): Promise<ScheduleTemplate[]> {
    return await db.select().from(scheduleTemplates).where(eq(scheduleTemplates.locationId, locationId));
  }

  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> {
    const [createdTemplate] = await db.insert(scheduleTemplates).values(template).returning();
    return createdTemplate;
  }

  async updateScheduleTemplate(id: number, template: Partial<InsertScheduleTemplate>): Promise<ScheduleTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(scheduleTemplates)
      .set(template)
      .where(eq(scheduleTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteScheduleTemplate(id: number): Promise<boolean> {
    await db.delete(scheduleTemplates).where(eq(scheduleTemplates.id, id));
    return true;
  }

  // Template Shifts
  async getTemplateShift(id: number): Promise<TemplateShift | undefined> {
    const [shift] = await db.select().from(templateShifts).where(eq(templateShifts.id, id));
    return shift;
  }

  async getTemplateShifts(): Promise<TemplateShift[]> {
    return await db.select().from(templateShifts);
  }

  async getTemplateShiftsByTemplate(templateId: number): Promise<TemplateShift[]> {
    return await db.select().from(templateShifts).where(eq(templateShifts.templateId, templateId));
  }

  async getTemplateShiftsByDay(templateId: number, dayOfWeek: number): Promise<TemplateShift[]> {
    return await db.select().from(templateShifts)
      .where(and(
        eq(templateShifts.templateId, templateId),
        eq(templateShifts.dayOfWeek, dayOfWeek)
      ));
  }

  async createTemplateShift(shift: InsertTemplateShift): Promise<TemplateShift> {
    const [createdShift] = await db.insert(templateShifts).values(shift).returning();
    return createdShift;
  }

  async updateTemplateShift(id: number, shift: Partial<InsertTemplateShift>): Promise<TemplateShift | undefined> {
    const [updatedShift] = await db
      .update(templateShifts)
      .set(shift)
      .where(eq(templateShifts.id, id))
      .returning();
    return updatedShift;
  }

  async deleteTemplateShift(id: number): Promise<boolean> {
    await db.delete(templateShifts).where(eq(templateShifts.id, id));
    return true;
  }

  // Weekly Schedules
  async getWeeklySchedule(id: number): Promise<WeeklySchedule | undefined> {
    const [schedule] = await db.select().from(weeklySchedules).where(eq(weeklySchedules.id, id));
    return schedule;
  }

  async getWeeklySchedules(): Promise<WeeklySchedule[]> {
    return await db.select().from(weeklySchedules);
  }

  async getWeeklySchedulesByLocation(locationId: number): Promise<WeeklySchedule[]> {
    return await db.select().from(weeklySchedules).where(eq(weeklySchedules.locationId, locationId));
  }

  async getWeeklyScheduleByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<WeeklySchedule[]> {
    return await db.select().from(weeklySchedules)
      .where(and(
        eq(weeklySchedules.locationId, locationId),
        gte(weeklySchedules.weekStartDate, startDate),
        lte(weeklySchedules.weekStartDate, endDate)
      ));
  }

  async createWeeklySchedule(schedule: InsertWeeklySchedule): Promise<WeeklySchedule> {
    const [createdSchedule] = await db.insert(weeklySchedules).values(schedule).returning();
    return createdSchedule;
  }

  async updateWeeklySchedule(id: number, schedule: Partial<InsertWeeklySchedule>): Promise<WeeklySchedule | undefined> {
    const [updatedSchedule] = await db
      .update(weeklySchedules)
      .set(schedule)
      .where(eq(weeklySchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteWeeklySchedule(id: number): Promise<boolean> {
    await db.delete(weeklySchedules).where(eq(weeklySchedules.id, id));
    return true;
  }

  // Shifts
  async getShift(id: number): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift;
  }

  async getShifts(): Promise<Shift[]> {
    return await db.select().from(shifts);
  }

  async getShiftsBySchedule(scheduleId: number): Promise<Shift[]> {
    return await db.select().from(shifts).where(eq(shifts.scheduleId, scheduleId));
  }

  async getShiftsByStaff(staffId: number): Promise<Shift[]> {
    return await db.select().from(shifts).where(eq(shifts.staffId, staffId));
  }

  async getShiftsByDate(scheduleId: number, date: Date): Promise<Shift[]> {
    return await db.select().from(shifts)
      .where(and(
        eq(shifts.scheduleId, scheduleId),
        eq(shifts.date, date)
      ));
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [createdShift] = await db.insert(shifts).values(shift).returning();
    return createdShift;
  }

  async updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift | undefined> {
    const [updatedShift] = await db
      .update(shifts)
      .set(shift)
      .where(eq(shifts.id, id))
      .returning();
    return updatedShift;
  }

  async deleteShift(id: number): Promise<boolean> {
    await db.delete(shifts).where(eq(shifts.id, id));
    return true;
  }

  // Cash Counts
  async getCashCount(id: number): Promise<CashCount | undefined> {
    const [cashCount] = await db.select().from(cashCounts).where(eq(cashCounts.id, id));
    return cashCount;
  }

  async getCashCounts(): Promise<CashCount[]> {
    return await db.select().from(cashCounts);
  }

  async getCashCountsByLocation(locationId: number): Promise<CashCount[]> {
    return await db.select().from(cashCounts).where(eq(cashCounts.locationId, locationId));
  }

  async getCashCountsByShift(shiftId: number): Promise<CashCount[]> {
    return await db.select().from(cashCounts).where(eq(cashCounts.shiftId, shiftId));
  }

  async getCashCountsByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<CashCount[]> {
    return await db.select().from(cashCounts)
      .where(and(
        eq(cashCounts.locationId, locationId),
        gte(cashCounts.countDate, startDate),
        lte(cashCounts.countDate, endDate)
      ));
  }

  async createCashCount(cashCount: InsertCashCount): Promise<CashCount> {
    const [createdCashCount] = await db.insert(cashCounts).values(cashCount).returning();
    return createdCashCount;
  }

  async updateCashCount(id: number, cashCount: Partial<InsertCashCount>): Promise<CashCount | undefined> {
    const [updatedCashCount] = await db
      .update(cashCounts)
      .set(cashCount)
      .where(eq(cashCounts.id, id))
      .returning();
    return updatedCashCount;
  }

  async deleteCashCount(id: number): Promise<boolean> {
    await db.delete(cashCounts).where(eq(cashCounts.id, id));
    return true;
  }

  // KB Categories
  async getKbCategory(id: number): Promise<KbCategory | undefined> {
    const [category] = await db.select().from(kbCategories).where(eq(kbCategories.id, id));
    return category;
  }

  async getKbCategories(): Promise<KbCategory[]> {
    return await db.select().from(kbCategories);
  }

  async getKbCategoriesByLocation(locationId: number): Promise<KbCategory[]> {
    return await db.select().from(kbCategories).where(eq(kbCategories.locationId, locationId));
  }

  async createKbCategory(category: InsertKbCategory): Promise<KbCategory> {
    const [createdCategory] = await db.insert(kbCategories).values(category).returning();
    return createdCategory;
  }

  async updateKbCategory(id: number, category: Partial<InsertKbCategory>): Promise<KbCategory | undefined> {
    const [updatedCategory] = await db
      .update(kbCategories)
      .set(category)
      .where(eq(kbCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteKbCategory(id: number): Promise<boolean> {
    await db.delete(kbCategories).where(eq(kbCategories.id, id));
    return true;
  }

  // KB Articles
  async getKbArticle(id: number): Promise<KbArticle | undefined> {
    const [article] = await db.select().from(kbArticles).where(eq(kbArticles.id, id));
    return article;
  }

  async getKbArticles(): Promise<KbArticle[]> {
    return await db.select().from(kbArticles);
  }

  async getKbArticlesByCategory(categoryId: number): Promise<KbArticle[]> {
    return await db.select().from(kbArticles).where(eq(kbArticles.categoryId, categoryId));
  }

  async createKbArticle(article: InsertKbArticle): Promise<KbArticle> {
    const [createdArticle] = await db.insert(kbArticles).values(article).returning();
    return createdArticle;
  }

  async updateKbArticle(id: number, article: Partial<InsertKbArticle>): Promise<KbArticle | undefined> {
    const [updatedArticle] = await db
      .update(kbArticles)
      .set(article)
      .where(eq(kbArticles.id, id))
      .returning();
    return updatedArticle;
  }

  async deleteKbArticle(id: number): Promise<boolean> {
    await db.delete(kbArticles).where(eq(kbArticles.id, id));
    return true;
  }

  // Uploaded Files
  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    const [file] = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id));
    return file;
  }

  async getUploadedFiles(): Promise<UploadedFile[]> {
    return await db.select().from(uploadedFiles);
  }

  async createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile> {
    const [createdFile] = await db.insert(uploadedFiles).values(file).returning();
    return createdFile;
  }

  async updateUploadedFile(id: number, file: Partial<InsertUploadedFile>): Promise<UploadedFile | undefined> {
    const [updatedFile] = await db
      .update(uploadedFiles)
      .set(file)
      .where(eq(uploadedFiles.id, id))
      .returning();
    return updatedFile;
  }

  async deleteUploadedFile(id: number): Promise<boolean> {
    // First delete all document attachments that reference this file
    await this.deleteDocumentAttachmentsByFile(id);
    await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id));
    return true;
  }

  // Document Attachments
  async getDocumentAttachment(id: number): Promise<DocumentAttachment | undefined> {
    const [attachment] = await db.select().from(documentAttachments).where(eq(documentAttachments.id, id));
    return attachment;
  }

  async getDocumentAttachments(): Promise<DocumentAttachment[]> {
    return await db.select().from(documentAttachments);
  }

  async getDocumentAttachmentsByEntity(entityType: string, entityId: number): Promise<DocumentAttachment[]> {
    return await db.select().from(documentAttachments)
      .where(and(
        eq(documentAttachments.entityType, entityType),
        eq(documentAttachments.entityId, entityId)
      ));
  }

  async getDocumentAttachmentsByFile(fileId: number): Promise<DocumentAttachment[]> {
    return await db.select().from(documentAttachments).where(eq(documentAttachments.fileId, fileId));
  }

  async createDocumentAttachment(attachment: InsertDocumentAttachment): Promise<DocumentAttachment> {
    const [createdAttachment] = await db.insert(documentAttachments).values(attachment).returning();
    return createdAttachment;
  }

  async deleteDocumentAttachment(id: number): Promise<boolean> {
    await db.delete(documentAttachments).where(eq(documentAttachments.id, id));
    return true;
  }

  async deleteDocumentAttachmentsByEntity(entityType: string, entityId: number): Promise<boolean> {
    await db.delete(documentAttachments)
      .where(and(
        eq(documentAttachments.entityType, entityType),
        eq(documentAttachments.entityId, entityId)
      ));
    return true;
  }

  async deleteDocumentAttachmentsByFile(fileId: number): Promise<boolean> {
    await db.delete(documentAttachments).where(eq(documentAttachments.fileId, fileId));
    return true;
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(messages.createdAt);
  }

  async getMessagesByUser(userId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.userId, userId)).orderBy(messages.createdAt);
  }

  async getMessagesByApplicant(applicantId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.applicantId, applicantId)).orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [createdMessage] = await db.insert(messages).values(message).returning();
    return createdMessage;
  }

  async updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message | undefined> {
    const [updatedMessage] = await db.update(messages)
      .set(message)
      .where(eq(messages.id, id))
      .returning();
    return updatedMessage || undefined;
  }

  async deleteMessage(id: number): Promise<boolean> {
    await db.delete(messages).where(eq(messages.id, id));
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