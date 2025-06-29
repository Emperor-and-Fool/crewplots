import {
  users, locations, competencies, userLocations, userCompetencies,
  scheduleTemplates, templateShifts, scheduleBlocks, weekSchedules, shifts, shiftRequirements,
  shiftSubscriptions, shiftAssignments, schedulingWindows, cashCounts,
  kbCategories, kbArticles, uploadedFiles, noteRefs, hybridCache,
  type User, type Location, type Competency, type UserLocation, type UserCompetency,
  type ScheduleTemplate, type TemplateShift, type ScheduleBlock,
  type WeekSchedule, type Shift, type ShiftRequirement, type ShiftSubscription, type ShiftAssignment,
  type SchedulingWindow, type CashCount, type KbCategory, type KbArticle, type NoteRef,
  type UploadedFile, type HybridCache,
  type InsertUser, type InsertLocation, type InsertCompetency, type InsertUserLocation,
  type InsertUserCompetency, type InsertScheduleTemplate,
  type InsertTemplateShift, type InsertScheduleBlock, type InsertWeekSchedule, type InsertShift,
  type InsertShiftRequirement, type InsertShiftSubscription, type InsertShiftAssignment,
  type InsertSchedulingWindow, type InsertCashCount, type InsertKbCategory, 
  type InsertKbArticle, type InsertNoteRef, type InsertUploadedFile, 
  generatePublicId
} from "@shared/schema";

// Aliases for backward compatibility - using correct weekSchedules table
// const weekSchedules = weeks; // near-future-removal: Legacy alias removed
// type WeekSchedule = Week; // near-future-removal: Legacy alias removed  
// type InsertWeekSchedule = InsertWeek; // near-future-removal: Legacy alias removed
import { db } from "./db";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { OnDemandRedisService } from "../adapters-repl/redis-ondemand/on-demand-redis";
import { onDemandMongoService } from "../adapters-repl/mongodb-ondemand/on-demand-mongodb";
import { initializeWorkflowPermissions } from './utils/assign-default-permissions';

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

// Legacy interface removed - modern implementation uses direct Drizzle ORM calls
// near-future-removal: Clean up remaining DatabaseStorage class implementation

