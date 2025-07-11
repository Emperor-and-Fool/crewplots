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
import { authenticateUser } from './middleware/auth';
import path from "path";

// Route module imports
import authRoutes from './routes/auth-routes';
import uploadRoutes from './routes/uploads';
import applicantPortalRoutes from './routes/applicant-portal';
import dashboardRoutes from './routes/dashboard';
import mongodbMessagesRoutes from './routes/mongodb-messages';
import { notesRoutes } from './modules/messaging';
import emailRoutes from './routes/email';
import schedulerRoutes from './modules/scheduler';

import validationV3Routes from './routes/validation-v3';
import securityRoutes from './routes/security';
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

  // Setup session middleware - RESTRICTED TO API ROUTES ONLY
  app.set('trust proxy', 1); // Trust first proxy, important for proper cookie handling
  
  // Create session middleware instance
  const sessionMiddleware = session({
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
  });
  
  // Apply session middleware ONLY to API routes - prevents Redis flooding from static files
  app.use('/api', sessionMiddleware);



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



  // ===================================================================================================
  // 4. FEATURE-SPECIFIC ROUTES
  // ===================================================================================================

  // Settings and configuration
  app.use('/api/email', emailRoutes);
  app.use('/api/security', securityRoutes);
  

  
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
  // 6. SERVER SETUP
  // ===================================================================================================

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}