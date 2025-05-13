import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import { 
  insertUserSchema, insertLocationSchema, insertCompetencySchema, 
  insertStaffSchema, insertStaffCompetencySchema, insertApplicantSchema,
  insertScheduleTemplateSchema, insertTemplateShiftSchema, insertWeeklyScheduleSchema,
  insertShiftSchema, insertCashCountSchema, insertKbCategorySchema, insertKbArticleSchema,
  loginSchema, registerSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import { setupWebSocketServer } from "./ws-handler";

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Setup memory store for sessions
const MemoryStoreSession = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(
    session({
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: "shiftpro-secret-key",
    })
  );

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Serialize and deserialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Middleware to handle Zod validation errors
  const validateRequest = (schema: any) => async (req: Request, res: Response, next: Function) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      next(error);
    }
  };

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Middleware to check user role
  const hasRole = (roles: string[]) => (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = req.user as any;
    if (roles.includes(user.role)) {
      return next();
    }
    
    res.status(403).json({ message: "Forbidden - Insufficient permissions" });
  };

  // Authentication Routes
  app.post(
    "/api/auth/login",
    validateRequest(loginSchema),
    passport.authenticate("local"),
    (req, res) => {
      res.json({ user: req.user });
    }
  );

  app.post("/api/auth/logout", (req, res) => {
    req.logout(function(err) {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ user: req.user });
  });

  // Register new user (public applicants registration)
  app.post("/api/auth/register", validateRequest(registerSchema), async (req, res) => {
    const { username, password, email, name, positionApplied, phone } = req.body;
    
    try {
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Create user with staff role
      const user = await storage.createUser({
        username,
        password,
        email,
        name,
        role: "staff",
        locationId: null
      });
      
      // Create applicant record
      const applicant = await storage.createApplicant({
        name,
        email,
        phone,
        positionApplied,
        status: "new",
        resumeUrl: null,
        notes: `Applied through website registration. User ID: ${user.id}`,
        locationId: null
      });
      
      res.status(201).json({ 
        message: "Registration successful",
        userId: user.id,
        applicantId: applicant.id
      });
    } catch (error) {
      res.status(500).json({ message: "Error creating user" });
    }
  });

  // QR Code Application Route
  app.post("/api/apply", validateRequest(registerSchema), async (req, res) => {
    const { username, password, email, name, positionApplied, phone } = req.body;
    
    try {
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Create user with staff role
      const user = await storage.createUser({
        username,
        password,
        email,
        name,
        role: "staff",
        locationId: null
      });
      
      // Create applicant record
      const applicant = await storage.createApplicant({
        name,
        email,
        phone,
        positionApplied,
        status: "new",
        resumeUrl: null,
        notes: `Applied through QR code. User ID: ${user.id}`,
        locationId: null
      });
      
      res.status(201).json({ 
        message: "Application submitted successfully",
        userId: user.id,
        applicantId: applicant.id
      });
    } catch (error) {
      res.status(500).json({ message: "Error submitting application" });
    }
  });

  // User Routes
  app.get("/api/users", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  app.get("/api/users/role/:role", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const users = await storage.getUsersByRole(req.params.role);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users by role" });
    }
  });

  app.get("/api/users/location/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const users = await storage.getUsersByLocation(locationId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users by location" });
    }
  });

  app.post("/api/users", isAuthenticated, hasRole(["manager"]), validateRequest(insertUserSchema), async (req, res) => {
    try {
      const newUser = await storage.createUser(req.body);
      res.status(201).json(newUser);
    } catch (error) {
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, hasRole(["manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedUser = await storage.updateUser(id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error updating user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, hasRole(["manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting user" });
    }
  });

  // Locations Routes
  app.get("/api/locations", isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Error fetching locations" });
    }
  });

  app.get("/api/locations/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const location = await storage.getLocation(id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Error fetching location" });
    }
  });

  app.post("/api/locations", isAuthenticated, hasRole(["manager"]), validateRequest(insertLocationSchema), async (req, res) => {
    try {
      const newLocation = await storage.createLocation(req.body);
      res.status(201).json(newLocation);
    } catch (error) {
      res.status(500).json({ message: "Error creating location" });
    }
  });

  app.put("/api/locations/:id", isAuthenticated, hasRole(["manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedLocation = await storage.updateLocation(id, req.body);
      if (!updatedLocation) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(updatedLocation);
    } catch (error) {
      res.status(500).json({ message: "Error updating location" });
    }
  });

  app.delete("/api/locations/:id", isAuthenticated, hasRole(["manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLocation(id);
      if (!deleted) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json({ message: "Location deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting location" });
    }
  });

  // Competencies Routes
  app.get("/api/competencies", isAuthenticated, async (req, res) => {
    try {
      const competencies = await storage.getCompetencies();
      res.json(competencies);
    } catch (error) {
      res.status(500).json({ message: "Error fetching competencies" });
    }
  });

  app.get("/api/competencies/location/:id", isAuthenticated, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const competencies = await storage.getCompetenciesByLocation(locationId);
      res.json(competencies);
    } catch (error) {
      res.status(500).json({ message: "Error fetching competencies by location" });
    }
  });

  app.post("/api/competencies", isAuthenticated, hasRole(["manager", "floor_manager"]), validateRequest(insertCompetencySchema), async (req, res) => {
    try {
      const newCompetency = await storage.createCompetency(req.body);
      res.status(201).json(newCompetency);
    } catch (error) {
      res.status(500).json({ message: "Error creating competency" });
    }
  });

  app.put("/api/competencies/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedCompetency = await storage.updateCompetency(id, req.body);
      if (!updatedCompetency) {
        return res.status(404).json({ message: "Competency not found" });
      }
      res.json(updatedCompetency);
    } catch (error) {
      res.status(500).json({ message: "Error updating competency" });
    }
  });

  app.delete("/api/competencies/:id", isAuthenticated, hasRole(["manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCompetency(id);
      if (!deleted) {
        return res.status(404).json({ message: "Competency not found" });
      }
      res.json({ message: "Competency deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting competency" });
    }
  });

  // Staff Routes
  app.get("/api/staff", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const staff = await storage.getStaffMembers();
      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: "Error fetching staff" });
    }
  });

  app.get("/api/staff/location/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const staff = await storage.getStaffMembersByLocation(locationId);
      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: "Error fetching staff by location" });
    }
  });

  app.post("/api/staff", isAuthenticated, hasRole(["manager", "floor_manager"]), validateRequest(insertStaffSchema), async (req, res) => {
    try {
      const newStaff = await storage.createStaffMember(req.body);
      res.status(201).json(newStaff);
    } catch (error) {
      res.status(500).json({ message: "Error creating staff member" });
    }
  });

  app.put("/api/staff/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedStaff = await storage.updateStaffMember(id, req.body);
      if (!updatedStaff) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      res.json(updatedStaff);
    } catch (error) {
      res.status(500).json({ message: "Error updating staff member" });
    }
  });

  app.delete("/api/staff/:id", isAuthenticated, hasRole(["manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteStaffMember(id);
      if (!deleted) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      res.json({ message: "Staff member deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting staff member" });
    }
  });

  // Staff Competencies Routes
  app.get("/api/staff-competencies/staff/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const competencies = await storage.getStaffCompetenciesByStaff(staffId);
      res.json(competencies);
    } catch (error) {
      res.status(500).json({ message: "Error fetching staff competencies" });
    }
  });

  app.post("/api/staff-competencies", isAuthenticated, hasRole(["manager", "floor_manager"]), validateRequest(insertStaffCompetencySchema), async (req, res) => {
    try {
      const newStaffCompetency = await storage.createStaffCompetency(req.body);
      res.status(201).json(newStaffCompetency);
    } catch (error) {
      res.status(500).json({ message: "Error creating staff competency" });
    }
  });

  app.put("/api/staff-competencies/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedStaffCompetency = await storage.updateStaffCompetency(id, req.body);
      if (!updatedStaffCompetency) {
        return res.status(404).json({ message: "Staff competency not found" });
      }
      res.json(updatedStaffCompetency);
    } catch (error) {
      res.status(500).json({ message: "Error updating staff competency" });
    }
  });

  app.delete("/api/staff-competencies/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteStaffCompetency(id);
      if (!deleted) {
        return res.status(404).json({ message: "Staff competency not found" });
      }
      res.json({ message: "Staff competency deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting staff competency" });
    }
  });

  // Applicants Routes
  app.get("/api/applicants", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const applicants = await storage.getApplicants();
      res.json(applicants);
    } catch (error) {
      res.status(500).json({ message: "Error fetching applicants" });
    }
  });

  app.get("/api/applicants/location/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const applicants = await storage.getApplicantsByLocation(locationId);
      res.json(applicants);
    } catch (error) {
      res.status(500).json({ message: "Error fetching applicants by location" });
    }
  });

  app.get("/api/applicants/status/:status", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const applicants = await storage.getApplicantsByStatus(req.params.status);
      res.json(applicants);
    } catch (error) {
      res.status(500).json({ message: "Error fetching applicants by status" });
    }
  });

  app.post("/api/applicants", isAuthenticated, hasRole(["manager", "floor_manager"]), validateRequest(insertApplicantSchema), async (req, res) => {
    try {
      const newApplicant = await storage.createApplicant(req.body);
      res.status(201).json(newApplicant);
    } catch (error) {
      res.status(500).json({ message: "Error creating applicant" });
    }
  });

  app.put("/api/applicants/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedApplicant = await storage.updateApplicant(id, req.body);
      if (!updatedApplicant) {
        return res.status(404).json({ message: "Applicant not found" });
      }
      res.json(updatedApplicant);
    } catch (error) {
      res.status(500).json({ message: "Error updating applicant" });
    }
  });

  app.delete("/api/applicants/:id", isAuthenticated, hasRole(["manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteApplicant(id);
      if (!deleted) {
        return res.status(404).json({ message: "Applicant not found" });
      }
      res.json({ message: "Applicant deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting applicant" });
    }
  });

  // Schedule Templates Routes
  app.get("/api/schedule-templates", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const templates = await storage.getScheduleTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Error fetching schedule templates" });
    }
  });

  app.get("/api/schedule-templates/location/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const templates = await storage.getScheduleTemplatesByLocation(locationId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Error fetching schedule templates by location" });
    }
  });

  app.post("/api/schedule-templates", isAuthenticated, hasRole(["manager", "floor_manager"]), validateRequest(insertScheduleTemplateSchema), async (req, res) => {
    try {
      const newTemplate = await storage.createScheduleTemplate(req.body);
      res.status(201).json(newTemplate);
    } catch (error) {
      res.status(500).json({ message: "Error creating schedule template" });
    }
  });

  app.put("/api/schedule-templates/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedTemplate = await storage.updateScheduleTemplate(id, req.body);
      if (!updatedTemplate) {
        return res.status(404).json({ message: "Schedule template not found" });
      }
      res.json(updatedTemplate);
    } catch (error) {
      res.status(500).json({ message: "Error updating schedule template" });
    }
  });

  app.delete("/api/schedule-templates/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteScheduleTemplate(id);
      if (!deleted) {
        return res.status(404).json({ message: "Schedule template not found" });
      }
      res.json({ message: "Schedule template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting schedule template" });
    }
  });

  // Template Shifts Routes
  app.get("/api/template-shifts/template/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const shifts = await storage.getTemplateShiftsByTemplate(templateId);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching template shifts" });
    }
  });

  app.post("/api/template-shifts", isAuthenticated, hasRole(["manager", "floor_manager"]), validateRequest(insertTemplateShiftSchema), async (req, res) => {
    try {
      const newShift = await storage.createTemplateShift(req.body);
      res.status(201).json(newShift);
    } catch (error) {
      res.status(500).json({ message: "Error creating template shift" });
    }
  });

  app.put("/api/template-shifts/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedShift = await storage.updateTemplateShift(id, req.body);
      if (!updatedShift) {
        return res.status(404).json({ message: "Template shift not found" });
      }
      res.json(updatedShift);
    } catch (error) {
      res.status(500).json({ message: "Error updating template shift" });
    }
  });

  app.delete("/api/template-shifts/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTemplateShift(id);
      if (!deleted) {
        return res.status(404).json({ message: "Template shift not found" });
      }
      res.json({ message: "Template shift deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting template shift" });
    }
  });

  // Weekly Schedules Routes
  app.get("/api/weekly-schedules", isAuthenticated, async (req, res) => {
    try {
      const schedules = await storage.getWeeklySchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Error fetching weekly schedules" });
    }
  });

  app.get("/api/weekly-schedules/location/:id", isAuthenticated, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const schedules = await storage.getWeeklySchedulesByLocation(locationId);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Error fetching weekly schedules by location" });
    }
  });

  app.post("/api/weekly-schedules", isAuthenticated, hasRole(["manager", "floor_manager"]), validateRequest(insertWeeklyScheduleSchema), async (req, res) => {
    try {
      const newSchedule = await storage.createWeeklySchedule(req.body);
      res.status(201).json(newSchedule);
    } catch (error) {
      res.status(500).json({ message: "Error creating weekly schedule" });
    }
  });

  app.put("/api/weekly-schedules/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedSchedule = await storage.updateWeeklySchedule(id, req.body);
      if (!updatedSchedule) {
        return res.status(404).json({ message: "Weekly schedule not found" });
      }
      res.json(updatedSchedule);
    } catch (error) {
      res.status(500).json({ message: "Error updating weekly schedule" });
    }
  });

  app.delete("/api/weekly-schedules/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteWeeklySchedule(id);
      if (!deleted) {
        return res.status(404).json({ message: "Weekly schedule not found" });
      }
      res.json({ message: "Weekly schedule deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting weekly schedule" });
    }
  });

  // Shifts Routes
  app.get("/api/shifts", isAuthenticated, async (req, res) => {
    try {
      const shifts = await storage.getShifts();
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching shifts" });
    }
  });

  app.get("/api/shifts/schedule/:id", isAuthenticated, async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id);
      const shifts = await storage.getShiftsBySchedule(scheduleId);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching shifts by schedule" });
    }
  });

  app.get("/api/shifts/staff/:id", isAuthenticated, async (req, res) => {
    try {
      const staffId = parseInt(req.params.id);
      const shifts = await storage.getShiftsByStaff(staffId);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching shifts by staff" });
    }
  });

  app.post("/api/shifts", isAuthenticated, hasRole(["manager", "floor_manager"]), validateRequest(insertShiftSchema), async (req, res) => {
    try {
      const newShift = await storage.createShift(req.body);
      res.status(201).json(newShift);
    } catch (error) {
      res.status(500).json({ message: "Error creating shift" });
    }
  });

  app.put("/api/shifts/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedShift = await storage.updateShift(id, req.body);
      if (!updatedShift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      res.json(updatedShift);
    } catch (error) {
      res.status(500).json({ message: "Error updating shift" });
    }
  });

  app.delete("/api/shifts/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteShift(id);
      if (!deleted) {
        return res.status(404).json({ message: "Shift not found" });
      }
      res.json({ message: "Shift deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting shift" });
    }
  });

  // Cash Counts Routes
  app.get("/api/cash-counts", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const cashCounts = await storage.getCashCounts();
      res.json(cashCounts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching cash counts" });
    }
  });

  app.get("/api/cash-counts/location/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const cashCounts = await storage.getCashCountsByLocation(locationId);
      res.json(cashCounts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching cash counts by location" });
    }
  });

  app.post("/api/cash-counts", isAuthenticated, hasRole(["manager", "floor_manager"]), validateRequest(insertCashCountSchema), async (req, res) => {
    try {
      const newCashCount = await storage.createCashCount(req.body);
      res.status(201).json(newCashCount);
    } catch (error) {
      res.status(500).json({ message: "Error creating cash count" });
    }
  });

  app.put("/api/cash-counts/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedCashCount = await storage.updateCashCount(id, req.body);
      if (!updatedCashCount) {
        return res.status(404).json({ message: "Cash count not found" });
      }
      res.json(updatedCashCount);
    } catch (error) {
      res.status(500).json({ message: "Error updating cash count" });
    }
  });

  app.delete("/api/cash-counts/:id", isAuthenticated, hasRole(["manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCashCount(id);
      if (!deleted) {
        return res.status(404).json({ message: "Cash count not found" });
      }
      res.json({ message: "Cash count deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting cash count" });
    }
  });

  // Knowledge Base Categories Routes
  app.get("/api/kb-categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getKbCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching KB categories" });
    }
  });

  app.get("/api/kb-categories/location/:id", isAuthenticated, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const categories = await storage.getKbCategoriesByLocation(locationId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching KB categories by location" });
    }
  });

  app.post("/api/kb-categories", isAuthenticated, hasRole(["manager", "floor_manager"]), validateRequest(insertKbCategorySchema), async (req, res) => {
    try {
      const newCategory = await storage.createKbCategory(req.body);
      res.status(201).json(newCategory);
    } catch (error) {
      res.status(500).json({ message: "Error creating KB category" });
    }
  });

  app.put("/api/kb-categories/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedCategory = await storage.updateKbCategory(id, req.body);
      if (!updatedCategory) {
        return res.status(404).json({ message: "KB category not found" });
      }
      res.json(updatedCategory);
    } catch (error) {
      res.status(500).json({ message: "Error updating KB category" });
    }
  });

  app.delete("/api/kb-categories/:id", isAuthenticated, hasRole(["manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteKbCategory(id);
      if (!deleted) {
        return res.status(404).json({ message: "KB category not found" });
      }
      res.json({ message: "KB category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting KB category" });
    }
  });

  // Knowledge Base Articles Routes
  app.get("/api/kb-articles", isAuthenticated, async (req, res) => {
    try {
      const articles = await storage.getKbArticles();
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Error fetching KB articles" });
    }
  });

  app.get("/api/kb-articles/category/:id", isAuthenticated, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const articles = await storage.getKbArticlesByCategory(categoryId);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Error fetching KB articles by category" });
    }
  });

  app.post("/api/kb-articles", isAuthenticated, hasRole(["manager", "floor_manager"]), validateRequest(insertKbArticleSchema), async (req, res) => {
    try {
      const newArticle = await storage.createKbArticle(req.body);
      res.status(201).json(newArticle);
    } catch (error) {
      res.status(500).json({ message: "Error creating KB article" });
    }
  });

  app.put("/api/kb-articles/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedArticle = await storage.updateKbArticle(id, req.body);
      if (!updatedArticle) {
        return res.status(404).json({ message: "KB article not found" });
      }
      res.json(updatedArticle);
    } catch (error) {
      res.status(500).json({ message: "Error updating KB article" });
    }
  });

  app.delete("/api/kb-articles/:id", isAuthenticated, hasRole(["manager", "floor_manager"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteKbArticle(id);
      if (!deleted) {
        return res.status(404).json({ message: "KB article not found" });
      }
      res.json({ message: "KB article deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting KB article" });
    }
  });

  // QR Code Route - returns the URL for registration
  app.get("/api/qr-code-url", (req, res) => {
    const baseUrl = req.protocol + '://' + req.get('host');
    const registerUrl = `${baseUrl}/register?source=qrcode`;
    res.json({ url: registerUrl });
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time notifications
  const wss = setupWebSocketServer(httpServer);

  return httpServer;
}