// near-future-removal: MemStorage class - dead code, never used in production
// Application uses DatabaseStorage exclusively, MemStorage missing 52+ IStorage methods
// This was intended for development phase but app went directly to database storage
/*
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location>;
  private competencies: Map<number, Competency>;
  private staff: Map<number, Staff>;
  private staffCompetencies: Map<number, StaffCompetency>;
  private applicants: Map<number, Applicant>;
  private scheduleTemplates: Map<number, ScheduleTemplate>;
  private templateShifts: Map<number, TemplateShift>;

  private shifts: Map<number, Shift>;
  private cashCounts: Map<number, CashCount>;
  private kbCategories: Map<number, KbCategory>;
  private kbArticles: Map<number, KbArticle>;
  private uploadedFiles: Map<number, UploadedFile>;
  // private documentAttachments: Map<number, DocumentAttachment>; // near-future-removal: Feature not implemented yet
  private _userDocuments: Map<number, any>;

  private currentUserId: number;
  private currentLocationId: number;
  private currentCompetencyId: number;
  private currentStaffId: number;
  private currentStaffCompetencyId: number;
  private currentApplicantId: number;
  private currentScheduleTemplateId: number;
  private currentTemplateShiftId: number;

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

    this.shifts = new Map();
    this.cashCounts = new Map();
    this.kbCategories = new Map();
    this.kbArticles = new Map();
    this.uploadedFiles = new Map();
    // this.documentAttachments = new Map(); // near-future-removal: Feature not implemented yet
    this._userDocuments = new Map();

    this.currentUserId = 1;
    this.currentLocationId = 1;
    this.currentCompetencyId = 1;
    this.currentUserLocationId = 1;
    this.currentUserCompetencyId = 1;
    this.currentApplicantId = 1;
    this.currentScheduleTemplateId = 1;
    this.currentTemplateShiftId = 1;

    this.currentShiftId = 1;
    this.currentCashCountId = 1;
    this.currentKbCategoryId = 1;
    this.currentKbArticleId = 1;
    this.currentUploadedFileId = 1;
    this.currentDocumentAttachmentId = 1;

    // Add default admin user
    this.createUser({
      username: "admin",
      password: "$2b$10$zKjZf0/ngR5c/xEJR8uMmeoaod8.MJopCz.lvabeSyOkw1RV2sIx2", // adminpass123
      email: "manager@crewplots.nl",
      name: "Pieter van der Meer",
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
    const workflowPermissions = initializeWorkflowPermissions(user.role);
    
    const newUser: User = {
      id: this.currentUserId++,
      public_id: generatePublicId(12),
      createdAt: new Date(),
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      locationId: user.locationId ?? null,
      phoneNumber: user.phoneNumber ?? null,
      resumeUrl: user.resumeUrl ?? null,
      notes: user.notes ?? null,
      workflowPermissions: workflowPermissions ?? null,
      blockedPermissions: null,
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
  async getCrewMembersByLocation(locationId: number): Promise<User[]> {
    // Get users who have crew roles at this location
    const userLocationPairs = Array.from(this.userLocations.values())
      .filter(ul => ul.locationId === locationId && 
                   ['crew_member', 'crew_manager', 'floor_manager'].includes(ul.roleAtLocation));
    
    return userLocationPairs
      .map(ul => this.users.get(ul.userId))
      .filter(user => user !== undefined) as User[];
  }

  async getUserLocations(userId: number): Promise<UserLocation[]> {
    return Array.from(this.userLocations.values())
      .filter(ul => ul.userId === userId);
  }

  async assignUserToLocation(assignment: InsertUserLocation): Promise<UserLocation> {
    const newAssignment: UserLocation = {
      id: this.currentUserLocationId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...assignment
    };
    this.userLocations.set(newAssignment.id, newAssignment);
    return newAssignment;
  }

  async removeUserFromLocation(userId: number, locationId: number): Promise<boolean> {
    const assignment = Array.from(this.userLocations.values())
      .find(ul => ul.userId === userId && ul.locationId === locationId);
    
    if (assignment) {
      this.userLocations.delete(assignment.id);
      return true;
    }
    return false;
  }

  // near-future-removal: Legacy Staff methods removed - use User-based crew management instead

  // near-future-removal: Legacy StaffCompetency methods removed - use UserCompetency methods instead

  // near-future-removal: All legacy Map-based methods removed - application uses database storage exclusively

  // near-future-removal: Legacy Map-based schedule template methods removed - use database storage exclusively

  // near-future-removal: Legacy Map-based template shift methods removed - use database storage exclusively

  // Weekly Schedules


  // near-future-removal: Legacy Map-based shift methods removed - use database storage exclusively

  // near-future-removal: Legacy Map-based cash count methods removed - use database storage exclusively

  // near-future-removal: Legacy Map-based KB category and article methods removed - use database storage exclusively

  // near-future-removal: Legacy Map-based upload file methods removed - use database storage exclusively

  // near-future-removal: Legacy Map-based document attachment methods removed - use database storage exclusively
}
*/

// Legacy DatabaseStorage class removed - using direct Drizzle ORM exports instead
// near-future-removal: Clean up remaining method implementations to export as individual functions

class DatabaseStorage {
  private redisService: OnDemandRedisService;
  
  constructor() {
    this.redisService = OnDemandRedisService.getInstance();
  }
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
      notes: users.notes,
      workflowPermissions: users.workflowPermissions,
      blockedPermissions: users.blockedPermissions,
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

