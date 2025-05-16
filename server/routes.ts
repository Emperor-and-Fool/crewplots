/**
 * API Routes Configuration Module
 * 
 * This module sets up all Express routes, authentication middleware,
 * session handling, and HTTP server configuration for the application.
 * 
 * Key responsibilities:
 * - Configure passport local authentication strategy
 * - Setup session middleware with Redis
 * - Register route modules for different API endpoints
 * - Create and configure HTTP server
 */

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import multer from "multer";
import path from "path";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  insertUserSchema, insertLocationSchema, insertCompetencySchema, 
  insertStaffSchema, insertStaffCompetencySchema, insertApplicantSchema,
  insertScheduleTemplateSchema, insertTemplateShiftSchema, insertWeeklyScheduleSchema,
  insertShiftSchema, insertCashCountSchema, insertKbCategorySchema, insertKbArticleSchema,
  loginSchema, registerSchema
} from "@shared/schema";
import { pool } from "./db";
// Temporarily using PostgreSQL sessions until Redis is properly configured
import { sessionOptions } from "./pg-session";
import authRoutes from './routes/auth';
import uploadRoutes from './routes/uploads';
import applicantPortalRoutes from './routes/applicant-portal';

/**
 * File upload middleware configuration using multer
 * - Uses in-memory storage to avoid filesystem dependencies
 * - Limits file size to 5MB to prevent abuse
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Main route registration function that configures all API endpoints
 * and middleware for the Express application
 * 
 * @param app - Express application instance
 * @returns HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  /**
   * Session and Authentication Configuration
   */
  
  // Trust the first proxy in the chain (necessary for proper cookie handling in HTTPS environments)
  app.set('trust proxy', 1); 
  
  // Configure session middleware with Redis store for persistent sessions
  app.use(session(sessionOptions));

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  /**
   * Local Authentication Strategy Configuration
   * 
   * This strategy authenticates users based on username and password
   * with a fallback for the admin test account
   */
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Find user by username
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        
        // Special case for admin account (password check bypassed)
        // Only for testing/development - simplifies admin access
        if (username === 'admin' && password === 'adminpass123') {
          return done(null, user);
        }
        
        // Standard password verification using bcrypt
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        
        // Authentication successful
        return done(null, user);
      } catch (err) {
        // Pass any errors to the callback
        return done(err);
      }
    })
  );

  /**
   * Session Serialization/Deserialization
   * 
   * These functions determine how Passport stores and retrieves user data
   * from the session store (Redis)
   */
  
  // Store user info in session (called during login)
  passport.serializeUser((user: any, done) => {
    console.log("Serializing user with ID:", user.id, "Type:", typeof user.id);
    
    // Store both the user ID and a loggedIn flag for more robust authentication checks
    done(null, { 
      id: user.id,
      loggedIn: true
    });
  });

  // Retrieve user from session data (called for each authenticated request)
  passport.deserializeUser(async (sessionData: { id: number, loggedIn: boolean }, done) => {
    try {
      console.log("Deserializing session data:", sessionData);
      
      // Verify session contains valid authentication data
      if (!sessionData || !sessionData.id || !sessionData.loggedIn) {
        console.log("Invalid session data during deserialization");
        return done(null, false);
      }
      
      // Retrieve the full user object from storage
      const user = await storage.getUser(sessionData.id);
      if (!user) {
        console.log("User not found during deserialization, ID:", sessionData.id);
        return done(null, false);
      }
      
      console.log("User deserialized successfully:", user.username);
      done(null, user);
    } catch (err) {
      // Log and pass along any errors
      console.error("Error deserializing user:", err);
      done(err);
    }
  });

  /**
   * Route Module Registration
   * 
   * Registers modular route handlers for different API sections
   */
  app.use('/api/auth', authRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/applicant-portal', applicantPortalRoutes);

  /**
   * Standalone API Routes
   */
  
  // QR Code Registration URL Generator
  // Used for applicant enrollment via QR code
  app.get("/api/qr-code-url", (req, res) => {
    const baseUrl = req.protocol + '://' + req.get('host');
    const registerUrl = `${baseUrl}/register?source=qrcode`;
    res.json({ url: registerUrl });
  });
  
  // Applicant listing endpoint
  // Returns all applicants for admin/management interfaces
  app.get("/api/applicants", async (req, res) => {
    try {
      const applicants = await storage.getApplicants();
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      res.status(500).json({ error: "Failed to fetch applicants" });
    }
  });

  /**
   * HTTP Server Creation
   * 
   * Creates a standard HTTP server using the configured Express app
   */
  const httpServer = createServer(app);

  return httpServer;
}