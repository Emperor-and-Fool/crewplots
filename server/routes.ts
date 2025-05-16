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
  // Setup session middleware
  app.set('trust proxy', 1); // Trust first proxy, important for proper cookie handling
  
  // Configure session middleware
  app.use(
    session({
      cookie: { 
        maxAge: 86400000, // 24 hours
        secure: true, // We're on HTTPS in Replit
        httpOnly: true,
        sameSite: 'lax', // Changed to lax for same-origin deployments
        path: '/',
        // Removed domain setting completely to ensure host-only cookie
      },
      store: new PgStore({
        pool: pool,
        tableName: 'sessions',
        createTableIfMissing: true, // Auto-create the table
        ttl: 86400000, // 24 hours - same as cookie maxAge
        pruneSessionInterval: 60 // Clean old sessions every minute
      }),
      secret: process.env.SESSION_SECRET || "crewplots-dev-key-" + Math.random().toString(36).substring(2, 15),
      resave: false, // Don't save session if unmodified
      saveUninitialized: false, // Don't create session until something stored
      name: 'crewplots.sid', // Custom name to avoid conflicts
      rolling: true, // Force cookies to be set on every response
    })
  );

  // Add guard against duplicate session cookies
  app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie || '';
    const sidMatches = (cookieHeader.match(/crewplots\.sid=/g) || []).length;
    if (sidMatches > 1) {
      console.warn('⚠️ Multiple session cookies detected:', cookieHeader);
    }
    next();
  });

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
    
    // In Express session, store both the user ID and a flag to indicate the user is logged in
    // This simplifies our auth check logic
    done(null, { 
      id: user.id,
      loggedIn: true
    });
  });

  // This tells Passport.js how to retrieve the user from the session
  passport.deserializeUser(async (sessionData: { id: number, loggedIn: boolean }, done) => {
    try {
      console.log("Deserializing session data:", sessionData);
      
      // If we don't have both id and loggedIn flag, authentication fails
      if (!sessionData || !sessionData.id || !sessionData.loggedIn) {
        console.log("Invalid session data during deserialization");
        return done(null, false);
      }
      
      // Look up the user by ID
      const user = await storage.getUser(sessionData.id);
      if (!user) {
        console.log("User not found during deserialization, ID:", sessionData.id);
        return done(null, false);
      }
      
      console.log("User deserialized successfully:", user.username);
      done(null, user);
    } catch (err) {
      console.error("Error deserializing user:", err);
      done(err);
    }
  });



  // Use route modules
  app.use('/api/auth', authRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/applicant-portal', applicantPortalRoutes);

  // QR Code Route - returns the URL for registration
  app.get("/api/qr-code-url", (req, res) => {
    const baseUrl = req.protocol + '://' + req.get('host');
    const registerUrl = `${baseUrl}/register?source=qrcode`;
    res.json({ url: registerUrl });
  });
  
  // Test route for getting all applicants (for testing purposes)
  app.get("/api/applicants", async (req, res) => {
    try {
      const applicants = await storage.getApplicants();
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      res.status(500).json({ error: "Failed to fetch applicants" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}