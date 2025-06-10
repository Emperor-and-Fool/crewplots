import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

interface AuthenticatedUser {
    id: number;
    username: string;
    role: string;
    email?: string;
    name?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
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
        console.log("Auth middleware - Checking authentication");
        console.log("Auth middleware - isAuthenticated:", req.isAuthenticated());
        console.log("Auth middleware - Session:", req.session);
        console.log("Auth middleware - User:", req.user ? `Found: ${(req.user as any).username}` : 'None');
        
        // When using passport, we can simply use isAuthenticated() method
        if (!req.isAuthenticated()) {
            console.log("Not authenticated with Passport");
            res.status(401).json({ message: "Unauthorized - Please log in" });
            return;
        }

        // Passport already attaches the user to req.user
        // We just need to verify it's valid
        const user = req.user as any;
        if (!user || !user.id) {
            console.log("Invalid user object in session");
            req.logout((err) => {
                if (err) {
                    console.error("Error logging out:", err);
                }
            });
            res.status(401).json({ message: "Invalid session - Please log in again" });
            return;
        }

        console.log("User authenticated successfully:", (req.user as any).username);
        // User is already attached to the request by Passport
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