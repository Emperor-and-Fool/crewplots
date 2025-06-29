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

        // Attach user to request for use in route handlers
        req.user = user;
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