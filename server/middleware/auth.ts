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
    }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        console.log("Auth middleware - Checking session authentication");
        console.log("Auth middleware - Session ID:", req.sessionID || 'none');
        console.log("Auth middleware - Session data:", req.session);
        
        // Check if user is logged in via session (our current working approach)
        if (!req.session?.userId || !req.session?.loggedIn) {
            console.log("No active session found");
            res.status(401).json({ message: "Unauthorized - Please log in" });
            return;
        }

        // Get user from storage using session userId
        const user = await storage.getUser(req.session.userId);
        if (!user) {
            console.log("User not found for session userId:", req.session.userId);
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
        next();
    } catch (error) {
        console.error("Authentication error:", error);
        res.status(500).json({ message: "Authentication error" });
    }
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