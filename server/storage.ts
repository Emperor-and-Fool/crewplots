import {
  users, locations, competencies, userLocations, userCompetencies,
  scheduleTemplates, templateShifts, multiWeekFrames, weekSchedules, shifts, shiftRequirements,
  shiftSubscriptions, shiftAssignments, schedulingWindows, cashCounts,
  kbCategories, kbArticles, uploadedFiles, noteRefs, hybridCache,
  type User, type Location, type Competency, type UserLocation, type UserCompetency,
  type ScheduleTemplate, type TemplateShift, type MultiWeekFrame,
  type WeekSchedule, type Shift, type ShiftRequirement, type ShiftSubscription, type ShiftAssignment,
  type SchedulingWindow, type CashCount, type KbCategory, type KbArticle, type NoteRef,
  type UploadedFile, type HybridCache,
  type InsertUser, type InsertLocation, type InsertCompetency, type InsertUserLocation,
  type InsertUserCompetency, type InsertScheduleTemplate,
  type InsertTemplateShift, type InsertMultiWeekFrame, type InsertWeekSchedule, type InsertShift,
  type InsertShiftRequirement, type InsertShiftSubscription, type InsertShiftAssignment,
  type InsertSchedulingWindow, type InsertCashCount, type InsertKbCategory, 
  type InsertKbArticle, type InsertNoteRef, type InsertUploadedFile, 
  generatePublicId
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, sql, inArray, desc, asc } from "drizzle-orm";
import { OnDemandRedisService } from "../adapters-repl/redis-ondemand/on-demand-redis";
import { onDemandMongoService } from "../adapters-repl/mongodb-ondemand/on-demand-mongodb";
import { initializeWorkflowPermissions } from './utils/assign-default-permissions';

// ===== CACHE UTILITIES =====
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

// ===== STORAGE INTERFACE =====
export interface IStorage {
  // User Management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByLocation(locationId: number): Promise<User[]>;
  getUserWithProfile(userId: number): Promise<User | undefined>;

  // Location Management
  getLocation(id: number): Promise<Location | undefined>;
  getLocations(): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;

  // User-Location Relationships
  getUserLocations(userId: number): Promise<UserLocation[]>;
  assignUserToLocation(assignment: InsertUserLocation): Promise<UserLocation>;
  removeUserFromLocation(userId: number, locationId: number): Promise<boolean>;
  getCrewMembersByLocation(locationId: number): Promise<User[]>;

  // Competency Management
  getCompetency(id: number): Promise<Competency | undefined>;
  getCompetencies(): Promise<Competency[]>;
  getCompetenciesByLocation(locationId: number): Promise<Competency[]>;
  createCompetency(competency: InsertCompetency): Promise<Competency>;
  updateCompetency(id: number, competency: Partial<InsertCompetency>): Promise<Competency | undefined>;
  deleteCompetency(id: number): Promise<boolean>;

  // User Competencies
  getUserCompetency(id: number): Promise<UserCompetency | undefined>;
  getUserCompetencies(): Promise<UserCompetency[]>;
  getUserCompetenciesByUser(userId: number): Promise<UserCompetency[]>;
  getUserCompetenciesByCompetency(competencyId: number): Promise<UserCompetency[]>;
  createUserCompetency(userCompetency: InsertUserCompetency): Promise<UserCompetency>;
  updateUserCompetency(id: number, userCompetency: Partial<InsertUserCompetency>): Promise<UserCompetency | undefined>;
  deleteUserCompetency(id: number): Promise<boolean>;

  // Applicant Management (User-based)
  getApplicant(id: number): Promise<User | undefined>;
  getApplicants(): Promise<User[]>;
  getApplicantsByLocation(locationId: number): Promise<User[]>;
  getApplicantsByStatus(status: string): Promise<User[]>;
  getApplicantByUserId(userId: number): Promise<User | undefined>;
  createApplicant(applicant: InsertUser): Promise<User>;
  updateApplicant(id: number, applicant: Partial<InsertUser>): Promise<User | undefined>;
  deleteApplicant(id: number): Promise<boolean>;

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

  // Multi-Week Frames
  createMultiWeekFrame(frame: InsertMultiWeekFrame): Promise<MultiWeekFrame>;
  getMultiWeekFrame(id: number): Promise<MultiWeekFrame | undefined>;
  getMultiWeekFrames(locationId?: number): Promise<MultiWeekFrame[]>;
  updateMultiWeekFrame(id: number, frame: Partial<InsertMultiWeekFrame>): Promise<MultiWeekFrame | undefined>;
  deleteMultiWeekFrame(id: number): Promise<boolean>;
  copyWeekScheduleToFrame(sourceWeekScheduleId: number, multiWeekFrameId: number, weekNumber: number): Promise<WeekSchedule>;
  getWeekSchedulesByFrame(frameId: number): Promise<WeekSchedule[]>;

