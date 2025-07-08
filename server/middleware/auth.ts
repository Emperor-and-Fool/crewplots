import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { User } from "@shared/schema";

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

declare module 'express-session' {
    interface SessionData {
        userId?: number;
        loggedIn?: boolean;
        passport?: {
            user: {
                id: number;
                username: string;
                role: string;
                loggedIn: boolean;
            }
        };
    }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Log authentication method usage for API routes - at entry point
        if (req.path.startsWith('/api/')) {
            console.log(`✅ INFO: authenticateUser middleware entered for ${req.method} ${req.path}`);
        }
        
        // Mark this request as using centralized authentication
        (req as any).usedCentralizedAuth = true;
        
        // REMOVED BROKEN FAST-PATH: This was checking session before session middleware populated it
        // Fast-path was causing immediate 401 responses before session store could load session data
        // Session middleware needs time to populate req.session from database/Redis
        
        console.log("Auth middleware - Checking session authentication");
        console.log("Auth middleware - Session ID:", req.sessionID || 'none');
        console.log("Auth middleware - Session data:", req.session);
        
        // Check if user is logged in via Passport session
        console.log("Auth middleware - req.session exists:", !!req.session);
        console.log("Auth middleware - req.session.passport exists:", !!(req.session && req.session.passport));
        console.log("Auth middleware - req.session.passport.user exists:", !!(req.session && req.session.passport && req.session.passport.user));
        
        if (!req.session?.passport?.user) {
            console.log("No active session found - no passport.user");
            res.status(401).json({ message: "Unauthorized - Please log in" });
            return;
        }

        // Get user from storage using session userId
        const sessionUser = req.session.passport.user;
        console.log("Found session user:", sessionUser);
        
        const user = await storage.getUser(sessionUser.id);
        if (!user) {
            console.log("User not found for session userId:", sessionUser.id);
            // Clear invalid session
            req.session.destroy((err) => {
                if (err) {
                    console.error("Error destroying session:", err);
                }
            });
            res.status(401).json({ message: "Invalid session - Please log in again" });
            return;
        }

        // WORKFLOW PERMISSIONS FIX: Get complete user profile with workflow permissions
        // This ensures DataAggregationEngine has all required permission data
        const userWithWorkflowPermissions = await storage.getUserWithProfile(user.id);
        
        // Attach enhanced user to request for use in route handlers
        req.user = userWithWorkflowPermissions || user;
        (req as any).usedCentralizedAuth = true; // Mark route as using centralized auth
        console.log("User authenticated successfully:", user.username, "Role:", user.role);
        
        // Log successful session validation for API routes
        if (req.path.startsWith('/api/')) {
            console.log(`✅ SUCCESS: Session validated for ${req.method} ${req.path} - User: ${user.username} (${user.role})`);
        }
        
        next();
    } catch (error) {
        console.error("Authentication error:", error);
        res.status(500).json({ message: "Authentication error" });
    }
};

// Legacy authentication detection middleware - runs on ALL routes
export const detectLegacyAuth = (req: Request, res: Response, next: NextFunction): void => {
    // Only monitor API routes
    if (!req.path.startsWith('/api/')) {
        return next();
    }

    // Track route execution to detect legacy patterns
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
        // Check if this was a successful API response that accessed user data
        if (res.statusCode === 200 || res.statusCode === 304) {
            // If route succeeded but didn't use centralized auth, it's legacy
            if (!(req as any).usedCentralizedAuth && req.user) {
                console.log(`⚠️ LEGACY AUTH: Route ${req.method} ${req.path} using direct req.user check`);
                console.log(`⚠️ LEGACY AUTH: Missing authenticateUser middleware on protected route`);
            }
        }
        
        // Restore original end function and call it
        res.end = originalEnd;
        return originalEnd.call(this, chunk, encoding);
    };

    next();
};

