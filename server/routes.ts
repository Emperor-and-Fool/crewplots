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
import authRoutes from './routes/auth';
import uploadRoutes from './routes/uploads';

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
      cookie: { 
        maxAge: 86400000, // 24 hours
        secure: false, // Must be false for non-HTTPS development environments
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
      },
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: true, // Changed to true to ensure session is saved back to store
      saveUninitialized: true, // Changed to true to create session by default
      secret: "shiftpro-secret-key",
      name: 'connect.sid', // Using default name for better compatibility
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
  passport.serializeUser((user: any, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log("User not found during deserialization");
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