  // Week Schedules
  getWeekSchedule(id: number): Promise<WeekSchedule | undefined>;
  getWeekSchedules(locationId?: number): Promise<WeekSchedule[]>;
  getWeekScheduleById(id: number): Promise<WeekSchedule | undefined>;
  createWeekSchedule(schedule: InsertWeekSchedule): Promise<WeekSchedule>;
  updateWeekSchedule(id: number, schedule: Partial<InsertWeekSchedule>): Promise<WeekSchedule | undefined>;
  deleteWeekSchedule(id: number): Promise<boolean>;
  createShiftForWeekSchedule(shift: InsertShift): Promise<Shift>;
  getShiftsByWeekSchedule(weekScheduleId: number): Promise<Shift[]>;

  // Shift Management
  getShift(id: number): Promise<Shift | undefined>;
  getShifts(): Promise<Shift[]>;
  getShiftsBySchedule(scheduleId: number): Promise<Shift[]>;
  getShiftsByUser(userId: number): Promise<Shift[]>;
  getShiftsByDate(scheduleId: number, date: Date): Promise<Shift[]>;
  getShiftsByLocation(locationId: number): Promise<Shift[]>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift | undefined>;
  deleteShift(id: number): Promise<boolean>;

  // Shift Requirements
  getShiftRequirement(id: number): Promise<ShiftRequirement | undefined>;
  getShiftRequirements(shiftId?: number): Promise<ShiftRequirement[]>;
  getShiftRequirementsByShift(shiftId: number): Promise<ShiftRequirement[]>;
  createShiftRequirement(requirement: InsertShiftRequirement): Promise<ShiftRequirement>;
  updateShiftRequirement(id: number, requirement: Partial<InsertShiftRequirement>): Promise<ShiftRequirement | undefined>;
  deleteShiftRequirement(id: number): Promise<boolean>;

  // Shift Subscriptions
  getShiftSubscription(id: number): Promise<ShiftSubscription | undefined>;
  getShiftSubscriptions(shiftId?: number, userId?: number): Promise<ShiftSubscription[]>;
  getShiftSubscriptionsByShift(shiftId: number): Promise<ShiftSubscription[]>;
  getShiftSubscriptionsByUser(userId: number): Promise<ShiftSubscription[]>;
  createShiftSubscription(subscription: InsertShiftSubscription): Promise<ShiftSubscription>;
  updateShiftSubscription(id: number, subscription: Partial<InsertShiftSubscription>): Promise<ShiftSubscription | undefined>;
  deleteShiftSubscription(id: number): Promise<boolean>;

  // Shift Assignments
  getShiftAssignment(id: number): Promise<ShiftAssignment | undefined>;
  getShiftAssignments(shiftId?: number, userId?: number): Promise<ShiftAssignment[]>;
  getShiftAssignmentsByShift(shiftId: number): Promise<ShiftAssignment[]>;
  getShiftAssignmentsByUser(userId: number): Promise<ShiftAssignment[]>;
  createShiftAssignment(assignment: InsertShiftAssignment): Promise<ShiftAssignment>;
  updateShiftAssignment(id: number, assignment: Partial<InsertShiftAssignment>): Promise<ShiftAssignment | undefined>;
  deleteShiftAssignment(id: number): Promise<boolean>;

  // Scheduling Windows
  getSchedulingWindow(id: number): Promise<SchedulingWindow | undefined>;
  getSchedulingWindows(locationId?: number, role?: string): Promise<SchedulingWindow[]>;
  getSchedulingWindowsByLocation(locationId: number): Promise<SchedulingWindow[]>;
  createSchedulingWindow(window: InsertSchedulingWindow): Promise<SchedulingWindow>;
  updateSchedulingWindow(id: number, window: Partial<InsertSchedulingWindow>): Promise<SchedulingWindow | undefined>;
  deleteSchedulingWindow(id: number): Promise<boolean>;

  // Cash Count Management
  getCashCount(id: number): Promise<CashCount | undefined>;
  getCashCounts(): Promise<CashCount[]>;
  getCashCountsByLocation(locationId: number): Promise<CashCount[]>;
  getCashCountsByShift(shiftId: number): Promise<CashCount[]>;
  getCashCountsByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<CashCount[]>;
  createCashCount(cashCount: InsertCashCount): Promise<CashCount>;
  updateCashCount(id: number, cashCount: Partial<InsertCashCount>): Promise<CashCount | undefined>;
  deleteCashCount(id: number): Promise<boolean>;

  // Application Management
  getApplicationsByLocation(locationId: number): Promise<User[]>;

