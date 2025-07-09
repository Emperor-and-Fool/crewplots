/*
 * ===================================================================================================
 * 🚨 MODULAR ROUTE ARCHITECTURE - NO FALLBACKS ALLOWED 🚨
 * ===================================================================================================
 * 
 * ALL SCHEDULER FUNCTIONALITY HAS BEEN MIGRATED TO MODULAR ROUTES:
 * 
 * Location: server/routes/scheduler/
 * Structure:
 *   ├── index.ts           - Main scheduler router (mounts all sub-routes)
 *   ├── schedule-blocks.ts - Schedule block CRUD operations
 *   ├── week-schedules.ts  - Week schedule management
 *   ├── shifts.ts          - Individual shift operations
 *   ├── requirements.ts    - Shift requirement management
 *   └── assignments.ts     - Crew assignment operations
 * 
 * URL Structure: All scheduler endpoints are now prefixed with /api/scheduler/
 * Examples:
 *   - GET    /api/scheduler/schedule-blocks
 *   - POST   /api/scheduler/schedule-blocks
 *   - GET    /api/scheduler/week-schedules/:id/shifts
 *   - POST   /api/scheduler/week-schedules/:id/shifts
 * 
 * ⛔ STRICT PROHIBITION: NO FALLBACKS OR BACKWARD COMPATIBILITY ⛔
 * 
 * - Do NOT uncomment any legacy scheduler endpoints in this file
 * - Do NOT add fallback routes that duplicate modular functionality
 * - Do NOT create "temporary" inline endpoints for "quick fixes"
 * - All new scheduler features MUST be added to the modular structure
 * 
 * If you need to modify scheduler functionality, go to server/routes/scheduler/
 * If you find commented scheduler code below, it stays commented - PERMANENTLY
 * 
 * This architectural decision ensures:
 * ✓ Clean separation of concerns
 * ✓ Maintainable codebase
 * ✓ No code duplication
 * ✓ Clear developer expectations
 * 
 * ===================================================================================================
 */

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { hybridSessionStore } from "./services/hybrid-session-store";
import { onDemandRedis } from "../adapters-repl/redis-ondemand/on-demand-redis";
import { 
  insertUserSchema, insertLocationSchema, insertCompetencySchema, 
  insertUserLocationSchema, insertUserCompetencySchema,
  insertScheduleTemplateSchema, insertTemplateShiftSchema,
  insertScheduleBlockSchema, insertWeekScheduleSchema, insertShiftSchema, insertShiftRequirementSchema, insertShiftSubscriptionSchema,
  insertShiftAssignmentSchema, insertSchedulingWindowSchema,
  insertCashCountSchema, insertKbCategorySchema, insertKbArticleSchema,
  loginSchema, registerSchema, type User
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import "./middleware/auth"; // Import auth middleware for TypeScript declarations

// Permission checking utility function - now properly typed with schema
function hasPermission(userRole: User['role'], permission: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    'administrator': ['view', 'create', 'edit', 'delete', 'schedule', 'manage', 'admin', 'crew_planning', 'scheduler_development', 'scheduler_development.read', 'scheduler_development.write', 'scheduler_development.execute'],
    'owner': ['view', 'create', 'edit', 'delete', 'schedule', 'manage', 'crew_planning', 'scheduler_development', 'scheduler_development.read', 'scheduler_development.write', 'scheduler_development.execute'],
    'app_manager': ['view', 'create', 'edit', 'schedule', 'manage', 'crew_planning'],
    'crew_chief': ['view', 'create', 'edit', 'schedule'],
    'crew_member': ['view', 'manage'],
    'applicant': ['view']
  };
  
  return rolePermissions[userRole]?.includes(permission) || false;
}
import { assignDefaultPermissionsToExistingUsers } from './utils/assign-default-permissions';
import { authenticateUser, detectLegacyAuth } from './middleware/auth';
import path from "path";
import authRoutes from './routes/auth-routes';
import uploadRoutes from './routes/uploads';
import applicantPortalRoutes from './routes/applicant-portal';
// Redis routes moved to backup - using single Redis implementation
// import messagesRoutes from './routes/messages/index';
// Documents routes removed - functionality moved to template files
import dashboardRoutes from './routes/dashboard';
import mongodbMessagesRoutes from './routes/mongodb-messages';
import notesRoutes from './routes/messages/notes';
import emailRoutes from './routes/email';
import schedulerRoutes from './routes/scheduler';
import userRoutes from './routes/users';
import validationRoutes from './routes/validation';
import validationV3Routes from './routes/validation-v3';
import securityRoutes from './routes/security';
import lazyLoadingTestRoutes from './routes/lazy-loading-test';
import { OnDemandRedisService } from '../adapters-repl/redis-ondemand/on-demand-redis';


