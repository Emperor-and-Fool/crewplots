import {
  users, locations, competencies, userLocations, userCompetencies,
  scheduleTemplates, templateShifts, scheduleBlocks, weekSchedules, shifts, 
 // shiftRequirements,
 // shiftSubscriptions, shiftAssignments, schedulingWindows, 
  cashCounts,
  kbCategories, kbArticles, noteRefs, 
  // hybridCache,
  type User, type Location, type Competency, type UserLocation, type UserCompetency,
  type ScheduleTemplate, type TemplateShift, type ScheduleBlock,
  type WeekSchedule, 
  //type Shift, type ShiftRequirement, type ShiftSubscription, type ShiftAssignment,
  //type SchedulingWindow, 
  type CashCount, type KbCategory, type KbArticle, type NoteRef,
  // type HybridCache, 
  type UserModulePermissions, type SchedulerModulePermissions,
  type LocationModulePermissions,
  type InsertUser, type InsertLocation, type InsertCompetency, type InsertUserLocation,
  type InsertUserCompetency, type InsertScheduleTemplate,
  type InsertTemplateShift, type InsertScheduleBlock, type InsertWeekSchedule, 
  //type InsertShift,
  //type InsertShiftRequirement, type InsertShiftSubscription, type InsertShiftAssignment,
  //type InsertSchedulingWindow, 
  type InsertCashCount, type InsertKbCategory, 
  type InsertKbArticle, type InsertNoteRef, 
  generatePublicId
} from "@shared/schema";

import { db } from "./db";
import { eq, and, gte, lte, sql, inArray, asc } from "drizzle-orm";
import { OnDemandRedisService } from "../adapters-repl/redis-ondemand/on-demand-redis";
// import { onDemandMongoService } from "../adapters-repl/mongodb-ondemand/on-demand-mongodb";
// import { initializeWorkflowPermissions } from './utils/assign-default-permissions';

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

// near-future-removal: Clean up remaining method implementations to export as individual functions

class DatabaseStorage {
  private redisService: OnDemandRedisService;
  
  constructor() {
    this.redisService = OnDemandRedisService.getInstance();
  }
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    
    if (user) {
      // Enhance user object with database permissions
      const enhancedUser = await this.enhanceUserWithDatabasePermissions(user);
      return enhancedUser;
    }
    