  // Knowledge Base
  getKbCategory(id: number): Promise<KbCategory | undefined>;
  getKbCategories(): Promise<KbCategory[]>;
  getKbCategoriesByLocation(locationId: number): Promise<KbCategory[]>;
  createKbCategory(category: InsertKbCategory): Promise<KbCategory>;
  updateKbCategory(id: number, category: Partial<InsertKbCategory>): Promise<KbCategory | undefined>;
  deleteKbCategory(id: number): Promise<boolean>;

  getKbArticle(id: number): Promise<KbArticle | undefined>;
  getKbArticles(): Promise<KbArticle[]>;
  getKbArticlesByCategory(categoryId: number): Promise<KbArticle[]>;
  createKbArticle(article: InsertKbArticle): Promise<KbArticle>;
  updateKbArticle(id: number, article: Partial<InsertKbArticle>): Promise<KbArticle | undefined>;
  deleteKbArticle(id: number): Promise<boolean>;

  // File Management
  getUploadedFile(id: number): Promise<UploadedFile | undefined>;
  getUploadedFiles(): Promise<UploadedFile[]>;
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  updateUploadedFile(id: number, file: Partial<InsertUploadedFile>): Promise<UploadedFile | undefined>;
  deleteUploadedFile(id: number): Promise<boolean>;

  // Notes Management
  getNoteRef(id: number): Promise<NoteRef | undefined>;
  getNoteRefs(): Promise<NoteRef[]>;
  getNoteRefsByUser(userId: number): Promise<NoteRef[]>;
  getNoteRefsByApplicant(applicantId: number): Promise<NoteRef[]>;
  createNoteRef(noteRef: InsertNoteRef): Promise<NoteRef>;
  updateNoteRef(id: number, noteRef: Partial<InsertNoteRef>): Promise<NoteRef | undefined>;
  deleteNoteRef(id: number): Promise<boolean>;
  userHasAccessToApplicant(userId: number, applicantId: number): Promise<boolean>;

  // Cache Management
  getCache(key: string): Promise<any | null>;
  setCache(key: string, value: any, expiresAt?: Date, category?: string): Promise<void>;
  deleteCache(key: string): Promise<boolean>;
  deleteCacheByCategory(category: string): Promise<number>;
  cleanExpiredCache(): Promise<number>;
}

// ===== DATABASE STORAGE IMPLEMENTATION =====
export class DatabaseStorage implements IStorage {
  private redisService: OnDemandRedisService;
  private mongoService: typeof onDemandMongoService;

  constructor() {
    this.redisService = new OnDemandRedisService();
    this.mongoService = onDemandMongoService;
  }

  // ===== USER MANAGEMENT =====
  
