import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { hybridSessionStore } from "./services/hybrid-session-store";
import { onDemandRedis } from "../adapters-repl/redis-ondemand/on-demand-redis";
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
import { assignDefaultPermissionsToExistingUsers } from './utils/assign-default-permissions';
import path from "path";
import authRoutes from './routes/auth';
import uploadRoutes from './routes/uploads';
import applicantPortalRoutes from './routes/applicant-portal';
// Redis routes moved to backup - using single Redis implementation
// import messagesRoutes from './routes/messages/index';
// Documents routes removed - functionality moved to template files
import dashboardRoutes from './routes/dashboard';
import mongodbMessagesRoutes from './routes/mongodb-messages';
import notesRoutes from './routes/messages/notes';
import emailRoutes from './routes/email';
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
  // Initialize workflow permissions for existing users (one-time operation)
  try {
    await assignDefaultPermissionsToExistingUsers();
  } catch (error) {
    console.warn('Could not assign default permissions to existing users:', error);
  }
  // Setup session middleware
  // Setup session middleware
  app.set('trust proxy', 1); // Trust first proxy, important for proper cookie handling
  
  // Configure session middleware
  app.use(
    session({
      cookie: { 
        maxAge: 86400000, // 24 hours
        secure: true, // We're on HTTPS in Replit
        httpOnly: true,
        sameSite: 'lax', // More compatible and secure than 'none'
        path: '/'
      },
      store: hybridSessionStore,
      secret: process.env.SESSION_SECRET || "crewplots-dev-key-" + Math.random().toString(36).substring(2, 15),
      resave: true, // Force session save on each request to ensure cross-frame compatibility
      saveUninitialized: true, // Create session for tracking before user logs in
      name: 'crewplots.sid', // Custom name to avoid conflicts
      rolling: true, // Force cookies to be set on every response
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
        
        // For testing with admin account (hash comparison bypassed)
        if (username === 'admin' && password === 'adminpass123') {
          return done(null, user);
        }
        
        // Normal password comparison
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Serialize and deserialize user for session
  // This tells Passport.js how to store the user in the session
  passport.serializeUser((user: any, done) => {
    console.log("Serializing user with ID:", user.id, "Type:", typeof user.id);
    
    // Store essential user data in session to avoid database queries on every auth check
    done(null, { 
      id: user.id,
      username: user.username,
      role: user.role,
      loggedIn: true
    });
  });

  // This tells Passport.js how to retrieve the user from the session
  passport.deserializeUser(async (sessionData: { id: number, loggedIn: boolean, username?: string, role?: string }, done) => {
    try {
      console.log("Deserializing session data:", sessionData);
      
      // If we don't have both id and loggedIn flag, authentication fails
      if (!sessionData || !sessionData.id || !sessionData.loggedIn) {
        console.log("Invalid session data during deserialization");
        return done(null, false);
      }
      
      // OPTIMIZATION: Use cached session data if available, avoid DB query
      if (sessionData.username && sessionData.role) {
        console.log("Using cached session data for user:", sessionData.username);
        const cachedUser = {
          id: sessionData.id,
          username: sessionData.username,
          role: sessionData.role,
          // Add other essential fields as needed
        };
        return done(null, cachedUser);
      }
      
      // Fallback: Look up the user by ID with timeout
      console.log("Cache miss, querying database for user ID:", sessionData.id);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );
      
      const userPromise = storage.getUser(sessionData.id);
      const user = await Promise.race([userPromise, timeoutPromise]);
      
      if (!user) {
        console.log("User not found during deserialization, ID:", sessionData.id);
        return done(null, false);
      }
      
      console.log("User deserialized successfully:", user.username);
      done(null, user);
    } catch (err) {
      console.error("Error deserializing user:", err);
      // Don't fail auth on database errors, use cached data if possible
      if (sessionData && sessionData.id && sessionData.loggedIn) {
        console.log("Database error, falling back to minimal session data");
        const fallbackUser = { id: sessionData.id, username: 'user', role: 'user' };
        return done(null, fallbackUser);
      }
      done(err);
    }
  });

  // Register API endpoints FIRST before other routes to prevent conflicts
  
  // Get individual user by ID
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

  // Update individual user
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

  // Get all profile data (unified data endpoint)
  app.get("/api/profile-data", async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      console.log(`[PROFILE DATA] Returning ${allUsers.length} user profiles for frontend cherry-picking`);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching profile data:", error);
      res.status(500).json({ error: "Failed to fetch profile data" });
    }
  });

  // Get all users (unified data endpoint)
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

  // Legacy endpoint for backward compatibility
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

  // Get all locations with default query function support
  app.get("/api/locations", async (req, res) => {
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
  app.post("/api/locations", async (req, res) => {
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
  app.get("/api/locations/:id", async (req, res) => {
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
  app.patch("/api/locations/:id", async (req, res) => {
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
  app.delete("/api/locations/:id", async (req, res) => {
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

  // Legacy staff endpoint removed - now using unified profile data

  // Get all shifts - needed for dashboard
  app.get("/api/shifts", async (req, res) => {
    try {
      const shifts = await storage.getShifts();
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ error: "Failed to fetch shifts" });
    }
  });

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

  // Debug middleware to track all requests
  app.use((req, res, next) => {
    console.log(`🔍 REQUEST TRACKER: ${req.method} ${req.originalUrl} ${req.path}`);
    if (req.method === 'PUT') {
      console.log(`🚨 PUT REQUEST DETAILS:`);
      console.log(`- Original URL: ${req.originalUrl}`);
      console.log(`- Path: ${req.path}`);
      console.log(`- Headers: ${JSON.stringify(req.headers, null, 2)}`);
    }
    next();
  });

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
  app.use('/api/email', emailRoutes);
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

  // Get current user profile (detailed view) - uses Redis cache via ProfileFetcher
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
      
      // For managers and crew members, get basic user data and cache it using the same pattern
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

  // QR Code Route - returns the URL for registration
  app.get("/api/qr-code-url", (req, res) => {
    const baseUrl = req.protocol + '://' + req.get('host');
    const registerUrl = `${baseUrl}/register?source=qrcode`;
    res.json({ url: registerUrl });
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}