  async getUserById(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return undefined;
    }
  }

  // Removed getUsersByRoles - using existing getProfileData instead

  // Locations
  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async getLocations(): Promise<Location[]> {
    try {
      const result = await db.select().from(locations);
      return result;
    } catch (error) {
      console.error("Error in getLocations:", error);
      return [];
    }
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const locationData = {
      ...location,
      public_id: generatePublicId(12),
      updatedAt: new Date()
    };
    const [createdLocation] = await db.insert(locations).values(locationData).returning();
    return createdLocation;
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const updateData = {
      ...location,
      updatedAt: new Date()
    };
    const [updatedLocation] = await db
      .update(locations)
      .set(updateData)
      .where(eq(locations.id, id))
      .returning();
    return updatedLocation;
  }

  async getLocationByPublicId(publicId: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.public_id, publicId));
    return location;
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
    try {
      return await db.select().from(competencies).where(eq(competencies.locationId, locationId));
    } catch (error) {
      console.error("Error in getCompetenciesByLocation:", error);
      // Return empty array if table doesn't exist yet
      return [];
    }
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

  // Staff - Legacy methods replaced with User-based implementation
  // near-future-removal: Staff table deprecated in favor of User with role filtering
  async getStaff(id: number): Promise<User | undefined> {
    // Return user with staff/crew roles only
    const [user] = await db.select().from(users)
      .where(and(
        eq(users.id, id),
        inArray(users.role, ['crew_member', 'crew_chief', 'app_manager', 'owner', 'administrator'])
      ));
    return user;
  }

  async getStaffMembers(): Promise<User[]> {
    // Return all users with staff/crew roles
    return await db.select().from(users)
      .where(inArray(users.role, ['crew_member', 'crew_chief', 'app_manager', 'owner', 'administrator']));
  }

  async getCrewMembersByLocation(locationId: number): Promise<User[]> {
    try {
      const result = await db.select({
        user: users,
        userLocation: userLocations
      })
      .from(users)
      .innerJoin(userLocations, eq(users.id, userLocations.userId))
      .where(eq(userLocations.locationId, locationId));
      
      console.log(`[DATABASE] Retrieved ${result.length} crew members for location ${locationId}`);
      return result.map(row => row.user);
    } catch (error) {
      console.error("Error in getCrewMembersByLocation:", error);
      return [];
    }
  }

  async getUserLocations(userId: number): Promise<UserLocation[]> {
    try {
      if (userId === 0) {
        // Get all user-location assignments
        const result = await db.select().from(userLocations);
        return result;
      }
      const result = await db.select().from(userLocations).where(eq(userLocations.userId, userId));
      return result;
    } catch (error) {
      console.error("Error in getUserLocations:", error);
      return [];
    }
  }

  async assignUserToLocation(assignment: InsertUserLocation): Promise<UserLocation> {
    try {
      const [result] = await db.insert(userLocations).values(assignment).returning();
      return result;
    } catch (error) {
      console.error("Error in assignUserToLocation:", error);
      throw error;
    }
  }

  async removeUserFromLocation(userId: number, locationId: number): Promise<boolean> {
    try {
      const result = await db.delete(userLocations)
        .where(and(eq(userLocations.userId, userId), eq(userLocations.locationId, locationId)));
      return result.rowCount !== undefined && result.rowCount > 0;
    } catch (error) {
      console.error("Error in removeUserFromLocation:", error);
      return false;
    }
  }

  // near-future-removal: Duplicate getCrewMembersByLocation removed - keeping only the working implementation above

  // Removed getStaffByUser - migrated to user-centric crew management

  // Removed createStaff - migrated to user-centric crew management

  // near-future-removal: Legacy staff methods replaced with User-based implementation
  async updateStaff(id: number, staffMember: Partial<InsertUser>): Promise<User | undefined> {
    // Update user with staff/crew role validation
    const [updatedUser] = await db
      .update(users)
      .set(staffMember)
      .where(and(
        eq(users.id, id),
        inArray(users.role, ['crew_member', 'crew_chief', 'app_manager', 'owner', 'administrator'])
      ))
      .returning();
    return updatedUser;
  }

  async deleteStaff(id: number): Promise<boolean> {
    // Soft delete by updating role to 'applicant' or hard delete based on business logic
    // For now, prevent deletion of staff users for data integrity
    throw new Error('Staff deletion not supported - use role change to applicant instead');
  }

  // User Competencies - Migrated from legacy StaffCompetency
  // near-future-removal: StaffCompetency table deprecated in favor of UserCompetency
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

  async createUserCompetency(userCompetency: InsertUserCompetency): Promise<UserCompetency> {
    const [createdUserCompetency] = await db.insert(userCompetencies).values(userCompetency).returning();
    return createdUserCompetency;
  }

  async updateUserCompetency(id: number, userCompetency: Partial<InsertUserCompetency>): Promise<UserCompetency | undefined> {
    const [updatedUserCompetency] = await db
      .update(userCompetencies)
      .set(userCompetency)
      .where(eq(userCompetencies.id, id))
      .returning();
    return updatedUserCompetency;
  }

  async deleteUserCompetency(id: number): Promise<boolean> {
    await db.delete(userCompetencies).where(eq(userCompetencies.id, id));
    return true;
  }

  // Legacy compatibility methods (near-future-removal)
  async getStaffCompetency(id: number): Promise<UserCompetency | undefined> {
    return this.getUserCompetency(id);
  }

  async getStaffCompetencies(): Promise<UserCompetency[]> {
    return this.getUserCompetencies();
  }

  async getStaffCompetenciesByStaff(staffId: number): Promise<UserCompetency[]> {
    return this.getUserCompetenciesByUser(staffId);
  }

  async getStaffCompetenciesByCompetency(competencyId: number): Promise<UserCompetency[]> {
    return this.getUserCompetenciesByCompetency(competencyId);
  }

  async createStaffCompetency(staffCompetency: InsertUserCompetency): Promise<UserCompetency> {
    return this.createUserCompetency(staffCompetency);
  }

  async updateStaffCompetency(id: number, staffCompetency: Partial<InsertUserCompetency>): Promise<UserCompetency | undefined> {
    return this.updateUserCompetency(id, staffCompetency);
  }

  async deleteStaffCompetency(id: number): Promise<boolean> {
    return this.deleteUserCompetency(id);
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
      // Return ALL users from the unified users table
      // Frontend will cherry-pick data based on role/status as needed
      const result = await db.select()
        .from(users);
      
      console.log(`[UNIFIED DATA] Fetched ${result.length} total users for frontend cherry-picking`);
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
        .where(and(eq(users.role, 'applicant'), eq(users.status, status)));
      
      return result;
    } catch (error) {
      console.error("Error in getApplicantsByStatus:", error);
      return [];
    }
  }

  // near-future-removal: Legacy applicant method replaced with User-based implementation
  async createApplicant(applicant: InsertUser): Promise<User> {
    // Ensure role is set to applicant
    const applicantData = { ...applicant, role: 'applicant' as const };
    const [createdApplicant] = await db.insert(users).values(applicantData).returning();
    return createdApplicant;
  }

  async updateApplicant(id: number, applicantData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updatedApplicant] = await db
        .update(users)
        .set(applicantData)
        .where(and(eq(users.id, id), eq(users.role, 'applicant')))
        .returning();
      
      // Invalidate applicants cache after update
      try {
        await this.redisService.withConnection('storage-write', async (connection: any) => {
          await connection.del('applicants:all');
        });
      } catch (redisError) {
        console.log('Failed to invalidate applicants cache');
      }
      
      return updatedApplicant;
    } catch (error) {
      console.error("Error in updateApplicant:", error);
      return undefined;
    }
  }

  // near-future-removal: Legacy applicant method replaced with User-based implementation
  async deleteApplicant(id: number): Promise<boolean> {
    // Soft delete by updating role or hard delete based on business logic
    // For now, prevent deletion of applicant users for data integrity
    await db.delete(users).where(and(eq(users.id, id), eq(users.role, 'applicant')));
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
  
  // near-future-removal: Legacy applicant method replaced with User-based implementation
  async getAllApplicants(): Promise<User[]> {
    try {
      // Return all users with applicant role from unified users table
      const allApplicants = await db.select()
        .from(users)
        .where(eq(users.role, 'applicant'));
      
      return allApplicants;
    } catch (error) {
      console.error("Error in getAllApplicants:", error);
      return [];
    }
  }

  // near-future-removal: ApplicantDocument feature not developed yet
  /*
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
  */

  // near-future-removal: ApplicantDocument feature not developed yet
  /*
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
  */

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



  async deleteScheduleBlock(id: number): Promise<boolean> {
    await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, id));
    return true;
  }

  async copyWeekToBlock(sourceWeekId: number, scheduleBlockId: number, weekNumber: number): Promise<WeekSchedule> {
    // Get the source week schedule
    const [sourceWeek] = await db.select().from(weekSchedules).where(eq(weekSchedules.id, sourceWeekId));
    if (!sourceWeek) {
      throw new Error("Source week schedule not found");
    }

    // Get all shifts from the source week schedule
    const sourceShifts = await db.select().from(shifts).where(eq(shifts.weekScheduleId, sourceWeekId));

    // Create the new week linked to the block
    const newWeekData = {
      scheduleBlockId,
      weekNumber,
      templateId: sourceWeek.templateId,
    };

    const [newWeek] = await db.insert(weekSchedules).values(newWeekData).returning();

    // Copy all shifts to the new week schedule
    if (sourceShifts.length > 0) {
      const newShiftsData = sourceShifts.map(shift => {
        const newShift = { ...shift };
        delete (newShift as any).id;
        delete (newShift as any).createdAt;
        newShift.weekScheduleId = newWeek.id;
        return newShift;
      });

      await db.insert(shifts).values(newShiftsData);
    }

    return newWeek;
  }

  async getWeeksByBlock(blockId: number): Promise<WeekSchedule[]> {
    return await db.select()
      .from(weekSchedules)
      .where(eq(weekSchedules.scheduleBlockId, blockId))
      .orderBy(weekSchedules.weekNumber);
  }

  // near-future-removal: Legacy duplicate week schedule methods removed - keeping only the working database implementation

  // near-future-removal: Legacy duplicate shift methods removed - keeping only the working database implementation at end of file

  // Location-filtered applications (users with applicant role)
  async getApplicationsByLocation(locationId: number): Promise<User[]> {
    try {
      const result = await db.select()
        .from(users)
        .where(and(eq(users.role, 'applicant'), eq(users.locationId, locationId)));
      
      return result;
    } catch (error) {
      console.error("Error in getApplicationsByLocation:", error);
      return [];
    }
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
    try {
      return await db.select().from(cashCounts).where(eq(cashCounts.locationId, locationId));
    } catch (error) {
      console.error("Error in getCashCountsByLocation:", error);
      // Return empty array if table structure doesn't match
      return [];
    }
  }

  async getCashCountsByShift(shiftId: number): Promise<CashCount[]> {
    // near-future-removal: shiftId field not in current cash_counts schema - feature pending implementation
    return [];
  }

  async getCashCountsByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<CashCount[]> {
    return await db.select().from(cashCounts)
      .where(and(
        eq(cashCounts.locationId, locationId),
        gte(cashCounts.countDate, startDate),
        lte(cashCounts.countDate, endDate)
      ));
  }

  // Composite user profile method (for messaging and auth systems)
  async getUserWithProfile(userId: number): Promise<User | undefined> {
    try {
      // Get user with complete profile data (role, location, permissions)
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      return user;
    } catch (error) {
      console.error("Error in getUserWithProfile:", error);
      return undefined;
    }
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
    // near-future-removal: deleteDocumentAttachmentsByFile method not implemented yet
    // await this.deleteDocumentAttachmentsByFile(id);
    await db.delete(uploadedFiles).where(eq(uploadedFiles.id, id));
    return true;
  }

  // near-future-removal: DocumentAttachment feature not developed yet
  /*
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
  */

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
    // near-future-removal: applicantId field not in current note_refs schema - feature pending implementation
    return [];
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
    
    // near-future-removal: userId property not in current User schema - legacy Staff contamination
    // const applicant = await this.getApplicant(applicantId);
    // if (applicant && applicant.userId === userId) {
    //   return true;
    // }
    
    return false;
  }

  // === Scheduler Storage Methods ===

  // Shift Requirements
  async getShiftRequirement(id: number): Promise<ShiftRequirement | undefined> {
    const results = await db.select().from(shiftRequirements).where(eq(shiftRequirements.id, id));
    return results[0];
  }

  async getShiftRequirements(shiftId?: number): Promise<ShiftRequirement[]> {
    if (shiftId) {
      return await db.select().from(shiftRequirements).where(eq(shiftRequirements.shiftId, shiftId));
    }
    return await db.select().from(shiftRequirements);
  }

  async getShiftRequirementsByShift(shiftId: number): Promise<ShiftRequirement[]> {
    return await db.select().from(shiftRequirements).where(eq(shiftRequirements.shiftId, shiftId));
  }

  async createShiftRequirement(requirement: InsertShiftRequirement): Promise<ShiftRequirement> {
    const results = await db.insert(shiftRequirements).values(requirement).returning();
    return results[0];
  }

  async updateShiftRequirement(id: number, requirement: Partial<InsertShiftRequirement>): Promise<ShiftRequirement | undefined> {
    const results = await db.update(shiftRequirements).set(requirement).where(eq(shiftRequirements.id, id)).returning();
    return results[0];
  }

  async deleteShiftRequirement(id: number): Promise<boolean> {
    const results = await db.delete(shiftRequirements).where(eq(shiftRequirements.id, id)).returning();
    return results.length > 0;
  }

  // Shift Subscriptions
  async getShiftSubscription(id: number): Promise<ShiftSubscription | undefined> {
    const results = await db.select().from(shiftSubscriptions).where(eq(shiftSubscriptions.id, id));
    return results[0];
  }

  async getShiftSubscriptions(shiftId?: number, userId?: number): Promise<ShiftSubscription[]> {
    let query = db.select().from(shiftSubscriptions);
    
    if (shiftId && userId) {
      query = query.where(and(eq(shiftSubscriptions.shiftId, shiftId), eq(shiftSubscriptions.userId, userId)));
    } else if (shiftId) {
      query = query.where(eq(shiftSubscriptions.shiftId, shiftId));
    } else if (userId) {
      query = query.where(eq(shiftSubscriptions.userId, userId));
    }
    
    return await query;
  }

  async getShiftSubscriptionsByShift(shiftId: number): Promise<ShiftSubscription[]> {
    return await db.select().from(shiftSubscriptions).where(eq(shiftSubscriptions.shiftId, shiftId));
  }

  async getShiftSubscriptionsByUser(userId: number): Promise<ShiftSubscription[]> {
    return await db.select().from(shiftSubscriptions).where(eq(shiftSubscriptions.userId, userId));
  }

  async createShiftSubscription(subscription: InsertShiftSubscription): Promise<ShiftSubscription> {
    const results = await db.insert(shiftSubscriptions).values(subscription).returning();
    return results[0];
  }

  async updateShiftSubscription(id: number, subscription: Partial<InsertShiftSubscription>): Promise<ShiftSubscription | undefined> {
    const results = await db.update(shiftSubscriptions).set(subscription).where(eq(shiftSubscriptions.id, id)).returning();
    return results[0];
  }

  async deleteShiftSubscription(id: number): Promise<boolean> {
    const results = await db.delete(shiftSubscriptions).where(eq(shiftSubscriptions.id, id)).returning();
    return results.length > 0;
  }

  // Shift Assignments
  async getShiftAssignment(id: number): Promise<ShiftAssignment | undefined> {
    const results = await db.select().from(shiftAssignments).where(eq(shiftAssignments.id, id));
    return results[0];
  }

  async getShiftAssignments(shiftId?: number, userId?: number): Promise<ShiftAssignment[]> {
    let query = db.select().from(shiftAssignments);
    
    if (shiftId && userId) {
      query = query.where(and(eq(shiftAssignments.shiftId, shiftId), eq(shiftAssignments.userId, userId)));
    } else if (shiftId) {
      query = query.where(eq(shiftAssignments.shiftId, shiftId));
    } else if (userId) {
      query = query.where(eq(shiftAssignments.userId, userId));
    }
    
    return await query;
  }

  async getShiftAssignmentsByShift(shiftId: number): Promise<ShiftAssignment[]> {
    return await db.select().from(shiftAssignments).where(eq(shiftAssignments.shiftId, shiftId));
  }

  async getShiftAssignmentsByUser(userId: number): Promise<ShiftAssignment[]> {
    return await db.select().from(shiftAssignments).where(eq(shiftAssignments.userId, userId));
  }

  async createShiftAssignment(assignment: InsertShiftAssignment): Promise<ShiftAssignment> {
    const results = await db.insert(shiftAssignments).values(assignment).returning();
    return results[0];
  }

  async updateShiftAssignment(id: number, assignment: Partial<InsertShiftAssignment>): Promise<ShiftAssignment | undefined> {
    const results = await db.update(shiftAssignments).set(assignment).where(eq(shiftAssignments.id, id)).returning();
    return results[0];
  }

  async deleteShiftAssignment(id: number): Promise<boolean> {
    const results = await db.delete(shiftAssignments).where(eq(shiftAssignments.id, id)).returning();
    return results.length > 0;
  }

  // Scheduling Windows
  async getSchedulingWindow(id: number): Promise<SchedulingWindow | undefined> {
    const results = await db.select().from(schedulingWindows).where(eq(schedulingWindows.id, id));
    return results[0];
  }

  async getSchedulingWindows(locationId?: number, role?: string): Promise<SchedulingWindow[]> {
    let query = db.select().from(schedulingWindows);
    
    if (locationId && role) {
      query = query.where(and(eq(schedulingWindows.locationId, locationId), eq(schedulingWindows.role, role)));
    } else if (locationId) {
      query = query.where(eq(schedulingWindows.locationId, locationId));
    } else if (role) {
      query = query.where(eq(schedulingWindows.role, role));
    }
    
    return await query;
  }

  async getSchedulingWindowsByLocation(locationId: number): Promise<SchedulingWindow[]> {
    return await db.select().from(schedulingWindows).where(eq(schedulingWindows.locationId, locationId));
  }

  async createSchedulingWindow(window: InsertSchedulingWindow): Promise<SchedulingWindow> {
    const results = await db.insert(schedulingWindows).values(window).returning();
    return results[0];
  }

  async updateSchedulingWindow(id: number, window: Partial<InsertSchedulingWindow>): Promise<SchedulingWindow | undefined> {
    const results = await db.update(schedulingWindows).set(window).where(eq(schedulingWindows.id, id)).returning();
    return results[0];
  }

  async deleteSchedulingWindow(id: number): Promise<boolean> {
    const results = await db.delete(schedulingWindows).where(eq(schedulingWindows.id, id)).returning();
    return results.length > 0;
  }

  // === Week Schedule Management ===

  async getWeekSchedule(id: number): Promise<WeekSchedule | undefined> {
    const results = await db.select().from(weekSchedules).where(eq(weekSchedules.id, id));
    return results[0];
  }

  async getWeekSchedules(locationId?: number): Promise<WeekSchedule[]> {
    if (locationId) {
      return await db.select({ 
        id: weekSchedules.id,
        scheduleBlockId: weekSchedules.scheduleBlockId,
        weekNumber: weekSchedules.weekNumber,
        templateId: weekSchedules.templateId,
        createdAt: weekSchedules.createdAt,
        updatedAt: weekSchedules.updatedAt
      })
      .from(weekSchedules)
      .innerJoin(scheduleBlocks, eq(weekSchedules.scheduleBlockId, scheduleBlocks.id))
      .where(eq(scheduleBlocks.locationId, locationId));
    }
    return await db.select().from(weekSchedules);
  }

  async getWeekSchedulesByScheduleBlock(scheduleBlockId: number): Promise<WeekSchedule[]> {
    return await db.select().from(weekSchedules)
      .where(eq(weekSchedules.scheduleBlockId, scheduleBlockId))
      .orderBy(weekSchedules.weekNumber);
  }

  // Schedule Blocks
  async getScheduleBlocks(locationId?: number): Promise<ScheduleBlock[]> {
    if (locationId) {
      return await db.select().from(scheduleBlocks)
        .where(eq(scheduleBlocks.locationId, locationId))
        .orderBy(scheduleBlocks.id);
    }
    return await db.select().from(scheduleBlocks).orderBy(scheduleBlocks.id);
  }

  async getScheduleBlock(id: number): Promise<ScheduleBlock | undefined> {
    const [scheduleBlock] = await db.select().from(scheduleBlocks).where(eq(scheduleBlocks.id, id));
    return scheduleBlock || undefined;
  }

  async createScheduleBlock(scheduleBlock: InsertScheduleBlock): Promise<ScheduleBlock> {
    const [created] = await db.insert(scheduleBlocks).values(scheduleBlock).returning();
    return created;
  }

  async updateScheduleBlock(id: number, updates: Partial<InsertScheduleBlock>): Promise<ScheduleBlock | undefined> {
    const [updated] = await db.update(scheduleBlocks).set(updates).where(eq(scheduleBlocks.id, id)).returning();
    return updated;
  }

  async getWeekScheduleById(id: number): Promise<WeekSchedule | undefined> {
    console.log("🔍 STORAGE DEBUG: getWeekScheduleById called with ID:", id);
    try {
      const results = await db.select().from(weekSchedules).where(eq(weekSchedules.id, id));
      console.log("🔍 STORAGE DEBUG: Raw DB results:", JSON.stringify(results, null, 2));
      console.log("🔍 STORAGE DEBUG: Results length:", results.length);
      console.log("🔍 STORAGE DEBUG: First result:", results[0]);
      return results[0];
    } catch (error) {
      console.error("🔍 STORAGE DEBUG: Database error:", error);
      throw error;
    }
  }

  async createWeekSchedule(schedule: InsertWeekSchedule): Promise<WeekSchedule> {
    const results = await db.insert(weekSchedules).values(schedule).returning();
    return results[0];
  }

  async updateWeekSchedule(id: number, schedule: Partial<InsertWeekSchedule>): Promise<WeekSchedule | undefined> {
    const results = await db.update(weekSchedules).set(schedule).where(eq(weekSchedules.id, id)).returning();
    return results[0];
  }

  async deleteWeekSchedule(id: number): Promise<boolean> {
    // First delete all shifts that belong to this week schedule
    await db.delete(shifts).where(eq(shifts.weekScheduleId, id));
    // Then delete the week schedule itself
    const results = await db.delete(weekSchedules).where(eq(weekSchedules.id, id)).returning();
    return results.length > 0;
  }

  async createShiftForWeekSchedule(shift: InsertShift): Promise<Shift> {
    const results = await db.insert(shifts).values(shift).returning();
    return results[0];
  }

  async getShiftsByWeekSchedule(weekScheduleId: number): Promise<Shift[]> {
    return await db.select().from(shifts).where(eq(shifts.weekScheduleId, weekScheduleId));
  }

  async updateShift(id: number, updates: Partial<InsertShift>): Promise<Shift | undefined> {
    const results = await db.update(shifts).set(updates).where(eq(shifts.id, id)).returning();
    return results[0];
  }

  async deleteShift(id: number): Promise<boolean> {
    // First delete shift requirements that reference this shift
    await db.delete(shiftRequirements).where(eq(shiftRequirements.shiftId, id));
    // Then delete the shift itself
    const results = await db.delete(shifts).where(eq(shifts.id, id)).returning();
    return results.length > 0;
  }

  // Session consolidation support methods
  async getAllCompetencies(): Promise<Competency[]> {
    try {
      return await db.select().from(competencies);
    } catch (error) {
      console.error('Error fetching all competencies:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();