  async getUser(id: number): Promise<User | undefined> {
    const cacheKey = getCacheKey('getUser', { id });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (user) {
      await initializeWorkflowPermissions(user);
      setCache(cacheKey, user);
    }
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const cacheKey = getCacheKey('getUserByUsername', { username });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (user) {
      await initializeWorkflowPermissions(user);
      setCache(cacheKey, user);
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const cacheKey = getCacheKey('getUserByEmail', { email });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user) {
      await initializeWorkflowPermissions(user);
      setCache(cacheKey, user);
    }
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userWithPublicId = {
      ...insertUser,
      public_id: insertUser.public_id || generatePublicId()
    };

    const [user] = await db.insert(users).values(userWithPublicId).returning();
    await initializeWorkflowPermissions(user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getUsers(): Promise<User[]> {
    const cacheKey = 'getUsers';
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const allUsers = await db.select().from(users).orderBy(asc(users.name));
    setCache(cacheKey, allUsers);
    return allUsers;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const cacheKey = getCacheKey('getUsersByRole', { role });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    let query = db.select().from(users);
    
    if (role === 'staff') {
      // Include both 'staff' and 'crew_member' roles for backward compatibility
      query = query.where(inArray(users.role, ['staff', 'crew_member']));
    } else if (role) {
      query = query.where(eq(users.role, role));
    }

    const roleUsers = await query.orderBy(asc(users.name));
    setCache(cacheKey, roleUsers);
    return roleUsers;
  }

  async getUsersByLocation(locationId: number): Promise<User[]> {
    const cacheKey = getCacheKey('getUsersByLocation', { locationId });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const locationUsers = await db
      .select({ user: users })
      .from(users)
      .innerJoin(userLocations, eq(users.id, userLocations.userId))
      .where(eq(userLocations.locationId, locationId))
      .then(results => results.map(r => r.user));

    setCache(cacheKey, locationUsers);
    return locationUsers;
  }

  async getUserWithProfile(userId: number): Promise<User | undefined> {
    return await this.getUser(userId);
  }

  // ===== LOCATION MANAGEMENT =====

  async getLocation(id: number): Promise<Location | undefined> {
    const cacheKey = getCacheKey('getLocation', { id });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    if (location) {
      setCache(cacheKey, location);
    }
    return location;
  }

  async getLocations(): Promise<Location[]> {
    const cacheKey = 'getLocations';
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const allLocations = await db.select().from(locations).orderBy(asc(locations.name));
    setCache(cacheKey, allLocations);
    return allLocations;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const locationWithPublicId = {
      ...insertLocation,
      public_id: insertLocation.public_id || generatePublicId()
    };

    const [location] = await db.insert(locations).values(locationWithPublicId).returning();
    return location;
  }

  async updateLocation(id: number, updates: Partial<InsertLocation>): Promise<Location | undefined> {
    const [location] = await db.update(locations).set(updates).where(eq(locations.id, id)).returning();
    return location;
  }

  async deleteLocation(id: number): Promise<boolean> {
    await db.delete(locations).where(eq(locations.id, id));
    return true;
  }

  // ===== USER-LOCATION RELATIONSHIPS =====

  async getUserLocations(userId: number): Promise<UserLocation[]> {
    const cacheKey = getCacheKey('getUserLocations', { userId });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const userLocs = await db.select().from(userLocations).where(eq(userLocations.userId, userId));
    setCache(cacheKey, userLocs);
    return userLocs;
  }

  async assignUserToLocation(assignment: InsertUserLocation): Promise<UserLocation> {
    const [userLocation] = await db.insert(userLocations).values(assignment).returning();
    return userLocation;
  }

  async removeUserFromLocation(userId: number, locationId: number): Promise<boolean> {
    await db.delete(userLocations).where(
      and(eq(userLocations.userId, userId), eq(userLocations.locationId, locationId))
    );
    return true;
  }

  async getCrewMembersByLocation(locationId: number): Promise<User[]> {
    const cacheKey = getCacheKey('getCrewMembersByLocation', { locationId });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const crewMembers = await db
      .select({ user: users })
      .from(users)
      .innerJoin(userLocations, eq(users.id, userLocations.userId))
      .where(
        and(
          eq(userLocations.locationId, locationId),
          inArray(users.role, ['crew_member', 'crew_chief', 'staff'])
        )
      )
      .then(results => results.map(r => r.user));

    setCache(cacheKey, crewMembers);
    return crewMembers;
  }

  // ===== WEEK SCHEDULES =====

  async getWeekSchedule(id: number): Promise<WeekSchedule | undefined> {
    return await this.getWeekScheduleById(id);
  }

  async getWeekScheduleById(id: number): Promise<WeekSchedule | undefined> {
    const cacheKey = getCacheKey('getWeekSchedule', { id });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const [schedule] = await db.select().from(weekSchedules).where(eq(weekSchedules.id, id));
    if (schedule) {
      setCache(cacheKey, schedule);
    }
    return schedule;
  }

  async getWeekSchedules(locationId?: number): Promise<WeekSchedule[]> {
    const cacheKey = getCacheKey('getWeekSchedules', { locationId });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    let query = db.select().from(weekSchedules);
    if (locationId) {
      query = query.where(eq(weekSchedules.locationId, locationId));
    }

    const schedules = await query.orderBy(desc(weekSchedules.createdAt));
    setCache(cacheKey, schedules);
    return schedules;
  }

  async createWeekSchedule(insertSchedule: InsertWeekSchedule): Promise<WeekSchedule> {
    const [schedule] = await db.insert(weekSchedules).values(insertSchedule).returning();
    return schedule;
  }

  async updateWeekSchedule(id: number, updates: Partial<InsertWeekSchedule>): Promise<WeekSchedule | undefined> {
    const [schedule] = await db.update(weekSchedules).set(updates).where(eq(weekSchedules.id, id)).returning();
    return schedule;
  }

  async deleteWeekSchedule(id: number): Promise<boolean> {
    await db.delete(weekSchedules).where(eq(weekSchedules.id, id));
    return true;
  }

  async createShiftForWeekSchedule(shift: InsertShift): Promise<Shift> {
    return await this.createShift(shift);
  }

  async getShiftsByWeekSchedule(weekScheduleId: number): Promise<Shift[]> {
    const cacheKey = getCacheKey('getShiftsByWeekSchedule', { weekScheduleId });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const weekShifts = await db.select().from(shifts).where(eq(shifts.weekScheduleId, weekScheduleId));
    setCache(cacheKey, weekShifts);
    return weekShifts;
  }

  // ===== SHIFT MANAGEMENT =====

  async getShift(id: number): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift;
  }

  async getShifts(): Promise<Shift[]> {
    return await db.select().from(shifts).orderBy(asc(shifts.date));
  }

  async getShiftsBySchedule(scheduleId: number): Promise<Shift[]> {
    return await db.select().from(shifts).where(eq(shifts.weekScheduleId, scheduleId));
  }

  async getShiftsByUser(userId: number): Promise<Shift[]> {
    return await db.select().from(shifts).where(eq(shifts.userId, userId));
  }

  async getShiftsByDate(scheduleId: number, date: Date): Promise<Shift[]> {
    return await db.select().from(shifts).where(
      and(eq(shifts.weekScheduleId, scheduleId), eq(shifts.date, date))
    );
  }

  async getShiftsByLocation(locationId: number): Promise<Shift[]> {
    const cacheKey = getCacheKey('getShiftsByLocation', { locationId });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const locationShifts = await db
      .select({ shift: shifts })
      .from(shifts)
      .innerJoin(weekSchedules, eq(shifts.weekScheduleId, weekSchedules.id))
      .where(eq(weekSchedules.locationId, locationId))
      .then(results => results.map(r => r.shift));

    setCache(cacheKey, locationShifts);
    return locationShifts;
  }

  async createShift(insertShift: InsertShift): Promise<Shift> {
    const [shift] = await db.insert(shifts).values(insertShift).returning();
    return shift;
  }

  async updateShift(id: number, updates: Partial<InsertShift>): Promise<Shift | undefined> {
    const [shift] = await db.update(shifts).set(updates).where(eq(shifts.id, id)).returning();
    return shift;
  }

  async deleteShift(id: number): Promise<boolean> {
    await db.delete(shifts).where(eq(shifts.id, id));
    return true;
  }

  // ===== CASH COUNTS =====

  async getCashCount(id: number): Promise<CashCount | undefined> {
    const [cashCount] = await db.select().from(cashCounts).where(eq(cashCounts.id, id));
    return cashCount;
  }

  async getCashCounts(): Promise<CashCount[]> {
    return await db.select().from(cashCounts).orderBy(desc(cashCounts.createdAt));
  }

  async getCashCountsByLocation(locationId: number): Promise<CashCount[]> {
    const cacheKey = getCacheKey('getCashCountsByLocation', { locationId });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const locationCashCounts = await db.select().from(cashCounts).where(eq(cashCounts.locationId, locationId));
    setCache(cacheKey, locationCashCounts);
    return locationCashCounts;
  }

  async getCashCountsByShift(shiftId: number): Promise<CashCount[]> {
    // Note: shiftId column doesn't exist in schema yet, returning empty array
    return [];
  }

  async getCashCountsByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<CashCount[]> {
    return await db.select().from(cashCounts).where(
      and(
        eq(cashCounts.locationId, locationId),
        gte(cashCounts.createdAt, startDate),
        lte(cashCounts.createdAt, endDate)
      )
    );
  }

  async createCashCount(insertCashCount: InsertCashCount): Promise<CashCount> {
    const [cashCount] = await db.insert(cashCounts).values(insertCashCount).returning();
    return cashCount;
  }

  async updateCashCount(id: number, updates: Partial<InsertCashCount>): Promise<CashCount | undefined> {
    const [cashCount] = await db.update(cashCounts).set(updates).where(eq(cashCounts.id, id)).returning();
    return cashCount;
  }

  async deleteCashCount(id: number): Promise<boolean> {
    await db.delete(cashCounts).where(eq(cashCounts.id, id));
    return true;
  }

  // ===== APPLICANT MANAGEMENT =====

  async getApplicant(id: number): Promise<User | undefined> {
    const [applicant] = await db.select().from(users).where(
      and(eq(users.id, id), eq(users.role, 'applicant'))
    );
    return applicant;
  }

  async getApplicants(): Promise<User[]> {
    const cacheKey = 'getApplicants';
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const applicants = await db.select().from(users).where(eq(users.role, 'applicant')).orderBy(desc(users.createdAt));
    setCache(cacheKey, applicants);
    return applicants;
  }

  async getApplicantsByLocation(locationId: number): Promise<User[]> {
    const cacheKey = getCacheKey('getApplicantsByLocation', { locationId });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const locationApplicants = await db
      .select({ user: users })
      .from(users)
      .innerJoin(userLocations, eq(users.id, userLocations.userId))
      .where(
        and(
          eq(users.role, 'applicant'),
          eq(userLocations.locationId, locationId)
        )
      )
      .then(results => results.map(r => r.user));

    setCache(cacheKey, locationApplicants);
    return locationApplicants;
  }

  async getApplicantsByStatus(status: string): Promise<User[]> {
    const cacheKey = getCacheKey('getApplicantsByStatus', { status });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const statusApplicants = await db.select().from(users).where(
      and(eq(users.role, 'applicant'), eq(users.status, status))
    );
    setCache(cacheKey, statusApplicants);
    return statusApplicants;
  }

  async getApplicantByUserId(userId: number): Promise<User | undefined> {
    return await this.getApplicant(userId);
  }

  async createApplicant(insertApplicant: InsertUser): Promise<User> {
    const applicantData = {
      ...insertApplicant,
      role: 'applicant' as const,
      public_id: insertApplicant.public_id || generatePublicId()
    };

    const [applicant] = await db.insert(users).values(applicantData).returning();
    return applicant;
  }

  async updateApplicant(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [applicant] = await db.update(users).set(updates).where(
      and(eq(users.id, id), eq(users.role, 'applicant'))
    ).returning();
    return applicant;
  }

  async deleteApplicant(id: number): Promise<boolean> {
    await db.delete(users).where(
      and(eq(users.id, id), eq(users.role, 'applicant'))
    );
    return true;
  }

  async getApplicationsByLocation(locationId: number): Promise<User[]> {
    return await this.getApplicantsByLocation(locationId);
  }

  // ===== NOTES MANAGEMENT =====

  async getNoteRef(id: number): Promise<NoteRef | undefined> {
    const [noteRef] = await db.select().from(noteRefs).where(eq(noteRefs.id, id));
    return noteRef;
  }

  async getNoteRefs(): Promise<NoteRef[]> {
    return await db.select().from(noteRefs).orderBy(desc(noteRefs.createdAt));
  }

  async getNoteRefsByUser(userId: number): Promise<NoteRef[]> {
    return await db.select().from(noteRefs).where(eq(noteRefs.userId, userId));
  }

  async getNoteRefsByApplicant(applicantId: number): Promise<NoteRef[]> {
    return await db.select().from(noteRefs).where(eq(noteRefs.userId, applicantId));
  }

  async createNoteRef(insertNoteRef: InsertNoteRef): Promise<NoteRef> {
    const [noteRef] = await db.insert(noteRefs).values(insertNoteRef).returning();
    return noteRef;
  }

  async updateNoteRef(id: number, updates: Partial<InsertNoteRef>): Promise<NoteRef | undefined> {
    const [noteRef] = await db.update(noteRefs).set(updates).where(eq(noteRefs.id, id)).returning();
    return noteRef;
  }

  async deleteNoteRef(id: number): Promise<boolean> {
    await db.delete(noteRefs).where(eq(noteRefs.id, id));
    return true;
  }

  async userHasAccessToApplicant(userId: number, applicantId: number): Promise<boolean> {
    // Basic implementation - could be enhanced with proper permission logic
    const user = await this.getUser(userId);
    return user?.role === 'administrator' || user?.role === 'owner' || userId === applicantId;
  }

  // ===== FILE MANAGEMENT =====

  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    const [file] = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id));
    return file;
  }

  async getUploadedFiles(): Promise<UploadedFile[]> {
    return await db.select().from(uploadedFiles).orderBy(desc(uploadedFiles.createdAt));
  }

  async createUploadedFile(insertFile: InsertUploadedFile): Promise<UploadedFile> {
    const [file] = await db.insert(uploadedFiles).values(insertFile).returning();
    return file;
  }

  async updateUploadedFile(id: number, updates: Partial<InsertUploadedFile>): Promise<UploadedFile | undefined> {
    const [file] = await db.update(uploadedFiles).set(updates).where(eq(uploadedFiles.id, id)).returning();
    return file;
  }

  async deleteUploadedFile(id: number): Promise<boolean> {
    await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id));
    return true;
  }

  // ===== CACHE MANAGEMENT =====

  async getCache(key: string): Promise<any | null> {
    return await this.redisService.withConnection(async (client) => {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    });
  }

  async setCache(key: string, value: any, expiresAt?: Date, category?: string): Promise<void> {
    await this.redisService.withConnection(async (client) => {
      const stringValue = JSON.stringify(value);
      if (expiresAt) {
        const ttl = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        await client.setex(key, ttl, stringValue);
      } else {
        await client.set(key, stringValue);
      }
    });
  }

  async deleteCache(key: string): Promise<boolean> {
    return await this.redisService.withConnection(async (client) => {
      const result = await client.del(key);
      return result > 0;
    });
  }

  async deleteCacheByCategory(category: string): Promise<number> {
    return await this.redisService.withConnection(async (client) => {
      const keys = await client.keys(`${category}:*`);
      if (keys.length === 0) return 0;
      return await client.del(...keys);
    });
  }

  async cleanExpiredCache(): Promise<number> {
    // Redis handles expiration automatically, return 0 for compatibility
    return 0;
  }

  // ===== PLACEHOLDER METHODS FOR COMPLETENESS =====
  // These methods exist in the interface but are not fully implemented

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

  async createCompetency(insertCompetency: InsertCompetency): Promise<Competency> {
    const [competency] = await db.insert(competencies).values(insertCompetency).returning();
    return competency;
  }

  async updateCompetency(id: number, updates: Partial<InsertCompetency>): Promise<Competency | undefined> {
    const [competency] = await db.update(competencies).set(updates).where(eq(competencies.id, id)).returning();
    return competency;
  }

  async deleteCompetency(id: number): Promise<boolean> {
    await db.delete(competencies).where(eq(competencies.id, id));
    return true;
  }

  async getUserCompetency(id: number): Promise<UserCompetency | undefined> {
    const [userCompetency] = await db.select().from(userCompetencies).where(eq(userCompetencies.id, id));
    return userCompetency;
  }

  async getUserCompetencies(): Promise<UserCompetency[]> {
    return await db.select().from(userCompetencies);
  }

  async getUserCompetenciesByUser(userId: number): Promise<UserCompetency[]> {
    return await db.select().from(userCompetencies).where(eq(userCompetencies.userId, userId));
  }

  async getUserCompetenciesByCompetency(competencyId: number): Promise<UserCompetency[]> {
    return await db.select().from(userCompetencies).where(eq(userCompetencies.competencyId, competencyId));
  }

  async createUserCompetency(insertUserCompetency: InsertUserCompetency): Promise<UserCompetency> {
    const [userCompetency] = await db.insert(userCompetencies).values(insertUserCompetency).returning();
    return userCompetency;
  }

  async updateUserCompetency(id: number, updates: Partial<InsertUserCompetency>): Promise<UserCompetency | undefined> {
    const [userCompetency] = await db.update(userCompetencies).set(updates).where(eq(userCompetencies.id, id)).returning();
    return userCompetency;
  }

  async deleteUserCompetency(id: number): Promise<boolean> {
    await db.delete(userCompetencies).where(eq(userCompetencies.id, id));
    return true;
  }

  // Placeholder implementations for methods that require full scheduler implementation
  async getScheduleTemplate(id: number): Promise<ScheduleTemplate | undefined> { throw new Error('Not implemented'); }
  async getScheduleTemplates(): Promise<ScheduleTemplate[]> { throw new Error('Not implemented'); }
  async getScheduleTemplatesByLocation(locationId: number): Promise<ScheduleTemplate[]> { throw new Error('Not implemented'); }
  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> { throw new Error('Not implemented'); }
  async updateScheduleTemplate(id: number, template: Partial<InsertScheduleTemplate>): Promise<ScheduleTemplate | undefined> { throw new Error('Not implemented'); }
  async deleteScheduleTemplate(id: number): Promise<boolean> { throw new Error('Not implemented'); }

  async getTemplateShift(id: number): Promise<TemplateShift | undefined> { throw new Error('Not implemented'); }
  async getTemplateShifts(): Promise<TemplateShift[]> { throw new Error('Not implemented'); }
  async getTemplateShiftsByTemplate(templateId: number): Promise<TemplateShift[]> { throw new Error('Not implemented'); }
  async getTemplateShiftsByDay(templateId: number, dayOfWeek: number): Promise<TemplateShift[]> { throw new Error('Not implemented'); }
  async createTemplateShift(shift: InsertTemplateShift): Promise<TemplateShift> { throw new Error('Not implemented'); }
  async updateTemplateShift(id: number, shift: Partial<InsertTemplateShift>): Promise<TemplateShift | undefined> { throw new Error('Not implemented'); }
  async deleteTemplateShift(id: number): Promise<boolean> { throw new Error('Not implemented'); }

  async createMultiWeekFrame(frame: InsertMultiWeekFrame): Promise<MultiWeekFrame> { throw new Error('Not implemented'); }
  async getMultiWeekFrame(id: number): Promise<MultiWeekFrame | undefined> { throw new Error('Not implemented'); }
  async getMultiWeekFrames(locationId?: number): Promise<MultiWeekFrame[]> { throw new Error('Not implemented'); }
  async updateMultiWeekFrame(id: number, frame: Partial<InsertMultiWeekFrame>): Promise<MultiWeekFrame | undefined> { throw new Error('Not implemented'); }
  async deleteMultiWeekFrame(id: number): Promise<boolean> { throw new Error('Not implemented'); }
  async copyWeekScheduleToFrame(sourceWeekScheduleId: number, multiWeekFrameId: number, weekNumber: number): Promise<WeekSchedule> { throw new Error('Not implemented'); }
  async getWeekSchedulesByFrame(frameId: number): Promise<WeekSchedule[]> { throw new Error('Not implemented'); }

  async getShiftRequirement(id: number): Promise<ShiftRequirement | undefined> { throw new Error('Not implemented'); }
  async getShiftRequirements(shiftId?: number): Promise<ShiftRequirement[]> { throw new Error('Not implemented'); }
  async getShiftRequirementsByShift(shiftId: number): Promise<ShiftRequirement[]> { throw new Error('Not implemented'); }
  async createShiftRequirement(requirement: InsertShiftRequirement): Promise<ShiftRequirement> { throw new Error('Not implemented'); }
  async updateShiftRequirement(id: number, requirement: Partial<InsertShiftRequirement>): Promise<ShiftRequirement | undefined> { throw new Error('Not implemented'); }
  async deleteShiftRequirement(id: number): Promise<boolean> { throw new Error('Not implemented'); }

  async getShiftSubscription(id: number): Promise<ShiftSubscription | undefined> { throw new Error('Not implemented'); }
  async getShiftSubscriptions(shiftId?: number, userId?: number): Promise<ShiftSubscription[]> { throw new Error('Not implemented'); }
  async getShiftSubscriptionsByShift(shiftId: number): Promise<ShiftSubscription[]> { throw new Error('Not implemented'); }
  async getShiftSubscriptionsByUser(userId: number): Promise<ShiftSubscription[]> { throw new Error('Not implemented'); }
  async createShiftSubscription(subscription: InsertShiftSubscription): Promise<ShiftSubscription> { throw new Error('Not implemented'); }
  async updateShiftSubscription(id: number, subscription: Partial<InsertShiftSubscription>): Promise<ShiftSubscription | undefined> { throw new Error('Not implemented'); }
  async deleteShiftSubscription(id: number): Promise<boolean> { throw new Error('Not implemented'); }

  async getShiftAssignment(id: number): Promise<ShiftAssignment | undefined> { throw new Error('Not implemented'); }
  async getShiftAssignments(shiftId?: number, userId?: number): Promise<ShiftAssignment[]> { throw new Error('Not implemented'); }
  async getShiftAssignmentsByShift(shiftId: number): Promise<ShiftAssignment[]> { throw new Error('Not implemented'); }
  async getShiftAssignmentsByUser(userId: number): Promise<ShiftAssignment[]> { throw new Error('Not implemented'); }
  async createShiftAssignment(assignment: InsertShiftAssignment): Promise<ShiftAssignment> { throw new Error('Not implemented'); }
  async updateShiftAssignment(id: number, assignment: Partial<InsertShiftAssignment>): Promise<ShiftAssignment | undefined> { throw new Error('Not implemented'); }
  async deleteShiftAssignment(id: number): Promise<boolean> { throw new Error('Not implemented'); }

  async getSchedulingWindow(id: number): Promise<SchedulingWindow | undefined> { throw new Error('Not implemented'); }
  async getSchedulingWindows(locationId?: number, role?: string): Promise<SchedulingWindow[]> { throw new Error('Not implemented'); }
  async getSchedulingWindowsByLocation(locationId: number): Promise<SchedulingWindow[]> { throw new Error('Not implemented'); }
  async createSchedulingWindow(window: InsertSchedulingWindow): Promise<SchedulingWindow> { throw new Error('Not implemented'); }
  async updateSchedulingWindow(id: number, window: Partial<InsertSchedulingWindow>): Promise<SchedulingWindow | undefined> { throw new Error('Not implemented'); }
  async deleteSchedulingWindow(id: number): Promise<boolean> { throw new Error('Not implemented'); }

  async getKbCategory(id: number): Promise<KbCategory | undefined> { throw new Error('Not implemented'); }
  async getKbCategories(): Promise<KbCategory[]> { throw new Error('Not implemented'); }
  async getKbCategoriesByLocation(locationId: number): Promise<KbCategory[]> { throw new Error('Not implemented'); }
  async createKbCategory(category: InsertKbCategory): Promise<KbCategory> { throw new Error('Not implemented'); }
  async updateKbCategory(id: number, category: Partial<InsertKbCategory>): Promise<KbCategory | undefined> { throw new Error('Not implemented'); }
  async deleteKbCategory(id: number): Promise<boolean> { throw new Error('Not implemented'); }

  async getKbArticle(id: number): Promise<KbArticle | undefined> { throw new Error('Not implemented'); }
  async getKbArticles(): Promise<KbArticle[]> { throw new Error('Not implemented'); }
  async getKbArticlesByCategory(categoryId: number): Promise<KbArticle[]> { throw new Error('Not implemented'); }
  async createKbArticle(article: InsertKbArticle): Promise<KbArticle> { throw new Error('Not implemented'); }
  async updateKbArticle(id: number, article: Partial<InsertKbArticle>): Promise<KbArticle | undefined> { throw new Error('Not implemented'); }
  async deleteKbArticle(id: number): Promise<boolean> { throw new Error('Not implemented'); }
}

export const storage = new DatabaseStorage();