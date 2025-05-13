import {
  users, locations, competencies, staff, staffCompetencies, applicants,
  scheduleTemplates, templateShifts, weeklySchedules, shifts, cashCounts,
  kbCategories, kbArticles,
  type User, type Location, type Competency, type Staff, type StaffCompetency,
  type Applicant, type ScheduleTemplate, type TemplateShift, type WeeklySchedule,
  type Shift, type CashCount, type KbCategory, type KbArticle,
  type InsertUser, type InsertLocation, type InsertCompetency, type InsertStaff,
  type InsertStaffCompetency, type InsertApplicant, type InsertScheduleTemplate,
  type InsertTemplateShift, type InsertWeeklySchedule, type InsertShift,
  type InsertCashCount, type InsertKbCategory, type InsertKbArticle
} from "@shared/schema";

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
  getStaffMember(id: number): Promise<Staff | undefined>;
  getStaffMembers(): Promise<Staff[]>;
  getStaffMembersByLocation(locationId: number): Promise<Staff[]>;
  createStaffMember(staff: InsertStaff): Promise<Staff>;
  updateStaffMember(id: number, staff: Partial<InsertStaff>): Promise<Staff | undefined>;
  deleteStaffMember(id: number): Promise<boolean>;

  // Staff Competencies
  getStaffCompetency(id: number): Promise<StaffCompetency | undefined>;
  getStaffCompetencies(): Promise<StaffCompetency[]>;
  getStaffCompetenciesByStaff(staffId: number): Promise<StaffCompetency[]>;
  createStaffCompetency(staffCompetency: InsertStaffCompetency): Promise<StaffCompetency>;
  updateStaffCompetency(id: number, staffCompetency: Partial<InsertStaffCompetency>): Promise<StaffCompetency | undefined>;
  deleteStaffCompetency(id: number): Promise<boolean>;

  // Applicants
  getApplicant(id: number): Promise<Applicant | undefined>;
  getApplicants(): Promise<Applicant[]>;
  getApplicantsByLocation(locationId: number): Promise<Applicant[]>;
  getApplicantsByStatus(status: string): Promise<Applicant[]>;
  createApplicant(applicant: InsertApplicant): Promise<Applicant>;
  updateApplicant(id: number, applicant: Partial<InsertApplicant>): Promise<Applicant | undefined>;
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
  getTemplateShiftsByTemplate(templateId: number): Promise<TemplateShift[]>;
  createTemplateShift(shift: InsertTemplateShift): Promise<TemplateShift>;
  updateTemplateShift(id: number, shift: Partial<InsertTemplateShift>): Promise<TemplateShift | undefined>;
  deleteTemplateShift(id: number): Promise<boolean>;

  // Weekly Schedules
  getWeeklySchedule(id: number): Promise<WeeklySchedule | undefined>;
  getWeeklySchedules(): Promise<WeeklySchedule[]>;
  getWeeklySchedulesByLocation(locationId: number): Promise<WeeklySchedule[]>;
  getWeeklyScheduleByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<WeeklySchedule | undefined>;
  createWeeklySchedule(schedule: InsertWeeklySchedule): Promise<WeeklySchedule>;
  updateWeeklySchedule(id: number, schedule: Partial<InsertWeeklySchedule>): Promise<WeeklySchedule | undefined>;
  deleteWeeklySchedule(id: number): Promise<boolean>;

  // Shifts
  getShift(id: number): Promise<Shift | undefined>;
  getShifts(): Promise<Shift[]>;
  getShiftsBySchedule(scheduleId: number): Promise<Shift[]>;
  getShiftsByStaff(staffId: number): Promise<Shift[]>;
  getShiftsByDateRange(startDate: Date, endDate: Date): Promise<Shift[]>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift | undefined>;
  deleteShift(id: number): Promise<boolean>;

  // Cash Counts
  getCashCount(id: number): Promise<CashCount | undefined>;
  getCashCounts(): Promise<CashCount[]>;
  getCashCountsByLocation(locationId: number): Promise<CashCount[]>;
  getCashCountsByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<CashCount[]>;
  createCashCount(cashCount: InsertCashCount): Promise<CashCount>;
  updateCashCount(id: number, cashCount: Partial<InsertCashCount>): Promise<CashCount | undefined>;
  deleteCashCount(id: number): Promise<boolean>;

  // Knowledge Base Categories
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

    // Add default admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      email: "admin@shiftpro.com",
      name: "Admin User",
      role: "manager",
      locationId: null
    });

    // Add demo location
    this.createLocation({
      name: "Downtown Bar",
      address: "123 Main St, Downtown",
      contactPerson: "John Doe",
      contactEmail: "john@example.com",
      contactPhone: "555-123-4567"
    });

    // Add competencies for demo location
    this.createCompetency({
      name: "Bar Service",
      description: "Skills related to mixing drinks and bar operations",
      locationId: 1
    });

    this.createCompetency({
      name: "Floor Service",
      description: "Skills related to table service and customer interaction",
      locationId: 1
    });

    this.createCompetency({
      name: "Cash Handling",
      description: "Skills related to managing transactions and cash",
      locationId: 1
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const newUser: User = { ...user, id, createdAt };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
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
    const id = this.currentLocationId++;
    const createdAt = new Date();
    const newLocation: Location = { ...location, id, createdAt };
    this.locations.set(id, newLocation);
    return newLocation;
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const existingLocation = this.locations.get(id);
    if (!existingLocation) return undefined;
    
    const updatedLocation = { ...existingLocation, ...location };
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
    return Array.from(this.competencies.values()).filter(
      comp => comp.locationId === locationId
    );
  }

  async createCompetency(competency: InsertCompetency): Promise<Competency> {
    const id = this.currentCompetencyId++;
    const createdAt = new Date();
    const newCompetency: Competency = { ...competency, id, createdAt };
    this.competencies.set(id, newCompetency);
    return newCompetency;
  }

  async updateCompetency(id: number, competency: Partial<InsertCompetency>): Promise<Competency | undefined> {
    const existingCompetency = this.competencies.get(id);
    if (!existingCompetency) return undefined;
    
    const updatedCompetency = { ...existingCompetency, ...competency };
    this.competencies.set(id, updatedCompetency);
    return updatedCompetency;
  }

  async deleteCompetency(id: number): Promise<boolean> {
    return this.competencies.delete(id);
  }

  // Staff
  async getStaffMember(id: number): Promise<Staff | undefined> {
    return this.staff.get(id);
  }

  async getStaffMembers(): Promise<Staff[]> {
    return Array.from(this.staff.values());
  }

  async getStaffMembersByLocation(locationId: number): Promise<Staff[]> {
    return Array.from(this.staff.values()).filter(
      staff => staff.locationId === locationId
    );
  }

  async createStaffMember(staff: InsertStaff): Promise<Staff> {
    const id = this.currentStaffId++;
    const createdAt = new Date();
    const newStaff: Staff = { ...staff, id, createdAt };
    this.staff.set(id, newStaff);
    return newStaff;
  }

  async updateStaffMember(id: number, staff: Partial<InsertStaff>): Promise<Staff | undefined> {
    const existingStaff = this.staff.get(id);
    if (!existingStaff) return undefined;
    
    const updatedStaff = { ...existingStaff, ...staff };
    this.staff.set(id, updatedStaff);
    return updatedStaff;
  }

  async deleteStaffMember(id: number): Promise<boolean> {
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
    return Array.from(this.staffCompetencies.values()).filter(
      comp => comp.staffId === staffId
    );
  }

  async createStaffCompetency(staffCompetency: InsertStaffCompetency): Promise<StaffCompetency> {
    const id = this.currentStaffCompetencyId++;
    const createdAt = new Date();
    const newStaffCompetency: StaffCompetency = { ...staffCompetency, id, createdAt };
    this.staffCompetencies.set(id, newStaffCompetency);
    return newStaffCompetency;
  }

  async updateStaffCompetency(id: number, staffCompetency: Partial<InsertStaffCompetency>): Promise<StaffCompetency | undefined> {
    const existingStaffCompetency = this.staffCompetencies.get(id);
    if (!existingStaffCompetency) return undefined;
    
    const updatedStaffCompetency = { ...existingStaffCompetency, ...staffCompetency };
    this.staffCompetencies.set(id, updatedStaffCompetency);
    return updatedStaffCompetency;
  }

  async deleteStaffCompetency(id: number): Promise<boolean> {
    return this.staffCompetencies.delete(id);
  }

  // Applicants
  async getApplicant(id: number): Promise<Applicant | undefined> {
    return this.applicants.get(id);
  }

  async getApplicants(): Promise<Applicant[]> {
    return Array.from(this.applicants.values());
  }

  async getApplicantsByLocation(locationId: number): Promise<Applicant[]> {
    return Array.from(this.applicants.values()).filter(
      applicant => applicant.locationId === locationId
    );
  }

  async getApplicantsByStatus(status: string): Promise<Applicant[]> {
    return Array.from(this.applicants.values()).filter(
      applicant => applicant.status === status
    );
  }

  async createApplicant(applicant: InsertApplicant): Promise<Applicant> {
    const id = this.currentApplicantId++;
    const createdAt = new Date();
    const newApplicant: Applicant = { ...applicant, id, createdAt };
    this.applicants.set(id, newApplicant);
    return newApplicant;
  }

  async updateApplicant(id: number, applicant: Partial<InsertApplicant>): Promise<Applicant | undefined> {
    const existingApplicant = this.applicants.get(id);
    if (!existingApplicant) return undefined;
    
    const updatedApplicant = { ...existingApplicant, ...applicant };
    this.applicants.set(id, updatedApplicant);
    return updatedApplicant;
  }

  async deleteApplicant(id: number): Promise<boolean> {
    return this.applicants.delete(id);
  }

  // Schedule Templates
  async getScheduleTemplate(id: number): Promise<ScheduleTemplate | undefined> {
    return this.scheduleTemplates.get(id);
  }

  async getScheduleTemplates(): Promise<ScheduleTemplate[]> {
    return Array.from(this.scheduleTemplates.values());
  }

  async getScheduleTemplatesByLocation(locationId: number): Promise<ScheduleTemplate[]> {
    return Array.from(this.scheduleTemplates.values()).filter(
      template => template.locationId === locationId
    );
  }

  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> {
    const id = this.currentScheduleTemplateId++;
    const createdAt = new Date();
    const newTemplate: ScheduleTemplate = { ...template, id, createdAt };
    this.scheduleTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateScheduleTemplate(id: number, template: Partial<InsertScheduleTemplate>): Promise<ScheduleTemplate | undefined> {
    const existingTemplate = this.scheduleTemplates.get(id);
    if (!existingTemplate) return undefined;
    
    const updatedTemplate = { ...existingTemplate, ...template };
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

  async getTemplateShiftsByTemplate(templateId: number): Promise<TemplateShift[]> {
    return Array.from(this.templateShifts.values()).filter(
      shift => shift.templateId === templateId
    );
  }

  async createTemplateShift(shift: InsertTemplateShift): Promise<TemplateShift> {
    const id = this.currentTemplateShiftId++;
    const newShift: TemplateShift = { ...shift, id };
    this.templateShifts.set(id, newShift);
    return newShift;
  }

  async updateTemplateShift(id: number, shift: Partial<InsertTemplateShift>): Promise<TemplateShift | undefined> {
    const existingShift = this.templateShifts.get(id);
    if (!existingShift) return undefined;
    
    const updatedShift = { ...existingShift, ...shift };
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
    return Array.from(this.weeklySchedules.values()).filter(
      schedule => schedule.locationId === locationId
    );
  }

  async getWeeklyScheduleByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<WeeklySchedule | undefined> {
    return Array.from(this.weeklySchedules.values()).find(
      schedule => 
        schedule.locationId === locationId && 
        schedule.weekStartDate >= startDate && 
        schedule.weekStartDate <= endDate
    );
  }

  async createWeeklySchedule(schedule: InsertWeeklySchedule): Promise<WeeklySchedule> {
    const id = this.currentWeeklyScheduleId++;
    const createdAt = new Date();
    const newSchedule: WeeklySchedule = { ...schedule, id, createdAt };
    this.weeklySchedules.set(id, newSchedule);
    return newSchedule;
  }

  async updateWeeklySchedule(id: number, schedule: Partial<InsertWeeklySchedule>): Promise<WeeklySchedule | undefined> {
    const existingSchedule = this.weeklySchedules.get(id);
    if (!existingSchedule) return undefined;
    
    const updatedSchedule = { ...existingSchedule, ...schedule };
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
    return Array.from(this.shifts.values()).filter(
      shift => shift.scheduleId === scheduleId
    );
  }

  async getShiftsByStaff(staffId: number): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(
      shift => shift.staffId === staffId
    );
  }

  async getShiftsByDateRange(startDate: Date, endDate: Date): Promise<Shift[]> {
    return Array.from(this.shifts.values()).filter(
      shift => shift.date >= startDate && shift.date <= endDate
    );
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const id = this.currentShiftId++;
    const createdAt = new Date();
    const newShift: Shift = { ...shift, id, createdAt };
    this.shifts.set(id, newShift);
    return newShift;
  }

  async updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift | undefined> {
    const existingShift = this.shifts.get(id);
    if (!existingShift) return undefined;
    
    const updatedShift = { ...existingShift, ...shift };
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
    return Array.from(this.cashCounts.values()).filter(
      count => count.locationId === locationId
    );
  }

  async getCashCountsByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<CashCount[]> {
    return Array.from(this.cashCounts.values()).filter(
      count => 
        count.locationId === locationId && 
        count.countDate >= startDate && 
        count.countDate <= endDate
    );
  }

  async createCashCount(cashCount: InsertCashCount): Promise<CashCount> {
    const id = this.currentCashCountId++;
    const createdAt = new Date();
    const newCashCount: CashCount = { ...cashCount, id, createdAt };
    this.cashCounts.set(id, newCashCount);
    return newCashCount;
  }

  async updateCashCount(id: number, cashCount: Partial<InsertCashCount>): Promise<CashCount | undefined> {
    const existingCashCount = this.cashCounts.get(id);
    if (!existingCashCount) return undefined;
    
    const updatedCashCount = { ...existingCashCount, ...cashCount };
    this.cashCounts.set(id, updatedCashCount);
    return updatedCashCount;
  }

  async deleteCashCount(id: number): Promise<boolean> {
    return this.cashCounts.delete(id);
  }

  // Knowledge Base Categories
  async getKbCategory(id: number): Promise<KbCategory | undefined> {
    return this.kbCategories.get(id);
  }

  async getKbCategories(): Promise<KbCategory[]> {
    return Array.from(this.kbCategories.values());
  }

  async getKbCategoriesByLocation(locationId: number): Promise<KbCategory[]> {
    return Array.from(this.kbCategories.values()).filter(
      category => category.locationId === locationId
    );
  }

  async createKbCategory(category: InsertKbCategory): Promise<KbCategory> {
    const id = this.currentKbCategoryId++;
    const createdAt = new Date();
    const newCategory: KbCategory = { ...category, id, createdAt };
    this.kbCategories.set(id, newCategory);
    return newCategory;
  }

  async updateKbCategory(id: number, category: Partial<InsertKbCategory>): Promise<KbCategory | undefined> {
    const existingCategory = this.kbCategories.get(id);
    if (!existingCategory) return undefined;
    
    const updatedCategory = { ...existingCategory, ...category };
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
    return Array.from(this.kbArticles.values()).filter(
      article => article.categoryId === categoryId
    );
  }

  async createKbArticle(article: InsertKbArticle): Promise<KbArticle> {
    const id = this.currentKbArticleId++;
    const createdAt = new Date();
    const newArticle: KbArticle = { ...article, id, createdAt, updatedAt: null };
    this.kbArticles.set(id, newArticle);
    return newArticle;
  }

  async updateKbArticle(id: number, article: Partial<InsertKbArticle>): Promise<KbArticle | undefined> {
    const existingArticle = this.kbArticles.get(id);
    if (!existingArticle) return undefined;
    
    const updatedArticle = { 
      ...existingArticle, 
      ...article, 
      updatedAt: new Date() 
    };
    this.kbArticles.set(id, updatedArticle);
    return updatedArticle;
  }

  async deleteKbArticle(id: number): Promise<boolean> {
    return this.kbArticles.delete(id);
  }
}

import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";

// DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true; // Postgres doesn't return count of deleted rows in a standard way
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
    return location || undefined;
  }

  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db.insert(locations).values(location).returning();
    return newLocation;
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const [updatedLocation] = await db.update(locations)
      .set(location)
      .where(eq(locations.id, id))
      .returning();
    return updatedLocation || undefined;
  }

  async deleteLocation(id: number): Promise<boolean> {
    await db.delete(locations).where(eq(locations.id, id));
    return true;
  }

  // Competencies
  async getCompetency(id: number): Promise<Competency | undefined> {
    const [competency] = await db.select().from(competencies).where(eq(competencies.id, id));
    return competency || undefined;
  }

  async getCompetencies(): Promise<Competency[]> {
    return await db.select().from(competencies);
  }

  async getCompetenciesByLocation(locationId: number): Promise<Competency[]> {
    return await db.select().from(competencies).where(eq(competencies.locationId, locationId));
  }

  async createCompetency(competency: InsertCompetency): Promise<Competency> {
    const [newCompetency] = await db.insert(competencies).values(competency).returning();
    return newCompetency;
  }

  async updateCompetency(id: number, competency: Partial<InsertCompetency>): Promise<Competency | undefined> {
    const [updatedCompetency] = await db.update(competencies)
      .set(competency)
      .where(eq(competencies.id, id))
      .returning();
    return updatedCompetency || undefined;
  }

  async deleteCompetency(id: number): Promise<boolean> {
    await db.delete(competencies).where(eq(competencies.id, id));
    return true;
  }

  // Staff
  async getStaffMember(id: number): Promise<Staff | undefined> {
    const [staff] = await db.select().from(staffMembers).where(eq(staffMembers.id, id));
    return staff || undefined;
  }

  async getStaffMembers(): Promise<Staff[]> {
    return await db.select().from(staffMembers);
  }

  async getStaffMembersByLocation(locationId: number): Promise<Staff[]> {
    return await db.select().from(staffMembers).where(eq(staffMembers.locationId, locationId));
  }

  async createStaffMember(staff: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staffMembers).values(staff).returning();
    return newStaff;
  }

  async updateStaffMember(id: number, staff: Partial<InsertStaff>): Promise<Staff | undefined> {
    const [updatedStaff] = await db.update(staffMembers)
      .set(staff)
      .where(eq(staffMembers.id, id))
      .returning();
    return updatedStaff || undefined;
  }

  async deleteStaffMember(id: number): Promise<boolean> {
    await db.delete(staffMembers).where(eq(staffMembers.id, id));
    return true;
  }

  // Staff Competencies
  async getStaffCompetency(id: number): Promise<StaffCompetency | undefined> {
    const [staffCompetency] = await db.select().from(staffCompetencies).where(eq(staffCompetencies.id, id));
    return staffCompetency || undefined;
  }

  async getStaffCompetencies(): Promise<StaffCompetency[]> {
    return await db.select().from(staffCompetencies);
  }

  async getStaffCompetenciesByStaff(staffId: number): Promise<StaffCompetency[]> {
    return await db.select().from(staffCompetencies).where(eq(staffCompetencies.staffId, staffId));
  }

  async createStaffCompetency(staffCompetency: InsertStaffCompetency): Promise<StaffCompetency> {
    const [newStaffCompetency] = await db.insert(staffCompetencies).values(staffCompetency).returning();
    return newStaffCompetency;
  }

  async updateStaffCompetency(id: number, staffCompetency: Partial<InsertStaffCompetency>): Promise<StaffCompetency | undefined> {
    const [updatedStaffCompetency] = await db.update(staffCompetencies)
      .set(staffCompetency)
      .where(eq(staffCompetencies.id, id))
      .returning();
    return updatedStaffCompetency || undefined;
  }

  async deleteStaffCompetency(id: number): Promise<boolean> {
    await db.delete(staffCompetencies).where(eq(staffCompetencies.id, id));
    return true;
  }

  // Applicants
  async getApplicant(id: number): Promise<Applicant | undefined> {
    const [applicant] = await db.select().from(applicants).where(eq(applicants.id, id));
    return applicant || undefined;
  }

  async getApplicants(): Promise<Applicant[]> {
    return await db.select().from(applicants);
  }

  async getApplicantsByLocation(locationId: number): Promise<Applicant[]> {
    return await db.select().from(applicants).where(eq(applicants.locationId, locationId));
  }

  async getApplicantsByStatus(status: string): Promise<Applicant[]> {
    return await db.select().from(applicants).where(eq(applicants.status, status));
  }

  async createApplicant(applicant: InsertApplicant): Promise<Applicant> {
    const [newApplicant] = await db.insert(applicants).values(applicant).returning();
    return newApplicant;
  }

  async updateApplicant(id: number, applicant: Partial<InsertApplicant>): Promise<Applicant | undefined> {
    const [updatedApplicant] = await db.update(applicants)
      .set(applicant)
      .where(eq(applicants.id, id))
      .returning();
    return updatedApplicant || undefined;
  }

  async deleteApplicant(id: number): Promise<boolean> {
    await db.delete(applicants).where(eq(applicants.id, id));
    return true;
  }

  // Schedule Templates
  async getScheduleTemplate(id: number): Promise<ScheduleTemplate | undefined> {
    const [template] = await db.select().from(scheduleTemplates).where(eq(scheduleTemplates.id, id));
    return template || undefined;
  }

  async getScheduleTemplates(): Promise<ScheduleTemplate[]> {
    return await db.select().from(scheduleTemplates);
  }

  async getScheduleTemplatesByLocation(locationId: number): Promise<ScheduleTemplate[]> {
    return await db.select().from(scheduleTemplates).where(eq(scheduleTemplates.locationId, locationId));
  }

  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> {
    const [newTemplate] = await db.insert(scheduleTemplates).values(template).returning();
    return newTemplate;
  }

  async updateScheduleTemplate(id: number, template: Partial<InsertScheduleTemplate>): Promise<ScheduleTemplate | undefined> {
    const [updatedTemplate] = await db.update(scheduleTemplates)
      .set(template)
      .where(eq(scheduleTemplates.id, id))
      .returning();
    return updatedTemplate || undefined;
  }

  async deleteScheduleTemplate(id: number): Promise<boolean> {
    await db.delete(scheduleTemplates).where(eq(scheduleTemplates.id, id));
    return true;
  }

  // Template Shifts
  async getTemplateShift(id: number): Promise<TemplateShift | undefined> {
    const [shift] = await db.select().from(templateShifts).where(eq(templateShifts.id, id));
    return shift || undefined;
  }

  async getTemplateShiftsByTemplate(templateId: number): Promise<TemplateShift[]> {
    return await db.select().from(templateShifts).where(eq(templateShifts.templateId, templateId));
  }

  async createTemplateShift(shift: InsertTemplateShift): Promise<TemplateShift> {
    const [newShift] = await db.insert(templateShifts).values(shift).returning();
    return newShift;
  }

  async updateTemplateShift(id: number, shift: Partial<InsertTemplateShift>): Promise<TemplateShift | undefined> {
    const [updatedShift] = await db.update(templateShifts)
      .set(shift)
      .where(eq(templateShifts.id, id))
      .returning();
    return updatedShift || undefined;
  }

  async deleteTemplateShift(id: number): Promise<boolean> {
    await db.delete(templateShifts).where(eq(templateShifts.id, id));
    return true;
  }

  // Weekly Schedules
  async getWeeklySchedule(id: number): Promise<WeeklySchedule | undefined> {
    const [schedule] = await db.select().from(weeklySchedules).where(eq(weeklySchedules.id, id));
    return schedule || undefined;
  }

  async getWeeklySchedules(): Promise<WeeklySchedule[]> {
    return await db.select().from(weeklySchedules);
  }

  async getWeeklySchedulesByLocation(locationId: number): Promise<WeeklySchedule[]> {
    return await db.select().from(weeklySchedules).where(eq(weeklySchedules.locationId, locationId));
  }

  async getWeeklyScheduleByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<WeeklySchedule | undefined> {
    const [schedule] = await db.select().from(weeklySchedules)
      .where(
        and(
          eq(weeklySchedules.locationId, locationId),
          gte(weeklySchedules.startDate, startDate),
          lte(weeklySchedules.endDate, endDate)
        )
      );
    return schedule || undefined;
  }

  async createWeeklySchedule(schedule: InsertWeeklySchedule): Promise<WeeklySchedule> {
    const [newSchedule] = await db.insert(weeklySchedules).values(schedule).returning();
    return newSchedule;
  }

  async updateWeeklySchedule(id: number, schedule: Partial<InsertWeeklySchedule>): Promise<WeeklySchedule | undefined> {
    const [updatedSchedule] = await db.update(weeklySchedules)
      .set(schedule)
      .where(eq(weeklySchedules.id, id))
      .returning();
    return updatedSchedule || undefined;
  }

  async deleteWeeklySchedule(id: number): Promise<boolean> {
    await db.delete(weeklySchedules).where(eq(weeklySchedules.id, id));
    return true;
  }

  // Shifts
  async getShift(id: number): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift || undefined;
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

  async getShiftsByDateRange(startDate: Date, endDate: Date): Promise<Shift[]> {
    return await db.select().from(shifts)
      .where(
        and(
          gte(shifts.date, startDate),
          lte(shifts.date, endDate)
        )
      );
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [newShift] = await db.insert(shifts).values(shift).returning();
    return newShift;
  }

  async updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift | undefined> {
    const [updatedShift] = await db.update(shifts)
      .set(shift)
      .where(eq(shifts.id, id))
      .returning();
    return updatedShift || undefined;
  }

  async deleteShift(id: number): Promise<boolean> {
    await db.delete(shifts).where(eq(shifts.id, id));
    return true;
  }

  // Cash Counts
  async getCashCount(id: number): Promise<CashCount | undefined> {
    const [cashCount] = await db.select().from(cashCounts).where(eq(cashCounts.id, id));
    return cashCount || undefined;
  }

  async getCashCounts(): Promise<CashCount[]> {
    return await db.select().from(cashCounts);
  }

  async getCashCountsByLocation(locationId: number): Promise<CashCount[]> {
    return await db.select().from(cashCounts).where(eq(cashCounts.locationId, locationId));
  }

  async getCashCountsByDateRange(locationId: number, startDate: Date, endDate: Date): Promise<CashCount[]> {
    return await db.select().from(cashCounts)
      .where(
        and(
          eq(cashCounts.locationId, locationId),
          gte(cashCounts.countDate, startDate),
          lte(cashCounts.countDate, endDate)
        )
      );
  }

  async createCashCount(cashCount: InsertCashCount): Promise<CashCount> {
    const [newCashCount] = await db.insert(cashCounts).values(cashCount).returning();
    return newCashCount;
  }

  async updateCashCount(id: number, cashCount: Partial<InsertCashCount>): Promise<CashCount | undefined> {
    const [updatedCashCount] = await db.update(cashCounts)
      .set(cashCount)
      .where(eq(cashCounts.id, id))
      .returning();
    return updatedCashCount || undefined;
  }

  async deleteCashCount(id: number): Promise<boolean> {
    await db.delete(cashCounts).where(eq(cashCounts.id, id));
    return true;
  }

  // Knowledge Base Categories
  async getKbCategory(id: number): Promise<KbCategory | undefined> {
    const [category] = await db.select().from(kbCategories).where(eq(kbCategories.id, id));
    return category || undefined;
  }

  async getKbCategories(): Promise<KbCategory[]> {
    return await db.select().from(kbCategories);
  }

  async getKbCategoriesByLocation(locationId: number): Promise<KbCategory[]> {
    return await db.select().from(kbCategories).where(eq(kbCategories.locationId, locationId));
  }

  async createKbCategory(category: InsertKbCategory): Promise<KbCategory> {
    const [newCategory] = await db.insert(kbCategories).values(category).returning();
    return newCategory;
  }

  async updateKbCategory(id: number, category: Partial<InsertKbCategory>): Promise<KbCategory | undefined> {
    const [updatedCategory] = await db.update(kbCategories)
      .set(category)
      .where(eq(kbCategories.id, id))
      .returning();
    return updatedCategory || undefined;
  }

  async deleteKbCategory(id: number): Promise<boolean> {
    await db.delete(kbCategories).where(eq(kbCategories.id, id));
    return true;
  }

  // Knowledge Base Articles
  async getKbArticle(id: number): Promise<KbArticle | undefined> {
    const [article] = await db.select().from(kbArticles).where(eq(kbArticles.id, id));
    return article || undefined;
  }

  async getKbArticles(): Promise<KbArticle[]> {
    return await db.select().from(kbArticles);
  }

  async getKbArticlesByCategory(categoryId: number): Promise<KbArticle[]> {
    return await db.select().from(kbArticles).where(eq(kbArticles.categoryId, categoryId));
  }

  async createKbArticle(article: InsertKbArticle): Promise<KbArticle> {
    const [newArticle] = await db.insert(kbArticles).values(article).returning();
    return newArticle;
  }

  async updateKbArticle(id: number, article: Partial<InsertKbArticle>): Promise<KbArticle | undefined> {
    const [updatedArticle] = await db.update(kbArticles)
      .set(article)
      .where(eq(kbArticles.id, id))
      .returning();
    return updatedArticle || undefined;
  }

  async deleteKbArticle(id: number): Promise<boolean> {
    await db.delete(kbArticles).where(eq(kbArticles.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