// Lazy Loading Authentication Middleware (Plan 052 Phase 2)
export const authenticateUserLazy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Log authentication method usage for API routes - at entry point
        if (req.path.startsWith('/api/')) {
            console.log(`🚀 LAZY AUTH: authenticateUserLazy middleware entered for ${req.method} ${req.path}`);
        }
        
        // Mark this request as using lazy centralized authentication
        (req as any).usedLazyAuth = true;
        
        // Fast-path: Skip expensive processing for obviously empty sessions
        if (!req.session || !req.session.passport) {
            console.log("🚀 LAZY AUTH: Fast-path - No session or passport data found");
            res.status(401).json({ message: "Unauthorized - Please log in" });
            return;
        }
        
        // Extract user ID from Passport session data
        const passportUser = req.session.passport.user;
        if (!passportUser || !passportUser.id) {
            console.log("🚀 LAZY AUTH: Missing passport user data");
            res.status(401).json({ message: "Unauthorized - Invalid session" });
            return;
        }
        
        const userId = passportUser.id;
        console.log(`🚀 LAZY AUTH: Extracting user ID: ${userId}`);
        
        // Lazy Loading: Get user with workflows only (minimal load)
        const userWithWorkflows = await storage.getUserWithWorkflows(userId);
        
        // Create minimal user object for req.user (avoiding full getUserWithProfile)
        const minimalUser: User = {
            id: userWithWorkflows.id,
            username: userWithWorkflows.username,
            role: userWithWorkflows.role,
            public_id: userWithWorkflows.public_id,
            email: userWithWorkflows.email,
            firstName: userWithWorkflows.firstName,
            lastName: userWithWorkflows.lastName,
            name: userWithWorkflows.name,
            locationId: userWithWorkflows.locationId,
            phoneNumber: userWithWorkflows.phoneNumber,
            status: userWithWorkflows.status,
            resumeUrl: userWithWorkflows.resumeUrl,
            createdAt: userWithWorkflows.createdAt,
            notes: userWithWorkflows.notes,
            workflowPermissions: userWithWorkflows.workflowPermissions,
            blockedPermissions: userWithWorkflows.blockedPermissions
        };
        
        // Attach user with discovered workflows to request
        req.user = minimalUser;
        (req as any).userWorkflows = userWithWorkflows.workflows; // Store workflow list for on-demand loading
        (req as any).usedLazyAuth = true; // Mark route as using lazy auth
        
        console.log(`🚀 LAZY AUTH: User authenticated with ${userWithWorkflows.workflows.length} workflows:`, userWithWorkflows.workflows);
        console.log(`🚀 LAZY AUTH: User: ${minimalUser.username} (${minimalUser.role})`);
        
        // Log successful session validation for API routes
        if (req.path.startsWith('/api/')) {
            console.log(`✅ LAZY SUCCESS: Session validated for ${req.method} ${req.path} - User: ${minimalUser.username} (${minimalUser.role})`);
        }
        
        next();
    } catch (error) {
        console.error("🚀 LAZY AUTH ERROR:", error);
        res.status(500).json({ message: "Authentication error" });
    }
};

// On-demand permission loading helpers (Plan 052 Phase 2)
export const loadUserModulePermissions = async (req: Request): Promise<any> => {
    if (!req.user?.id) throw new Error("User not authenticated");
    return await storage.getUsersUsermodPerm(req.user.id);
};

export const loadSchedulerModulePermissions = async (req: Request): Promise<any> => {
    if (!req.user?.id) throw new Error("User not authenticated");
    return await storage.getUsersSchedmodPerm(req.user.id);
};

export const loadLocationModulePermissions = async (req: Request): Promise<any> => {
    if (!req.user?.id) throw new Error("User not authenticated");
    return await storage.getUsersLocationPerm(req.user.id);
};

export const checkRole = (allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Unauthorized - Please log in" });
                return;
            }

            if (!allowedRoles.includes((req.user as any).role)) {
                res.status(403).json({ message: "Forbidden - Insufficient permissions" });
                return;
            }

            next();
        } catch (error) {
            console.error("Authorization error:", error);
            res.status(500).json({ message: "Authorization error" });
        }
    };
};