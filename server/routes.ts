import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
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
import authRoutes from './routes/auth';
import uploadRoutes from './routes/uploads';
import applicantPortalRoutes from './routes/applicant-portal';
// Redis routes moved to backup - using single Redis implementation
import messagesRoutes from './routes/messages/index';
// Documents routes removed - functionality moved to template files
import dashboardRoutes from './routes/dashboard';
import mongodbMessagesRoutes from './routes/mongodb-messages';
import notesRoutes from './routes/notes';

import cacheTestRoutes from './routes/cache-test';
import redisTestRoutes from './routes/redis-test';
import redisMonitorRoutes from './routes/redis-monitor';
import { onDemandRedis } from '../adapters-repl/redis-ondemand/on-demand-service';

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Setup session stores
const PgStore = connectPgSimple(session);
const RedisStore = connectRedis(session);

// Redis session store adapter
class RedisSessionStore {
  async getSession(sessionId: string): Promise<any> {
    try {
      const result = await onDemandRedis.withConnection(async (redis: any) => {
        const sessionData = await redis.get(`sess:${sessionId}`);
        return sessionData ? JSON.parse(sessionData) : null;
      }, { connectionId: 'session-get', keepAlive: 5000 });
      
      return result;
    } catch (error) {
      console.error('❌ Redis session get failed:', error);
      throw new Error(`Session store unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async setSession(sessionId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    try {
      await onDemandRedis.withConnection(async (redis) => {
        await redis.setex(`sess:${sessionId}`, ttl, JSON.stringify(sessionData));
      }, { connectionId: 'session-set', keepAlive: 5000 });
      
      console.log(`✅ Session stored in Redis: ${sessionId}`);
    } catch (error) {
      console.error('❌ Redis session set failed:', error);
      throw new Error(`Session store unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await onDemandRedis.withConnection(async (redis: any) => {
        await redis.del(`sess:${sessionId}`);
      }, { connectionId: 'session-delete', keepAlive: 5000 });
      
      console.log(`✅ Session deleted from Redis: ${sessionId}`);
    } catch (error) {
      console.error('❌ Redis session delete failed:', error);
      throw new Error(`Session store unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

const redisSessionStore = new RedisSessionStore();

export async function registerRoutes(app: Express): Promise<Server> {
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
      store: new RedisStore({
        client: {
          get: (key: string, callback: (err: any, result?: string) => void) => {
            console.log(`🔍 Redis session GET: ${key}`);
            const sessionId = key.replace('sess:', '');
            redisSessionStore.getSession(sessionId)
              .then(result => callback(null, result ? JSON.stringify(result) : null))
              .catch(err => callback(err));
          },
          set: (key: string, value: string, callback: (err?: any) => void) => {
            console.log(`💾 Redis session SET: ${key}`);
            const sessionId = key.replace('sess:', '');
            const sessionData = JSON.parse(value);
            redisSessionStore.setSession(sessionId, sessionData)
              .then(() => callback())
              .catch(err => callback(err));
          },
          del: (key: string, callback: (err?: any) => void) => {
            console.log(`🗑️ Redis session DELETE: ${key}`);
            const sessionId = key.replace('sess:', '');
            redisSessionStore.deleteSession(sessionId)
              .then(() => callback())
              .catch(err => callback(err));
          },
          // Required Redis client interface methods
          on: () => {},
          emit: () => {},
          end: () => {},
          quit: () => Promise.resolve()
        }
      }),
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
  
  // Get individual applicant by ID
  app.get("/api/applicants/:id", async (req, res) => {
    console.log("Individual applicant endpoint hit with ID:", req.params.id);
    try {
      const applicantId = parseInt(req.params.id);
      if (isNaN(applicantId)) {
        console.log("Invalid applicant ID:", req.params.id);
        return res.status(400).json({ error: "Invalid applicant ID" });
      }
      
      console.log("Fetching applicant with ID:", applicantId);
      const applicant = await storage.getApplicant(applicantId);
      console.log("Database result:", applicant ? "Found" : "Not found");
      
      if (!applicant) {
        return res.status(404).json({ error: "Applicant not found" });
      }
      
      res.json(applicant);
    } catch (error) {
      console.error("Error fetching applicant:", error);
      res.status(500).json({ error: "Failed to fetch applicant" });
    }
  });

  // Update individual applicant
  app.patch("/api/applicants/:id", async (req, res) => {
    try {
      const applicantId = parseInt(req.params.id);
      if (isNaN(applicantId)) {
        return res.status(400).json({ error: "Invalid applicant ID" });
      }
      
      const updateData = req.body;
      console.log(`Updating applicant ${applicantId} with data:`, updateData);
      
      const updatedApplicant = await storage.updateApplicant(applicantId, updateData);
      if (updatedApplicant) {
        res.json(updatedApplicant);
      } else {
        res.status(404).json({ error: "Applicant not found" });
      }
    } catch (error) {
      console.error("Error updating applicant:", error);
      res.status(500).json({ error: "Failed to update applicant" });
    }
  });

  // Get all applicants
  app.get("/api/applicants", async (req, res) => {
    try {
      const applicants = await storage.getApplicants();
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      res.status(500).json({ error: "Failed to fetch applicants" });
    }
  });

  // Get all locations
  app.get("/api/locations", async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
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
  app.use('/api/messages', messagesRoutes);
  // Documents routes disabled - functionality moved to template files
  // app.use('/api/documents', documentsRoutes);
  app.use('/api/mongodb', mongodbMessagesRoutes);
  app.use('/api/messaging/notes', notesRoutes);

  app.use('/api', cacheTestRoutes);
  app.use('/api', dashboardRoutes);
  app.use('/api/redis-test', redisTestRoutes);
  app.use('/api/redis-monitor', redisMonitorRoutes);

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