    return user;
  }
  
  // Database-first permission enhancement
  private async enhanceUserWithDatabasePermissions(user: User): Promise<User> {
    try {
      // Get role-based permissions from database using Drizzle
      const { roles, permissions, rolePermissions } = await import('../shared/schema');
      const result = await db
        .select({ name: permissions.name })
        .from(permissions)
        .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
        .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
        .where(eq(roles.name, user.role));
      
      const userRolePermissions = result.map(row => row.name);
      
      // For crew_member, check competency-based financial access
      let enhancedPermissions = [...userRolePermissions];
      if (user.role === 'crew_member') {
        const competencyResult = await db
          .select({ name: competencies.name, financial_access: competencies.financialAccess })
          .from(competencies)
          .innerJoin(userCompetencies, eq(competencies.id, userCompetencies.competencyId))
          .where(and(
            eq(userCompetencies.userId, user.id),
            eq(competencies.financialAccess, true)
          ));
        
        if (competencyResult.length > 0) {
          enhancedPermissions.push(
            'financial.read',
            'financial.create', 
            'financial.update'
          );
          console.log(`🎯 Enhanced permissions for ${user.username} with financial competency`);
        }
      }
      
      // Return enhanced user object with permissions array
      return {
        ...user,
        permissions: enhancedPermissions
      };
      
    } catch (error) {
      console.error('❌ Error enhancing user with database permissions:', error);
      return user; // Return original user if permission enhancement fails
    }
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
    
    if (user) {
      // Enhance user object with database permissions
      const enhancedUser = await this.enhanceUserWithDatabasePermissions(user);
      return enhancedUser;
    }
    
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
      createdBy: sourceWeek.createdBy,
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
      
      if (user) {
        // Enhance user object with database permissions
        const enhancedUser = await this.enhanceUserWithDatabasePermissions(user);
        return enhancedUser;
      }
      
      return user;
    } catch (error) {
      console.error("Error in getUserWithProfile:", error);
      return undefined;
    }
  }

  // Lazy Loading Authentication Methods (Plan 052 Phase 1)
  async getUserWithWorkflows(userId: number): Promise<User & { workflows: string[] }> {
    try {
      // Fast workflow discovery - load user with minimal workflow list
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Extract workflow list from workflowPermissions without loading full permissions
      const workflowPermissions = user.workflowPermissions as Record<string, string[]> || {};
      const workflows = Object.keys(workflowPermissions);

      return {
        ...user,
        workflows
      };
    } catch (error) {
      console.error("Error in getUserWithWorkflows:", error);
      throw error;
    }
  }

  async getUsersUsermodPerm(userId: number): Promise<UserModulePermissions> {
    try {
      // On-demand user module permission loading
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const workflowPermissions = user.workflowPermissions as Record<string, string[]> || {};
      const userPermissions = workflowPermissions.application || [];

      return {
        user: {
          view: userPermissions.includes('view') || userPermissions.includes('view_applications'),
          edit: userPermissions.includes('edit'),
          hire: userPermissions.includes('hire'),
          delete: userPermissions.includes('delete'),
          manage_locations: userPermissions.includes('manage_locations'),
          view_applications: userPermissions.includes('view_applications')
        }
      };
    } catch (error) {
      console.error("Error in getUsersUsermodPerm:", error);
      throw error;
    }
  }

  async getUsersSchedmodPerm(userId: number): Promise<SchedulerModulePermissions> {
    try {
      // On-demand scheduler module permission loading
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const workflowPermissions = user.workflowPermissions as Record<string, string[]> || {};
      const schedulePermissions = workflowPermissions.scheduling || [];

      return {
        schedule: {
          create: schedulePermissions.includes('create') || schedulePermissions.includes('schedule.create'),
          read: schedulePermissions.includes('read') || schedulePermissions.includes('schedule.read'),
          update: schedulePermissions.includes('update') || schedulePermissions.includes('schedule.update'),
          delete: schedulePermissions.includes('delete') || schedulePermissions.includes('schedule.delete'),
          assign_users: schedulePermissions.includes('assign_users') || schedulePermissions.includes('schedule.assign_users'),
          manage_permissions: schedulePermissions.includes('manage_permissions') || schedulePermissions.includes('schedule.manage_permissions')
        }
      };
    } catch (error) {
      console.error("Error in getUsersSchedmodPerm:", error);
      throw error;
    }
  }

  async getUsersLocationPerm(userId: number): Promise<LocationModulePermissions> {
    try {
      // On-demand location module permission loading
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const workflowPermissions = user.workflowPermissions as Record<string, string[]> || {};
      const locationPermissions = workflowPermissions.location || [];

      return {
        location: {
          access_all: locationPermissions.includes('access_all') || user.role === 'administrator',
          access_owned: locationPermissions.includes('access_owned') || locationPermissions.includes('access_all'),
          access_managed: locationPermissions.includes('access_managed') || locationPermissions.includes('access_all'),
          access_assigned: locationPermissions.includes('access_assigned') || locationPermissions.includes('access_all')
        }
      };
    } catch (error) {
      console.error("Error in getUsersLocationPerm:", error);
      throw error;
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

// REMOVED SHIFT REQUIREMENTS MANAGEMENT (Lines 1360-1392)

// REMOVED SHIFT SUBSCRIPTIONS MANAGEMENT (Lines 1393-1435)

// REMOVED SHIFT ASSIGNMENTS MANAGEMENT (Lines 1436-1478)

// REMOVED SCHEDULING WINDOWS MANAGEMENT (Lines 1479-1517)

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
        createdBy: weekSchedules.createdBy,
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

// REMOVED COMPLEX MULTI-WEEK CREATION BUSINESS LOGIC (Lines 1569-1611)
  
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

// REMOVED Shift management with cascade delete logic  

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