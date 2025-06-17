import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./database/storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

import { RedisStore } from "connect-redis";
import Redis from "ioredis";
import { pool } from "./database/db";
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
import mongodbDirectRoutes from '../DevOpUtils/test-routes/mongodb-direct';
import notesRoutes from './routes/notes';

import cacheTestRoutes from '../DevOpUtils/test-routes/cache-test';
import redisTestRoutes from '../DevOpUtils/test-routes/redis-test';
import redisMonitorRoutes from '../DevOpUtils/test-routes/redis-monitor';
import { onDemandRedis } from '../adapters-repl/redis-ondemand/on-demand-service';

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});



// Complete Redis client interface for connect-redis compatibility
class OnDemandRedisClient {
  private static instance: OnDemandRedisClient;
  
  static getInstance(): OnDemandRedisClient {
    if (!OnDemandRedisClient.instance) {
      OnDemandRedisClient.instance = new OnDemandRedisClient();
    }
    return OnDemandRedisClient.instance;
  }

  // Basic Redis operations
  async get(key: string): Promise<string | null> {
    try {
      const result = await onDemandRedis.withConnection(async (redis: any) => {
        return await redis.get(key);
      }, { connectionId: 'session-get', keepAlive: 5000 });
      
      return result;
    } catch (error) {
      console.error('❌ Redis GET failed:', error);
      return null;
    }
  }

  async set(key: string, value: string, options?: any): Promise<string> {
    console.log('🔧 Redis SET called:', { key: key.substring(0, 20) + '...', valueLength: value.length, options });
    try {
      await onDemandRedis.withConnection(async (redis: any) => {
        if (options && options.expiration && options.expiration.type === 'EX') {
          console.log('🔧 Using SETEX with TTL:', options.expiration.value);
          await redis.setex(key, options.expiration.value, value);
        } else if (options && options.EX) {
          console.log('🔧 Using SETEX with EX:', options.EX);
          await redis.setex(key, options.EX, value);
        } else {
          console.log('🔧 Using basic SET');
          await redis.set(key, value);
        }
      }, { connectionId: 'session-set', keepAlive: 5000 });
      
      console.log('✅ Redis SET completed successfully');
      return 'OK';
    } catch (error) {
      console.error('❌ Redis SET failed:', error);
      throw error;
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<string> {
    try {
      await onDemandRedis.withConnection(async (redis: any) => {
        await redis.setex(key, ttl, value);
      }, { connectionId: 'session-set', keepAlive: 5000 });
      
      return 'OK';
    } catch (error) {
      console.error('❌ Redis SETEX failed:', error);
      throw error;
    }
  }

  async del(...keys: string[]): Promise<number> {
    try {
      const result = await onDemandRedis.withConnection(async (redis: any) => {
        return await redis.del(...keys);
      }, { connectionId: 'session-delete', keepAlive: 5000 });
      
      return result;
    } catch (error) {
      console.error('❌ Redis DEL failed:', error);
      return 0;
    }
  }

  // Multi-get operation
  async mget(...keys: string[]): Promise<(string | null)[]> {
    try {
      const result = await onDemandRedis.withConnection(async (redis: any) => {
        return await redis.mget(...keys);
      }, { connectionId: 'session-mget', keepAlive: 5000 });
      
      return result || [];
    } catch (error) {
      console.error('❌ Redis MGET failed:', error);
      return new Array(keys.length).fill(null);
    }
  }

  // Key existence check
  async exists(...keys: string[]): Promise<number> {
    try {
      const result = await onDemandRedis.withConnection(async (redis: any) => {
        return await redis.exists(...keys);
      }, { connectionId: 'session-exists', keepAlive: 5000 });
      
      return result || 0;
    } catch (error) {
      console.error('❌ Redis EXISTS failed:', error);
      return 0;
    }
  }

  // Time-to-live operations
  async ttl(key: string): Promise<number> {
    try {
      const result = await onDemandRedis.withConnection(async (redis: any) => {
        return await redis.ttl(key);
      }, { connectionId: 'session-ttl', keepAlive: 5000 });
      
      return result || -1;
    } catch (error) {
      console.error('❌ Redis TTL failed:', error);
      return -1;
    }
  }

  async pttl(key: string): Promise<number> {
    try {
      const result = await onDemandRedis.withConnection(async (redis: any) => {
        return await redis.pttl(key);
      }, { connectionId: 'session-pttl', keepAlive: 5000 });
      
      return result || -1;
    } catch (error) {
      console.error('❌ Redis PTTL failed:', error);
      return -1;
    }
  }

  // Expiry operations
  async expire(key: string, seconds: number): Promise<number> {
    try {
      const result = await onDemandRedis.withConnection(async (redis: any) => {
        return await redis.expire(key, seconds);
      }, { connectionId: 'session-expire', keepAlive: 5000 });
      
      return result || 0;
    } catch (error) {
      console.error('❌ Redis EXPIRE failed:', error);
      return 0;
    }
  }

  async pexpire(key: string, milliseconds: number): Promise<number> {
    try {
      const result = await onDemandRedis.withConnection(async (redis: any) => {
        return await redis.pexpire(key, milliseconds);
      }, { connectionId: 'session-pexpire', keepAlive: 5000 });
      
      return result || 0;
    } catch (error) {
      console.error('❌ Redis PEXPIRE failed:', error);
      return 0;
    }
  }

  // connect-redis specific methods
  async destroy(key: string): Promise<number> {
    return this.del(key);
  }

  async touch(key: string, ttl: number): Promise<number> {
    return this.expire(key, ttl);
  }

  // Event emitter interface (required by connect-redis)
  on(event: string, listener: (...args: any[]) => void): this { 
    // No-op for our implementation
    return this; 
  }
  
  emit(event: string, ...args: any[]): boolean { 
    // No-op for our implementation
    return true; 
  }
  
  removeAllListeners(event?: string): this { 
    // No-op for our implementation
    return this; 
  }
  
  // Connection lifecycle methods
  async quit(): Promise<string> { 
    // On-demand service handles connection cleanup
    return 'OK'; 
  }
  
  async disconnect(): Promise<void> { 
    // On-demand service handles connection cleanup
    return; 
  }

  // Connection status (for connect-redis health checks)
  get status(): string {
    return 'ready';
  }
}

const redisClient = OnDemandRedisClient.getInstance();

// Suppress Redis connection error spam by overriding global error handler
process.on('uncaughtException', (error) => {
  if (error.message && error.message.includes('connect ECONNREFUSED 127.0.0.1:6379')) {
    // Silently ignore Redis connection errors from the unused redis client
    return;
  }
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  if (reason && typeof reason === 'object' && 'message' in reason && 
      typeof reason.message === 'string' && reason.message.includes('connect ECONNREFUSED 127.0.0.1:6379')) {
    // Silently ignore Redis connection errors from the unused redis client
    return;
  }
  console.error('Unhandled Rejection:', reason);
});



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
        client: redisClient as any,
        prefix: 'sess:',
        ttl: 86400, // 24 hours
        serializer: {
          stringify: JSON.stringify,
          parse: JSON.parse
        },
        disableTouch: true,
        disableTTL: true
      }),
      secret: process.env.SESSION_SECRET || "crewplots-dev-key-" + Math.random().toString(36).substring(2, 15),
      resave: false, // Don't save session if unmodified - reduces Redis load
      saveUninitialized: false, // Don't create session until something stored
      name: 'crewplots.sid', // Custom name to avoid conflicts
      rolling: false // Don't reset cookie on every request
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
  app.use('/api/mongodb', mongodbDirectRoutes);
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