import redisMonitorRoutes from './routes/redis-monitor';
import mongoMonitorRoutes from './routes/mongo-monitor';
import hybridCacheMonitorRoutes from './routes/hybrid-cache-monitor-simple';
import sessionMonitorRoutes from './routes/session-monitor';

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Setup PostgreSQL session store
const PgStore = connectPgSimple(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  // Track logged browser connections to only log first connection
  const loggedConnections = new Set();
  
  // Request logging middleware - only log first connection from each browser
  app.use((req, res, next) => {
    const userAgent = req.get('User-Agent') || 'unknown';
    const browserInfo = userAgent.includes('Edg') ? 'Edge' : 
                       userAgent.includes('Chrome') ? 'Chrome' : 
                       userAgent.includes('Firefox') ? 'Firefox' : 'Other';
    
    // Only log the first request from each unique browser
    if (!loggedConnections.has(userAgent)) {
      console.log(`🌐 First connection from ${browserInfo}`);
      loggedConnections.add(userAgent);
    }
    next();
  });

  // Setup session middleware
  app.set('trust proxy', 1); // Trust first proxy, important for proper cookie handling
  
  // Configure session middleware with smart session creation
  app.use(
    session({
      cookie: { 
        maxAge: 86400000, // 24 hours
        secure: false, // FORCED FALSE for Replit development - cookies must work over HTTP
        httpOnly: true,
        sameSite: 'lax', // More compatible and secure than 'none'
        path: '/',
        domain: undefined // Let browser handle domain automatically
      },
      store: hybridSessionStore,
      secret: process.env.SESSION_SECRET || "crewplots-dev-static-key-2025",
      resave: false, // Don't save session on each request unless modified
      saveUninitialized: false, // Don't create sessions for unauthenticated requests
      name: 'connect.sid', // Use default session name
      rolling: false, // Don't force cookies on every response to reduce overhead
      // Note: Removed custom genid to prevent client-side execution issues
      // Session creation is controlled by saveUninitialized: false instead
    })
  );

  // Legacy authentication detection middleware - monitors session access patterns
  app.use(detectLegacyAuth);

  // Register API endpoints FIRST before other routes to prevent conflicts
  
  // ⚠️ LEGACY USER ENDPOINT - MIGRATED TO MODULAR ROUTES ⚠️
  // Original: GET /api/users/:id
  // Migrated to: server/routes/users/management.ts - GET /api/users/management/:id
  // Migration reason: Plan 048 - Consolidate inefficient user endpoints into modular structure
  /*
  app.get("/api/users/:id", async (req, res) => {
    console.log("Individual user endpoint hit with ID:", req.params.id);
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        console.log("Invalid user ID:", req.params.id);
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      console.log("Fetching user with ID:", userId);
      const user = await storage.getUser(userId);
      console.log("Database result:", user ? "Found" : "Not found");
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  */

  // Legacy: Get individual applicant by ID  
  app.get("/api/applicants/:id", async (req, res) => {
    console.log("Legacy applicant endpoint hit with ID:", req.params.id);
    try {
      const applicantId = parseInt(req.params.id);
      if (isNaN(applicantId)) {
        return res.status(400).json({ error: "Invalid applicant ID" });
      }
      
      const user = await storage.getUserById(applicantId);
      
      if (!user || user.role !== 'applicant') {
        return res.status(404).json({ error: "Applicant not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching applicant:", error);
      res.status(500).json({ error: "Failed to fetch applicant" });
    }
  });

  // ⚠️ LEGACY USER ENDPOINT - MIGRATED TO MODULAR ROUTES ⚠️
  // Original: PATCH /api/users/:id
  // Migrated to: server/routes/users/management.ts - PATCH /api/users/management/:id
  // Migration reason: Plan 048 - Consolidate inefficient user endpoints into modular structure
  /*
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const updateData = req.body;
      console.log(`Updating user ${userId} with data:`, updateData);
      
      const updatedUser = await storage.updateUser(userId, updateData);
      if (updatedUser) {
        res.json(updatedUser);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  */

  // Legacy: Update individual applicant
  app.patch("/api/applicants/:id", async (req, res) => {
    try {
      const applicantId = parseInt(req.params.id);
      if (isNaN(applicantId)) {
        return res.status(400).json({ error: "Invalid applicant ID" });
      }
      
      const updateData = req.body;
      console.log(`Updating applicant ${applicantId} with data:`, updateData);
      
      const user = await storage.getUser(applicantId);
      if (!user || user.role !== 'applicant') {
        return res.status(404).json({ error: "Applicant not found" });
      }
      
      const updatedUser = await storage.updateUser(applicantId, updateData);
      if (updatedUser) {
        res.json(updatedUser);
      } else {
        res.status(404).json({ error: "Applicant not found" });
      }
    } catch (error) {
      console.error("Error updating applicant:", error);
      res.status(500).json({ error: "Failed to update applicant" });
    }
  });

  // ⚠️ LEGACY ENDPOINT - REPLACED BY VALIDATIONENGINE30 ⚠️
  // Original: GET /api/profile-data (unified data endpoint)
  // Replaced by: POST /api/validation/v3/validate with entityType: "authProfile"
  // Migration reason: ValidationEngine30 provides unified validation + hybrid storage integration
  /*
  app.get("/api/profile-data", authenticateUser, async (req, res) => {
    try {
      console.log(`🔍 API DEBUG: /api/profile-data request received for user: ${req.user.username}`);
      
      // Return ALL USERS array (restored original behavior)
      const allUsers = await storage.getUsers();
      
      console.log(`🔍 API DEBUG: Retrieved ${allUsers.length} users for profile data`);
      
      res.json(allUsers);
    } catch (error) {
      console.error("🔍 API DEBUG: Error in /api/profile-data:", error);
      res.status(500).json({ error: "Failed to fetch profile data" });
    }
  });
  */

  // ⚠️ LEGACY USER ENDPOINTS - MIGRATED TO MODULAR ROUTES ⚠️
  // Original: GET /api/users (with client-side filtering - Plan 048 inefficiency)
  // Migrated to: server/routes/users/management.ts - GET /api/users/management?role=X
  // Migration reason: Plan 048 - Eliminate full table scans + client filtering
  /*
  app.get("/api/users", async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      console.log(`[USERS API] Returning ${allUsers.length} user profiles`);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get users by role - unified endpoint
  app.get("/api/users/role/:role", async (req, res) => {
    try {
      const role = req.params.role;
      const allUsers = await storage.getUsers();
      const filteredUsers = allUsers.filter(user => user.role === role);
      console.log(`[USERS API] Returning ${filteredUsers.length} users with role '${role}' (filtered from ${allUsers.length} total users)`);
      res.json(filteredUsers);
    } catch (error) {
      console.error("Error fetching users by role:", error);
      res.status(500).json({ error: "Failed to fetch users by role" });
    }
  });
  */

  // ⚠️ LEGACY ENDPOINT - REPLACED BY VALIDATIONENGINE30 ⚠️
  // Original: GET /api/applicants (role filtering endpoint)
  // Replaced by: POST /api/validation/v3/validate with entityType: "userManagement" + role filtering
  // Migration reason: ValidationEngine30 provides unified validation + permission checking + hybrid storage
  /*
  app.get("/api/applicants", async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      const applicants = allUsers.filter(user => user.role === 'applicant');
      console.log(`[LEGACY API] Returning ${applicants.length} applicants (filtered from ${allUsers.length} total users)`);
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      res.status(500).json({ error: "Failed to fetch applicants" });
    }
  });
  */

  // Get all locations with default query function support
  app.get("/api/locations", authenticateUser, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      console.log(`[LOCATIONS API] Returning ${locations.length} locations`);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  // Create new location
  app.post("/api/locations", authenticateUser, async (req, res) => {
    try {
      const locationData = req.body;
      console.log("[LOCATIONS API] Creating location:", locationData);
      
      const newLocation = await storage.createLocation(locationData);
      res.status(201).json(newLocation);
    } catch (error) {
      console.error("Error creating location:", error);
      res.status(500).json({ error: "Failed to create location" });
    }
  });

  // Address lookup endpoint
  app.post("/api/locations/lookup-address", async (req, res) => {
    try {
      const { address } = req.body;
      console.log("[ADDRESS LOOKUP] Request received:", { address });
      
      if (!address) {
        return res.status(400).json({ error: "Address is required" });
      }
      
      // Direct implementation instead of dynamic import
      const encodedAddress = encodeURIComponent(address);
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodedAddress}`;
      
      console.log("[ADDRESS LOOKUP] Fetching from:", url);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CrewPlots-LocationManager/1.0 (contact@crewplots.com)'
        }
      });
      
      if (!response.ok) {
        console.error(`[ADDRESS LOOKUP] API error: ${response.status}`);
        return res.status(500).json({ error: "External API error" });
      }
      
      const data = await response.json();
      console.log("[ADDRESS LOOKUP] API response:", data);
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: "Address not found" });
      }
      
      const result = data[0];
      const addressData = {
        address: result.display_name || address,
        postalCode: result.address?.postcode,
        city: result.address?.city || result.address?.town || result.address?.village,
        country: result.address?.country,
        coordinates: result.lat && result.lon ? {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        } : undefined
      };
      
      console.log("[ADDRESS LOOKUP] Returning:", addressData);
      res.json(addressData);
      
    } catch (error) {
      console.error("Error looking up address:", error);
      res.status(500).json({ error: "Failed to lookup address" });
    }
  });

  // Get specific location
  app.get("/api/locations/:id", authenticateUser, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ error: "Invalid location ID" });
      }
      
      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }
      
      res.json(location);
    } catch (error) {
      console.error("Error fetching location:", error);
      res.status(500).json({ error: "Failed to fetch location" });
    }
  });

  // Update location
  app.patch("/api/locations/:id", authenticateUser, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ error: "Invalid location ID" });
      }
      
      const updates = req.body;
      console.log(`[LOCATIONS API] Updating location ${locationId} with:`, updates);
      
      const updatedLocation = await storage.updateLocation(locationId, updates);
      if (!updatedLocation) {
        return res.status(404).json({ error: "Location not found" });
      }
      
      res.json(updatedLocation);
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  // Delete location
  app.delete("/api/locations/:id", authenticateUser, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ error: "Invalid location ID" });
      }
      
      const success = await storage.deleteLocation(locationId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Location not found" });
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({ error: "Failed to delete location" });
    }
  });

  // Location-filtered API endpoints for database-based filtering

  // Crew member routes (user-location assignments)
  // ⚠️ LEGACY USER-LOCATIONS ENDPOINT - MIGRATED TO MODULAR ROUTES ⚠️
  // Original: GET /api/user-locations
  // Migrated to: server/routes/users/locations.ts - GET /api/users/locations
  /*
  app.get('/api/user-locations', async (req, res) => {
    try {
      console.log('🔍 API: Fetching user-location assignments');
      const userLocations = await storage.getUserLocations(0); // Get all assignments
      console.log(`🔍 API: Retrieved ${userLocations.length} user-location assignments`);
      res.json(userLocations);
    } catch (error) {
      console.error('Error fetching user-location assignments:', error);
      res.status(500).json({ error: "Failed to fetch user-location assignments" });
    }
  });
  */

  // ⚠️ LEGACY USER-LOCATIONS ENDPOINT - MIGRATED TO MODULAR ROUTES ⚠️
  // Original: POST /api/user-locations
  // Migrated to: server/routes/users/locations.ts - POST /api/users/locations
  /*
  app.post('/api/user-locations', async (req, res) => {
    try {
      console.log(`🔍 API DEBUG: POST /api/user-locations - Request body:`, req.body);
      const result = insertUserLocationSchema.safeParse(req.body);
      if (!result.success) {
        console.log(`🔍 API DEBUG: Schema validation failed:`, fromZodError(result.error).toString());
        return res.status(400).json({ 
          error: "Invalid user location data", 
          details: fromZodError(result.error).toString() 
        });
      }

      const userLocation = await storage.assignUserToLocation(result.data);
      console.log('🔍 API: Created user-location assignment:', userLocation.id);
      res.status(201).json(userLocation);
    } catch (error) {
      console.error('Error creating user-location assignment:', error);
      res.status(500).json({ error: "Failed to create user-location assignment" });
    }
  });
  */

  // ⚠️ LEGACY USER-LOCATIONS ENDPOINT - MIGRATED TO MODULAR ROUTES ⚠️
  // Original: DELETE /api/user-locations/:userId/:locationId
  // Migrated to: server/routes/users/locations.ts - DELETE /api/users/locations/:userId/:locationId
  /*
  app.delete('/api/user-locations/:userId/:locationId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const locationId = parseInt(req.params.locationId);
      
      if (isNaN(userId) || isNaN(locationId)) {
        return res.status(400).json({ error: "Invalid user ID or location ID" });
      }

      const success = await storage.removeUserFromLocation(userId, locationId);
      if (!success) {
        return res.status(404).json({ error: "User-location assignment not found" });
      }

      console.log(`🔍 API: Removed user ${userId} from location ${locationId}`);
      res.status(204).send();
    } catch (error) {
      console.error('Error removing user-location assignment:', error);
      res.status(500).json({ error: "Failed to remove user-location assignment" });
    }
  });
  */

  // Removed redundant crew endpoint - using existing /api/profile-data instead

  // Get crew members for a specific location
  app.get('/api/locations/:locationId/crew', async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        return res.status(400).json({ error: "Invalid location ID" });
      }

      const crewMembers = await storage.getCrewMembersByLocation(locationId);
      console.log(`🔍 API: Retrieved ${crewMembers.length} crew members for location ${locationId}`);
      res.json(crewMembers);
    } catch (error) {
      console.error('Error fetching crew members by location:', error);
      res.status(500).json({ error: "Failed to fetch crew members" });
    }
  });

  // ⚠️ LEGACY USER ENDPOINTS - MIGRATED TO MODULAR ROUTES ⚠️
  // Original: GET /api/users/:userId and PATCH /api/users/:userId
  // Migrated to: server/routes/users/profile.ts - /api/users/profile/:userId
  // Migration reason: Plan 048 - Eliminate parameter conflicts and complex debug logging
  /*
  // Get individual user profile
  app.get('/api/users/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`🔍 API DEBUG: /api/users/${userId} request received`);
      
      if (isNaN(userId)) {
        console.log(`🔍 API DEBUG: Invalid user ID: ${req.params.userId}`);
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        console.log(`🔍 API DEBUG: User ${userId} not found`);
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`🔍 API DEBUG: Found user:`, { id: user.id, name: user.name, role: user.role });
      res.json(user);
    } catch (error) {
      console.error('🔍 API DEBUG: Error in /api/users/:userId:', error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // Update user profile
  app.patch('/api/users/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`🔍 API DEBUG: PATCH /api/users/${userId} - Request body:`, req.body);
      
      if (isNaN(userId)) {
        console.log(`🔍 API DEBUG: Invalid user ID: ${req.params.userId}`);
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Validate allowed fields for update
      const allowedFields = ['role', 'notes', 'status', 'phoneNumber', 'email'];
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      console.log(`🔍 API DEBUG: Update data:`, updateData);

      if (Object.keys(updateData).length === 0) {
        console.log(`🔍 API DEBUG: No valid fields to update. Request body was:`, req.body);
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`🔍 API: Updated user ${userId} with fields:`, Object.keys(updateData));
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });
  */

  // ⚠️ LEGACY USER-LOCATIONS ENDPOINT - MIGRATED TO MODULAR ROUTES ⚠️
  // Original: GET /api/user-locations/:userId
  // Migrated to: server/routes/users/locations.ts - GET /api/users/locations/:userId
  /*
  // Get user-location assignments for a specific user
  app.get('/api/user-locations/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`🔍 API DEBUG: /api/user-locations/${userId} request received`);
      
      if (isNaN(userId)) {
        console.log(`🔍 API DEBUG: Invalid user ID: ${req.params.userId}`);
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const userLocations = await storage.getUserLocations(userId);
      console.log(`🔍 API DEBUG: Found ${userLocations.length} location assignments for user ${userId}`);
      res.json(userLocations);
    } catch (error) {
      console.error('🔍 API DEBUG: Error in /api/user-locations/:userId:', error);
      res.status(500).json({ error: "Failed to fetch user location assignments" });
    }
  });
  */

  // Get competencies by location
  app.get("/api/competencies/location/:locationId", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        return res.status(400).json({ error: "Invalid location ID" });
      }
      
      const competencies = await storage.getCompetenciesByLocation(locationId);
      console.log(`[COMPETENCIES API] Returning ${competencies.length} competencies for location ${locationId}`);
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching competencies by location:", error);
      res.status(500).json({ error: "Failed to fetch competencies by location" });
    }
  });

  // Get all competencies (temporary - returns empty array since no competencies exist yet)
  app.get("/api/competencies", async (req, res) => {
    try {
      console.log(`[COMPETENCIES API] Returning empty array - competencies system not implemented yet`);
      res.json([]);
    } catch (error) {
      console.error("Error fetching competencies:", error);
      res.status(500).json({ error: "Failed to fetch competencies" });
    }
  });

  // MOVED TO MODULAR: Get shifts by location (via schedule filtering) - now in /api/scheduler/shifts
  // app.get("/api/shifts/location/:locationId", async (req, res) => {
  //   try {
  //     const locationId = parseInt(req.params.locationId);
  //     if (isNaN(locationId)) {
  //       return res.status(400).json({ error: "Invalid location ID" });
  //     }
  //     
  //     const shifts = await storage.getShiftsByLocation(locationId);
  //     console.log(`[SHIFTS API] Returning ${shifts.length} shifts for location ${locationId}`);
  //     res.json(shifts);
  //   } catch (error) {
  //     console.error("Error fetching shifts by location:", error);
  //     res.status(500).json({ error: "Failed to fetch shifts by location" });
  //   }
  // });

  // Get applications by location
  app.get("/api/applications/location/:locationId", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        return res.status(400).json({ error: "Invalid location ID" });
      }
      
      const applications = await storage.getApplicationsByLocation(locationId);
      console.log(`[APPLICATIONS API] Returning ${applications.length} applications for location ${locationId}`);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications by location:", error);
      res.status(500).json({ error: "Failed to fetch applications by location" });
    }
  });

  // Get cash counts by location
  app.get("/api/cash-counts/location/:locationId", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      if (isNaN(locationId)) {
        return res.status(400).json({ error: "Invalid location ID" });
      }
      
      const cashCounts = await storage.getCashCountsByLocation(locationId);
      console.log(`[CASH COUNTS API] Returning ${cashCounts.length} cash counts for location ${locationId}`);
      res.json(cashCounts);
    } catch (error) {
      console.error("Error fetching cash counts by location:", error);
      res.status(500).json({ error: "Failed to fetch cash counts by location" });
    }
  });

  // MOVED TO MODULAR: Get schedule templates by location - now in /api/scheduler/schedule-blocks
  // app.get("/api/schedule-templates/location/:locationId", async (req, res) => {
  //   try {
  //     const locationId = parseInt(req.params.locationId);
  //     if (isNaN(locationId)) {
  //       return res.status(400).json({ error: "Invalid location ID" });
  //     }
  //     
  //     const templates = await storage.getScheduleTemplatesByLocation(locationId);
  //     console.log(`[SCHEDULE TEMPLATES API] Returning ${templates.length} templates for location ${locationId}`);
  //     res.json(templates);
  //   } catch (error) {
  //     console.error("Error fetching schedule templates by location:", error);
  //     res.status(500).json({ error: "Failed to fetch schedule templates by location" });
  //   }
  // });

  // MOVED TO MODULAR: Shifts - now in /api/scheduler/shifts
  // app.get("/api/shifts", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development.read")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const weekScheduleId = req.query.weekScheduleId ? parseInt(req.query.weekScheduleId as string) : undefined;
  //     
  //     if (weekScheduleId) {
  //       console.log(`🔍 SHIFTS API: Fetching shifts for week schedule ID: ${weekScheduleId}`);
  //       const shifts = await storage.getShiftsByWeekSchedule(weekScheduleId);
  //       console.log(`🔍 SHIFTS API: Found ${shifts.length} shifts for week schedule ${weekScheduleId}`);
  //       res.json(shifts);
  //     } else {
  //       console.log(`🔍 SHIFTS API: Fetching all shifts`);
  //       const shifts = await storage.getShifts();
  //       console.log(`🔍 SHIFTS API: Found ${shifts.length} total shifts`);
  //       res.json(shifts);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching shifts:", error);
  //     res.status(500).json({ error: "Failed to fetch shifts" });
  //   }
  // });

  // Get users by status - needed for dashboard
  app.get("/api/users/status/:status", async (req, res) => {
    try {
      const status = req.params.status;
      const users = await storage.getUsers();
      const filteredUsers = users.filter(user => user.status === status);
      res.json(filteredUsers);
    } catch (error) {
      console.error("Error fetching users by status:", error);
      res.status(500).json({ error: "Failed to fetch users by status" });
    }
  });

  // Legacy: Get applicants by status - needed for dashboard
  app.get("/api/applicants/status/:status", async (req, res) => {
    try {
      const status = req.params.status;
      const users = await storage.getUsers();
      const applicants = users.filter(user => user.role === 'applicant' && user.status === status);
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching applicants by status:", error);
      res.status(500).json({ error: "Failed to fetch applicants by status" });
    }
  });

  // Redis connection monitoring endpoint
  app.get("/api/debug/redis-connections", (req, res) => {
    try {
      const redisService = OnDemandRedisService.getInstance();
      const stats = redisService.getConnectionStats();
      res.json({
        timestamp: new Date().toISOString(),
        connectionStats: stats,
        status: 'Redis connection monitoring active'
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to get Redis connection stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Debug middleware to track all requests (DISABLED - too verbose for production debugging)
  // app.use((req, res, next) => {
  //   console.log(`🔍 REQUEST TRACKER: ${req.method} ${req.originalUrl} ${req.path}`);
  //   if (req.method === 'PUT') {
  //     console.log(`🚨 PUT REQUEST DETAILS:`);
  //     console.log(`- Original URL: ${req.originalUrl}`);
  //     console.log(`- Path: ${req.path}`);
  //     console.log(`- Headers: ${JSON.stringify(req.headers, null, 2)}`);
  //   }
  //   next();
  // });

  // Use route modules
  app.use('/api/auth', authRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/applicant-portal', applicantPortalRoutes);
  // Redis routes disabled - using single Redis implementation
  // app.use('/api/messages', messagesRoutes);
  // Documents routes disabled - functionality moved to template files
  // app.use('/api/documents', documentsRoutes);
  app.use('/api/mongodb', mongodbMessagesRoutes);
  app.use('/api/messaging/notes', notesRoutes);

  app.use('/api', dashboardRoutes);
  app.use('/api/scheduler', schedulerRoutes);
  // ⚠️ LEGACY MODULAR ROUTES - REPLACED BY VALIDATIONENGINE30 ⚠️
  // Original: /api/users modular routes (management, profile, workflows)
  // Replaced by: /api/validation/v3/validate with appropriate entityType
  // Migration reason: ValidationEngine30 provides unified validation + permission + hybrid storage
  // app.use('/api/users', userRoutes);
  app.use('/api/validation/v3', validationV3Routes);
  
  // 🚀 LAZY AUTH: Plan 052 Phase 2 test routes
  app.use('/api/lazy-test', lazyLoadingTestRoutes);
  app.use('/api/email', emailRoutes);
  app.use('/api/security', securityRoutes);
  app.use('/api/redis-monitor', redisMonitorRoutes);
  app.use('/api/mongo-monitor', mongoMonitorRoutes);
  app.use('/api/hybrid-cache', hybridCacheMonitorRoutes);
  app.use('/api/session-monitor', sessionMonitorRoutes);

  // Connection Status Route - shows current connection pool status
  app.get("/api/connection-status", (req, res) => {
    try {
      const dbPoolStats = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      };
      
      res.json({
        postgresql: dbPoolStats,
        timestamp: new Date().toISOString(),
        improvements: {
          postgresPoolSize: "12 connections (increased from 3)",
          redisKeepalive: "9 minutes (increased from 5)",
          prewarmedConnections: "4 Redis connections",
          healthMonitoring: "Active"
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get connection status" });
    }
  });

  // ⚠️ LEGACY ENDPOINT - REPLACED BY VALIDATIONENGINE30 ⚠️
  // Original: GET /api/profile (detailed user profile with Redis caching)
  // Replaced by: POST /api/validation/v3/validate with entityType: "authProfile"
  // Migration reason: ValidationEngine30 provides unified validation + hybrid storage + ProfileCard integration
  /*
  app.get("/api/profile", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.user.id;
      
      // For applicants, use the ProfileFetcher service with Redis caching
      if (req.user.role === 'applicant') {
        const { profileFetcherService } = await import('./services/profile-fetcher-service');
        const profileData = await profileFetcherService.getProfileData(userId);
        
        if (!profileData) {
          return res.status(404).json({ error: "Profile not found" });
        }
        
        return res.json(profileData);
      }
      
      // For managers, crew members, and administrators, get basic user data and cache it using the same pattern
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Remove password from response and format for consistency
      const { password: _password, ...userProfile } = user;
      
      // Add notes metadata (empty for non-applicants)
      const profileData = {
        ...userProfile,
        notes: {
          exists: false,
          documentId: null,
          wordCount: 0,
          characterCount: 0,
          lastUpdated: null,
          workflow: null
        }
      };
      
      res.json(profileData);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });
  */

  // QR Code Route - returns the URL for registration
  app.get("/api/qr-code-url", (req, res) => {
    const baseUrl = req.protocol + '://' + req.get('host');
    const registerUrl = `${baseUrl}/register?source=qrcode`;
    res.json({ url: registerUrl });
  });

  // MOVED TO MODULAR: === Scheduler API Routes === - now in /api/scheduler

  // MOVED TO MODULAR: Shift Requirements Management - now in /api/scheduler/requirements
  // app.get("/api/shift-requirements", async (req, res) => {
  //   try {
  //     const shiftId = req.query.shiftId ? parseInt(req.query.shiftId as string) : undefined;
  //     const requirements = await storage.getShiftRequirements(shiftId);
  //     res.json(requirements);
  //   } catch (error) {
  //     console.error("Error fetching shift requirements:", error);
  //     res.status(500).json({ error: "Failed to fetch shift requirements" });
  //   }
  // });

  // app.post("/api/shift-requirements", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const validatedData = insertShiftRequirementSchema.parse(req.body);
  //     const requirement = await storage.createShiftRequirement(validatedData);
  //     res.status(201).json(requirement);
  //   } catch (error) {
  //     console.error("Error creating shift requirement:", error);
  //     res.status(400).json({ error: "Failed to create shift requirement" });
  //   }
  // });

  // app.put("/api/shift-requirements/:id", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     const validatedData = insertShiftRequirementSchema.parse(req.body);
  //     const requirement = await storage.updateShiftRequirement(id, validatedData);
  //     res.json(requirement);
  //   } catch (error) {
  //     console.error("Error updating shift requirement:", error);
  //     res.status(400).json({ error: "Failed to update shift requirement" });
  //   }
  // });

  // app.delete("/api/shift-requirements/:id", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     await storage.deleteShiftRequirement(id);
  //     res.status(204).send();
  //   } catch (error) {
  //     console.error("Error deleting shift requirement:", error);
  //     res.status(500).json({ error: "Failed to delete shift requirement" });
  //   }
  // });

  // MOVED TO MODULAR: Shift Subscriptions Management - now in /api/scheduler/subscriptions
  // app.get("/api/shift-subscriptions", async (req, res) => {
  //   try {
  //     const shiftId = req.query.shiftId ? parseInt(req.query.shiftId as string) : undefined;
  //     const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  //     const subscriptions = await storage.getShiftSubscriptions(shiftId, userId);
  //     res.json(subscriptions);
  //   } catch (error) {
  //     console.error("Error fetching shift subscriptions:", error);
  //     res.status(500).json({ error: "Failed to fetch shift subscriptions" });
  //   }
  // });

  // app.post("/api/shift-subscriptions", async (req, res) => {
  //   if (!req.user) {
  //     return res.status(401).json({ error: "Not authenticated" });
  //   }

  //   try {
  //     const validatedData = insertShiftSubscriptionSchema.parse({
  //       ...req.body,
  //       userId: req.user.id
  //     });
  //     const subscription = await storage.createShiftSubscription(validatedData);
  //     res.status(201).json(subscription);
  //   } catch (error) {
  //     console.error("Error creating shift subscription:", error);
  //     res.status(400).json({ error: "Failed to create shift subscription" });
  //   }
  // });

  // app.put("/api/shift-subscriptions/:id", async (req, res) => {
  //   if (!req.user) {
  //     return res.status(401).json({ error: "Not authenticated" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     const validatedData = insertShiftSubscriptionSchema.parse(req.body);
  //     const subscription = await storage.updateShiftSubscription(id, validatedData);
  //     res.json(subscription);
  //   } catch (error) {
  //     console.error("Error updating shift subscription:", error);
  //     res.status(400).json({ error: "Failed to update shift subscription" });
  //   }
  // });

  // app.delete("/api/shift-subscriptions/:id", async (req, res) => {
  //   if (!req.user) {
  //     return res.status(401).json({ error: "Not authenticated" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     await storage.deleteShiftSubscription(id);
  //     res.status(204).send();
  //   } catch (error) {
  //     console.error("Error deleting shift subscription:", error);
  //     res.status(500).json({ error: "Failed to delete shift subscription" });
  //   }
  // });



  // MOVED TO MODULAR: Shift Assignments Management - now in /api/scheduler/assignments
  // app.get("/api/shift-assignments", async (req, res) => {
  //   try {
  //     const shiftId = req.query.shiftId ? parseInt(req.query.shiftId as string) : undefined;
  //     const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  //     const assignments = await storage.getShiftAssignments(shiftId, userId);
  //     res.json(assignments);
  //   } catch (error) {
  //     console.error("Error fetching shift assignments:", error);
  //     res.status(500).json({ error: "Failed to fetch shift assignments" });
  //   }
  // });

  // app.post("/api/shift-assignments", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const validatedData = insertShiftAssignmentSchema.parse({
  //       ...req.body,
  //       assignedBy: req.user.id
  //     });
  //     const assignment = await storage.createShiftAssignment(validatedData);
  //     res.status(201).json(assignment);
  //   } catch (error) {
  //     console.error("Error creating shift assignment:", error);
  //     res.status(400).json({ error: "Failed to create shift assignment" });
  //   }
  // });

  // app.put("/api/shift-assignments/:id", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     const validatedData = insertShiftAssignmentSchema.parse(req.body);
  //     const assignment = await storage.updateShiftAssignment(id, validatedData);
  //     res.json(assignment);
  //   } catch (error) {
  //     console.error("Error updating shift assignment:", error);
  //     res.status(400).json({ error: "Failed to update shift assignment" });
  //   }
  // });

  // app.delete("/api/shift-assignments/:id", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     await storage.deleteShiftAssignment(id);
  //     res.status(204).send();
  //   } catch (error) {
  //     console.error("Error deleting shift assignment:", error);
  //     res.status(500).json({ error: "Failed to delete shift assignment" });
  //   }
  // });

  // MOVED TO MODULAR: Scheduling Windows Management - now in /api/scheduler/assignments
  // app.get("/api/scheduling-windows", async (req, res) => {
  //   try {
  //     const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
  //     const role = req.query.role as string | undefined;
  //     const windows = await storage.getSchedulingWindows(locationId, role);
  //     res.json(windows);
  //   } catch (error) {
  //     console.error("Error fetching scheduling windows:", error);
  //     res.status(500).json({ error: "Failed to fetch scheduling windows" });
  //   }
  // });

  // app.post("/api/scheduling-windows", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const validatedData = insertSchedulingWindowSchema.parse({
  //       ...req.body,
  //       createdBy: req.user.id
  //     });
  //     const window = await storage.createSchedulingWindow(validatedData);
  //     res.status(201).json(window);
  //   } catch (error) {
  //     console.error("Error creating scheduling window:", error);
  //     res.status(400).json({ error: "Failed to create scheduling window" });
  //   }
  // });

  // app.put("/api/scheduling-windows/:id", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     const validatedData = insertSchedulingWindowSchema.parse(req.body);
  //     const window = await storage.updateSchedulingWindow(id, validatedData);
  //     res.json(window);
  //   } catch (error) {
  //     console.error("Error updating scheduling window:", error);
  //     res.status(400).json({ error: "Failed to update scheduling window" });
  //   }
  // });

  // app.delete("/api/scheduling-windows/:id", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     await storage.deleteSchedulingWindow(id);
  //     res.status(204).send();
  //   } catch (error) {
  //     console.error("Error deleting scheduling window:", error);
  //     res.status(500).json({ error: "Failed to delete scheduling window" });
  //   }
  // });

  // MOVED TO MODULAR: Week Schedule Management API - now in /api/scheduler/week-schedules
  // app.get("/api/week-schedules", authenticateUser, async (req, res) => {
  //   if (!hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
  //     const frameId = req.query.frameId ? parseInt(req.query.frameId as string) : undefined;
  //     
  //     if (frameId) {
  //       console.log(`🔍 SCHEDULE BLOCK QUERY - Fetching schedules for block: ${frameId}`);
  //       // Get schedule block data and all week schedules in this block
  //       const scheduleBlock = await storage.getScheduleBlock(frameId);
  //       if (!scheduleBlock) {
  //         return res.status(404).json({ error: "Schedule block not found" });
  //       }
  //       
  //       const weekSchedules = await storage.getWeekSchedulesByScheduleBlock(frameId);
  //       console.log(`🔍 SCHEDULE BLOCK QUERY - Found ${weekSchedules.length} schedules in block`);
  //       
  //       res.json({
  //         scheduleBlock,
  //         weekSchedules,
  //         isScheduleBlockMode: true
  //       });
  //     } else {
  //       // Standard location-based query
  //       const weekSchedules = await storage.getWeekSchedules(locationId);
  //       res.json(weekSchedules);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching week schedules:", error);
  //     res.status(500).json({ error: "Failed to fetch week schedules" });
  //   }
  // });

  // app.post("/api/week-schedules", async (req, res) => {
  //   console.log("🔄 WEEK SCHEDULE CREATE - Start");
  //   console.log("User:", req.user?.username, "Role:", req.user?.role);
  //   console.log("Request body:", req.body);
  //   console.log("Permission check for scheduler_development:", hasPermission(req.user?.role, "scheduler_development"));
  //   
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     console.log("❌ WEEK SCHEDULE CREATE - Permission denied");
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     console.log("✅ WEEK SCHEDULE CREATE - Permission granted, validating data");
  //     const validatedData = insertWeekScheduleSchema.parse({
  //       ...req.body,
  //       createdBy: req.user.id
  //     });
  //     console.log("✅ WEEK SCHEDULE CREATE - Data validated:", validatedData);
  //     
  //     const weekSchedule = await storage.createWeekSchedule(validatedData);
  //     console.log("✅ WEEK SCHEDULE CREATE - Saved successfully:", weekSchedule);
  //     res.status(201).json(weekSchedule);
  //   } catch (error) {
  //     console.error("❌ WEEK SCHEDULE CREATE - Error:", error);
  //     res.status(400).json({ error: "Failed to create week schedule" });
  //   }
  // });

  // MOVED TO MODULAR: Session Consolidation Endpoint for Scheduler Edit Page - now in /api/scheduler
  // app.get("/api/scheduler/edit-data/:id", async (req, res) => {
  //   console.log("🔄 SCHEDULER CONSOLIDATION - Edit data request");
  //   // near-future-removal: Optional chaining workaround for missing auth middleware typing
  //   // console.log("User:", req.user?.username, "Role:", req.user?.role);
  //   console.log("User:", req.user.username, "Role:", req.user.role);
  //   console.log("Schedule ID:", req.params.id);
  //   // near-future-removal: Optional chaining workaround for permission check
  //   // console.log("Permission check for scheduler_development:", hasPermission(req.user?.role, "scheduler_development"));
  //   console.log("Permission check for scheduler_development:", hasPermission(req.user.role, "scheduler_development"));
  //   
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     console.log("❌ SCHEDULER CONSOLIDATION - Permission denied");
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const scheduleId = parseInt(req.params.id);
  //     console.log("✅ SCHEDULER CONSOLIDATION - Permission granted, loading consolidated data");
  //     
  //     const { schedulerConsolidationService } = await import('./services/scheduler-consolidation-service');
  //     const consolidatedData = await schedulerConsolidationService.getSchedulerEditData(scheduleId, req.user.role);
  //     
  //     if (!consolidatedData || !consolidatedData.schedule) {
  //       console.log("❌ SCHEDULER CONSOLIDATION - Schedule not found");
  //       return res.status(404).json({ error: "Schedule not found" });
  //     }
  //     
  //     console.log("✅ SCHEDULER CONSOLIDATION - Data loaded successfully");
  //     res.json(consolidatedData);
  //   } catch (error) {
  //     console.error("❌ SCHEDULER CONSOLIDATION - Error:", error);
  //     res.status(500).json({ error: "Failed to fetch scheduler edit data" });
  //   }
  // });

  // MOVED TO MODULAR: Week schedule endpoints - now in /api/scheduler/week-schedules
  // app.get("/api/week-schedules/:id", async (req, res) => {
  //   console.log("🔍 WEEK SCHEDULE FETCH - Single schedule request");
  //   // near-future-removal: Optional chaining workaround for missing auth middleware typing
  //   // console.log("User:", req.user?.username, "Role:", req.user?.role);
  //   console.log("User:", req.user.username, "Role:", req.user.role);
  //   console.log("Schedule ID:", req.params.id);
  //   // near-future-removal: Optional chaining workaround for permission check
  //   // console.log("Permission check for scheduler_development:", hasPermission(req.user?.role, "scheduler_development"));
  //   console.log("Permission check for scheduler_development:", hasPermission(req.user.role, "scheduler_development"));
  //   
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     console.log("❌ WEEK SCHEDULE FETCH - Permission denied");
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     console.log("✅ WEEK SCHEDULE FETCH - Fetching schedule with ID:", id);
  //     console.log("✅ WEEK SCHEDULE FETCH - Calling storage.getWeekScheduleById...");
  //     const weekSchedule = await storage.getWeekScheduleById(id);
  //     console.log("✅ WEEK SCHEDULE FETCH - Raw result from storage:", JSON.stringify(weekSchedule, null, 2));
  //     console.log("✅ WEEK SCHEDULE FETCH - Found schedule:", weekSchedule ? "Yes" : "No");
  //     
  //     if (!weekSchedule) {
  //       console.log("❌ WEEK SCHEDULE FETCH - Schedule not found in database");
  //       return res.status(404).json({ error: "Week schedule not found" });
  //     }
  //     
  //     console.log("✅ WEEK SCHEDULE FETCH - Returning schedule data to frontend");
  //     res.json(weekSchedule);
  //   } catch (error) {
  //     console.error("❌ WEEK SCHEDULE FETCH - Database error:", error);
  //     res.status(500).json({ error: "Failed to fetch week schedule" });
  //   }
  // });

  // app.put("/api/week-schedules/:id", async (req, res) => {
  //   console.log("🔄 WEEK SCHEDULE UPDATE - Start");
  //   // near-future-removal: Optional chaining workaround for missing auth middleware typing
  //   // console.log("User:", req.user?.username, "Role:", req.user?.role);
  //   console.log("User:", req.user.username, "Role:", req.user.role);
  //   console.log("Schedule ID:", req.params.id);
  //   console.log("Request body:", req.body);
  //   // near-future-removal: Optional chaining workaround for permission check
  //   // console.log("Permission check for scheduler_development:", hasPermission(req.user?.role, "scheduler_development"));
  //   console.log("Permission check for scheduler_development:", hasPermission(req.user.role, "scheduler_development"));
  //   
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     console.log("❌ WEEK SCHEDULE UPDATE - Permission denied");
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     console.log("✅ WEEK SCHEDULE UPDATE - Permission granted, validating data");
  //     const validatedData = insertWeekScheduleSchema.omit({ createdBy: true }).parse(req.body);
  //     console.log("✅ WEEK SCHEDULE UPDATE - Data validated:", validatedData);
  //     
  //     const weekSchedule = await storage.updateWeekSchedule(id, validatedData);
  //     console.log("✅ WEEK SCHEDULE UPDATE - Updated successfully:", weekSchedule);
  //     res.json(weekSchedule);
  //   } catch (error) {
  //     console.error("❌ WEEK SCHEDULE UPDATE - Error:", error);
  //     res.status(400).json({ error: "Failed to update week schedule" });
  //   }
  // });

  // near-future-removal: Multi-week frame routes temporarily disabled during schema migration
  // app.post("/api/multi-week-frames", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }
  //   try {
  //     const validatedData = insertScheduleBlockSchema.parse({
  //       ...req.body,
  //       createdBy: req.user.id
  //     });
  //     const frame = await storage.createScheduleBlock(validatedData);
  //     res.status(201).json(frame);
  //   } catch (error) {
  //     console.error("Error creating schedule block:", error);
  //     res.status(400).json({ error: "Failed to create schedule block" });
  //   }
  // });

  // near-future-removal: Copy route disabled during schema migration
  // app.post("/api/week-schedules/:id/copy", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }
  //   try {
  //     const sourceWeekScheduleId = parseInt(req.params.id);
  //     const { scheduleBlockId, weekNumber } = req.body;
  //     const copiedWeek = await storage.copyWeekToBlock(sourceWeekScheduleId, scheduleBlockId, weekNumber);
  //     res.status(201).json(copiedWeek);
  //   } catch (error) {
  //     console.error("Error copying week schedule:", error);
  //     res.status(400).json({ error: "Failed to copy week schedule" });
  //   }
  // });

  // MOVED TO MODULAR: Multi-week frames and shifts management - now in /api/scheduler/
  // app.get("/api/multi-week-frames/:id/weeks", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const frameId = parseInt(req.params.id);
  //     const weeks = await storage.getWeekSchedulesByFrame(frameId);
  //     res.json(weeks);
  //   } catch (error) {
  //     console.error("Error fetching frame weeks:", error);
  //     res.status(500).json({ error: "Failed to fetch weeks in frame" });
  //   }
  // });

  // app.patch("/api/multi-week-frames/:id", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const frameId = parseInt(req.params.id);
  //     const validatedData = insertScheduleBlockSchema.omit({ createdBy: true }).partial().parse(req.body);
  //     const frame = await storage.updateMultiWeekFrame(frameId, validatedData);
  //     res.json(frame);
  //   } catch (error) {
  //     console.error("Error updating multi-week frame:", error);
  //     res.status(400).json({ error: "Failed to update multi-week frame" });
  //   }
  // });

  // app.delete("/api/week-schedules/:id", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     await storage.deleteWeekSchedule(id);
  //     res.status(204).send();
  //   } catch (error) {
  //     console.error("Error deleting week schedule:", error);
  //     res.status(500).json({ error: "Failed to delete week schedule" });
  //   }
  // });

  // app.post("/api/week-schedules/:id/shifts", authenticateUser, async (req, res) => {
  //   if (!hasPermission(req.user.role, "scheduler_development")) {
  //     console.log("🔄 AUTO-SAVE: Permission denied for user:", req.user.username, "role:", req.user.role);
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const weekScheduleId = parseInt(req.params.id);
  //     console.log("🔄 AUTO-SAVE: Creating shift for week schedule:", weekScheduleId);
  //     console.log("🔄 AUTO-SAVE: Request body:", req.body);
      
  //     const validatedData = insertShiftSchema.parse({
  //       ...req.body,
  //       weekScheduleId
  //     });
  //     console.log("🔄 AUTO-SAVE: Validated data:", validatedData);
      
  //     const shift = await storage.createShiftForWeekSchedule(validatedData);
  //     console.log("🔄 AUTO-SAVE: Created shift successfully:", shift);
  //     res.status(201).json(shift);
  //   } catch (error) {
  //     console.error("🔄 AUTO-SAVE: Error creating shift for week schedule:", error);
  //     res.status(400).json({ error: "Failed to create shift" });
  //   }
  // });

  // app.get("/api/week-schedules/:id/shifts", authenticateUser, async (req, res) => {
  //   if (!hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const weekScheduleId = parseInt(req.params.id);
  //     const shifts = await storage.getShiftsByWeekSchedule(weekScheduleId);
  //     res.json(shifts);
  //   } catch (error) {
  //     console.error("Error fetching shifts for week schedule:", error);
  //     res.status(500).json({ error: "Failed to fetch shifts" });
  //   }
  // });

  // app.delete("/api/shifts/:id", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     await storage.deleteShift(id);
  //     res.status(204).send();
  //   } catch (error) {
  //     console.error("Error deleting shift:", error);
  //     res.status(500).json({ error: "Failed to delete shift" });
  //   }
  // });

  // app.delete("/api/week-schedules/:id", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     await storage.deleteWeekSchedule(id);
  //     res.status(204).send();
  //   } catch (error) {
  //     console.error("Error deleting week schedule:", error);
  //     res.status(500).json({ error: "Failed to delete week schedule" });
  //   }
  // });

  // MOVED TO MODULAR: PUT endpoint for updating shifts - now in /api/scheduler/shifts
  // app.put("/api/shifts/:id", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     console.log("🔄 AUTO-SAVE UPDATE: Permission denied for user:", req.user?.username, "role:", req.user?.role);
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const shiftId = parseInt(req.params.id);
  //     console.log("🔄 AUTO-SAVE UPDATE: Updating shift:", shiftId);
  //     console.log("🔄 AUTO-SAVE UPDATE: Request body:", req.body);
      
  //     const validatedData = insertShiftSchema.parse(req.body);
  //     console.log("🔄 AUTO-SAVE UPDATE: Validated data:", validatedData);
      
  //     const shift = await storage.updateShift(shiftId, validatedData);
  //     console.log("🔄 AUTO-SAVE UPDATE: Updated shift successfully:", shift);
  //     res.json(shift);
  //   } catch (error) {
  //     console.error("🔄 AUTO-SAVE UPDATE: Error updating shift:", error);
  //     res.status(400).json({ error: "Failed to update shift" });
  //   }
  // });

  // MOVED TO MODULAR: Week schedule shift operations - now in /api/scheduler/
  // app.put("/api/week-schedules/:scheduleId/shifts/:shiftId", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const shiftId = parseInt(req.params.shiftId);
  //     const validatedData = insertShiftSchema.parse(req.body);
  //     const shift = await storage.updateShift(shiftId, validatedData);
  //     res.json(shift);
  //   } catch (error) {
  //     console.error("Error updating shift:", error);
  //     res.status(400).json({ error: "Failed to update shift" });
  //   }
  // });

  // app.delete("/api/week-schedules/:scheduleId/shifts/:shiftId", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const shiftId = parseInt(req.params.shiftId);
  //     await storage.deleteShift(shiftId);
  //     res.status(204).send();
  //   } catch (error) {
  //     console.error("Error deleting shift:", error);
  //     res.status(500).json({ error: "Failed to delete shift" });
  //   }
  // });

  // MOVED TO MODULAR: Schedule Blocks API - now in /api/scheduler/schedule-blocks
  // app.get("/api/schedule-blocks", authenticateUser, async (req, res) => {
  //   if (!hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
  //     const scheduleBlocks = await storage.getScheduleBlocks(locationId);
  //     res.json(scheduleBlocks);
  //   } catch (error) {
  //     console.error("Error fetching schedule blocks:", error);
  //     res.status(500).json({ error: "Failed to fetch schedule blocks" });
  //   }
  // });

  // app.get("/api/schedule-blocks/:id", authenticateUser, async (req, res) => {
  //   if (!hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     const scheduleBlock = await storage.getScheduleBlock(id);
  //     if (!scheduleBlock) {
  //       return res.status(404).json({ error: "Schedule block not found" });
  //     }
  //     res.json(scheduleBlock);
  //   } catch (error) {
  //     console.error("Error fetching schedule block:", error);
  //     res.status(500).json({ error: "Failed to fetch schedule block" });
  //   }
  // });

  // app.post("/api/schedule-blocks", authenticateUser, async (req, res) => {
  //   if (!hasPermission(req.user.role, "scheduler_development")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const scheduleBlock = await storage.createScheduleBlock(req.body);
  //     res.status(201).json(scheduleBlock);
  //   } catch (error) {
  //     console.error("Error creating schedule block:", error);
  //     res.status(500).json({ error: "Failed to create schedule block" });
  //   }
  // });

  // app.put("/api/schedule-blocks/:id", authenticateUser, async (req, res) => {
  //   console.log("🔧 SCHEDULE BLOCK UPDATE: User object:", req.user);
  //   console.log("🔧 SCHEDULE BLOCK UPDATE: User role:", req.user?.role);
  //   console.log("🔧 SCHEDULE BLOCK UPDATE: Permission check result:", req.user ? hasPermission(req.user.role, "scheduler_development") : false);
    
  //   if (!hasPermission(req.user.role, "scheduler_development")) {
  //     console.log("🔧 SCHEDULE BLOCK UPDATE: Permission denied");
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const id = parseInt(req.params.id);
  //     const scheduleBlock = await storage.updateScheduleBlock(id, req.body);
  //     if (!scheduleBlock) {
  //       return res.status(404).json({ error: "Schedule block not found" });
  //     }
  //     res.json(scheduleBlock);
  //   } catch (error) {
  //     console.error("Error updating schedule block:", error);
  //     res.status(500).json({ error: "Failed to update schedule block" });
  //   }
  // });

  // app.get("/api/schedule-blocks/:id/weeks", async (req, res) => {
  //   if (!req.user || !hasPermission(req.user.role, "schedule")) {
  //     return res.status(403).json({ error: "Insufficient permissions" });
  //   }

  //   try {
  //     const scheduleBlockId = parseInt(req.params.id);
  //     const weekSchedules = await storage.getWeekSchedulesByScheduleBlock(scheduleBlockId);
  //     res.json(weekSchedules);
  //   } catch (error) {
  //     console.error("Error fetching week schedules for block:", error);
  //     res.status(500).json({ error: "Failed to fetch week schedules" });
  //   }
  // });

  // Authentication consolidation endpoint to resolve browser context session isolation
  app.get("/api/auth-consolidation", async (req, res) => {
    try {
      console.log(`[AuthConsolidation] Checking authentication, session ID: ${req.sessionID}`);
      
      if (!req.user) {
        console.log(`[AuthConsolidation] No authenticated user found`);
        return res.json({ authenticated: false, user: null });
      }

      const user = req.user as any;
      const fullUser = await storage.getUser(user.id);
      
      if (!fullUser) {
        console.log(`[AuthConsolidation] User not found in database: ${user.id}`);
        return res.json({ authenticated: false, user: null });
      }

      // Get user permissions
      const { db } = await import('./db');
      const { users, roles, permissions, rolePermissions } = await import('@shared/schema');
      const { eq, sql } = await import('drizzle-orm');
      
      const userPermissionsQuery = await db
        .select({
          permissions: sql<string[]>`COALESCE(ARRAY_AGG(DISTINCT ${permissions.name}) FILTER (WHERE ${permissions.name} IS NOT NULL), ARRAY[]::text[])`
        })
        .from(users)
        .leftJoin(roles, eq(users.role, roles.name))
        .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
        .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(users.id, fullUser.id))
        .groupBy(users.id);

      const userPermissions = userPermissionsQuery.length > 0 ? userPermissionsQuery[0].permissions || [] : [];

      const authData = {
        authenticated: true,
        user: {
          id: fullUser.id,
          username: fullUser.username,
          role: fullUser.role,
          email: fullUser.email,
          firstName: fullUser.firstName,
          lastName: fullUser.lastName,
          name: fullUser.name,
          phoneNumber: fullUser.phoneNumber,
          permissions: userPermissions
        }
      };

      console.log(`[AuthConsolidation] Successfully authenticated user: ${fullUser.username}`);
      res.json(authData);
    } catch (error) {
      console.error('[AuthConsolidation] Error:', error);
      res.status(500).json({ authenticated: false, user: null, error: 'Authentication check failed' });
    }
  });



  /*
   * ===================================================================================================
   * 🔗 MODULAR ROUTE MOUNTING SECTION
   * ===================================================================================================
   * 
   * This section mounts all modular route handlers to their appropriate API prefixes.
   * Each modular route system is imported at the top of this file and connected here.
   * 
   * Pattern: app.use('/api/{module}', {module}Routes);
   * 
   * Active Modular Routes:
   * - /api/auth         → Authentication endpoints (login, logout, register)
   * - /api/uploads      → File upload handling
   * - /api/applicant    → Applicant portal functionality  
   * - /api/dashboard    → Dashboard data aggregation
   * - /api/mongodb      → MongoDB messaging operations
   * - /api/notes        → Notes and messaging
   * - /api/email        → Email configuration
   * - /api/scheduler    → Multi-week scheduling system (NEW)
   * - /api/security     → Security settings
   * 
   * Development/Monitoring Routes:
   * - /api/redis-monitor       → Redis connection status
   * - /api/mongo-monitor       → MongoDB connection status  
   * - /api/cache-monitor       → Hybrid cache status
   * - /api/session-monitor     → Session store status
   * ===================================================================================================
   */

  // Mount modular route handlers
  app.use('/api/auth', authRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/applicant', applicantPortalRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/mongodb', mongodbMessagesRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/email', emailRoutes);
  app.use('/api/scheduler', schedulerRoutes);  // 🆕 NEW: Multi-week scheduling system
  app.use('/api/validation', validationRoutes); // 🧪 NEW: Unified validation engine (testing)
  app.use('/api/security', securityRoutes);

  // Development and monitoring routes
  app.use('/api/redis-monitor', redisMonitorRoutes);
  app.use('/api/mongo-monitor', mongoMonitorRoutes);
  app.use('/api/cache-monitor', hybridCacheMonitorRoutes);
  app.use('/api/session-monitor', sessionMonitorRoutes);

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}