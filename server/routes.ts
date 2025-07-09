/*
 * ===================================================================================================
 * 🚨 MODULAR ROUTE ARCHITECTURE - NO FALLBACKS ALLOWED 🚨
 * ===================================================================================================
 * 
 * STRUCTURED ROUTE ORGANIZATION:
 * 
 * 1. IMPORTS & SETUP - All dependencies, utilities, middleware setup
 * 2. AUTHENTICATION & SESSION - Auth middleware, session management
 * 3. CORE API MODULES (ACTIVE) - Main ValidationEngine30 and modular routes
 * 4. FEATURE-SPECIFIC ROUTES - Location management, email, monitoring
 * 5. LEGACY ENDPOINTS (COMMENTED) - Migrated to ValidationEngine30
 * 6. SERVER SETUP - Static serving, server creation
 * 
 * ===================================================================================================
 */

// ===================================================================================================
// 1. IMPORTS & SETUP
// ===================================================================================================

import express, { type Express, Request, Response } from "express";
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

// Route module imports
import authRoutes from './routes/auth-routes';
import uploadRoutes from './routes/uploads';
import applicantPortalRoutes from './routes/applicant-portal';
import dashboardRoutes from './routes/dashboard';
import mongodbMessagesRoutes from './routes/mongodb-messages';
import notesRoutes from './routes/messages/notes';
import emailRoutes from './routes/email';
import schedulerRoutes from './routes/scheduler';
// TODO: MIGRATE TO MODULES - Remove after modules/users integration complete
import userRoutes from './routes/users';
import validationRoutes from './routes/validation';
import validationV3Routes from './routes/validation-v3';
import securityRoutes from './routes/security';
import lazyLoadingTestRoutes from './routes/lazy-loading-test';
import { OnDemandRedisService } from '../adapters-repl/redis-ondemand/on-demand-redis';

// Monitor route imports
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

// ===================================================================================================
// 2. AUTHENTICATION & SESSION SETUP
// ===================================================================================================

export async function registerRoutes(app: Express): Promise<Server> {
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

  // ===================================================================================================
  // 3. CORE API MODULES (ACTIVE)
  // ===================================================================================================

  // Primary ValidationEngine30 and modular routes
  app.use('/api/auth', authRoutes);
  app.use('/api/validation/v3', validationV3Routes);
  app.use('/api/scheduler', schedulerRoutes);
  app.use('/api', dashboardRoutes);
  
  // Messaging and content routes
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/applicant-portal', applicantPortalRoutes);
  app.use('/api/mongodb', mongodbMessagesRoutes);
  app.use('/api/messaging/notes', notesRoutes);

  // ⚠️ LEGACY MODULAR ROUTES - REPLACED BY VALIDATIONENGINE30 ⚠️
  // Original: /api/users modular routes (management, profile, workflows)
  // Replaced by: /api/validation/v3/validate with appropriate entityType
  // Migration reason: ValidationEngine30 provides unified validation + permission + hybrid storage
  // TODO: MIGRATE TO MODULES - Remove after modules/users integration complete
  // COPIED TO: server/modules/users/index.ts (July 9, 2025)
  // app.use('/api/users', userRoutes);

  // ===================================================================================================
  // 4. FEATURE-SPECIFIC ROUTES
  // ===================================================================================================

  // Settings and configuration
  app.use('/api/email', emailRoutes);
  app.use('/api/security', securityRoutes);
  
  // Test and development routes
  app.use('/api/lazy-test', lazyLoadingTestRoutes);
  
  // Monitor routes
  app.use('/api/redis-monitor', redisMonitorRoutes);
  app.use('/api/mongo-monitor', mongoMonitorRoutes);
  app.use('/api/hybrid-cache', hybridCacheMonitorRoutes);
  app.use('/api/session-monitor', sessionMonitorRoutes);

  // Location management
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
      if (!success) {
        return res.status(404).json({ error: "Location not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({ error: "Failed to delete location" });
    }
  });

  // Competency management
  app.get("/api/competencies", authenticateUser, async (req, res) => {
    try {
      const competencies = await storage.getCompetencies();
      res.json(competencies);
    } catch (error) {
      console.error("Error fetching competencies:", error);
      res.status(500).json({ error: "Failed to fetch competencies" });
    }
  });

  app.post("/api/competencies", authenticateUser, async (req, res) => {
    try {
      const competencyData = insertCompetencySchema.parse(req.body);
      const newCompetency = await storage.createCompetency(competencyData);
      res.status(201).json(newCompetency);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.toString() });
      }
      console.error("Error creating competency:", error);
      res.status(500).json({ error: "Failed to create competency" });
    }
  });

  // User-location assignments
  app.get("/api/user-locations", authenticateUser, async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
      
      const userLocations = await storage.getUserLocations(userId, locationId);
      res.json(userLocations);
    } catch (error) {
      console.error("Error fetching user locations:", error);
      res.status(500).json({ error: "Failed to fetch user locations" });
    }
  });

  app.post("/api/user-locations", authenticateUser, async (req, res) => {
    try {
      const userLocationData = insertUserLocationSchema.parse(req.body);
      const newUserLocation = await storage.createUserLocation(userLocationData);
      res.status(201).json(newUserLocation);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.toString() });
      }
      console.error("Error creating user location:", error);
      res.status(500).json({ error: "Failed to create user location" });
    }
  });

  app.put("/api/user-locations/:id", authenticateUser, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updatedUserLocation = await storage.updateUserLocation(id, updates);
      res.json(updatedUserLocation);
    } catch (error) {
      console.error("Error updating user location:", error);
      res.status(500).json({ error: "Failed to update user location" });
    }
  });

  app.delete("/api/user-locations/:id", authenticateUser, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUserLocation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user location:", error);
      res.status(500).json({ error: "Failed to delete user location" });
    }
  });

  // Update applicant workflow
  app.patch("/api/applicant/:id", authenticateUser, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const updates = req.body;
      console.log(`[APPLICANT API] Updating applicant ${id} with:`, updates);

      const updatedUser = await storage.updateUser(id, updates);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating applicant:", error);
      res.status(500).json({ error: "Failed to update applicant" });
    }
  });

  // Get applicants by status - for legacy compatibility
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

  // QR Code Route - returns the URL for registration
  app.get("/api/qr-code-url", (req, res) => {
    const baseUrl = req.protocol + '://' + req.get('host');
    const registerUrl = `${baseUrl}/register?source=qrcode`;
    res.json({ url: registerUrl });
  });

  // ===================================================================================================
  // 5. LEGACY ENDPOINTS (COMMENTED) - REPLACED BY VALIDATIONENGINE30
  // ===================================================================================================

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

  // ===================================================================================================
  // 6. SERVER SETUP
  // ===================================================================================================

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}