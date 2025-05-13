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
        userId: number;
        loggedIn: boolean;
    }
}

export const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        console.log('Authentication middleware - session:', req.session);
        console.log('Authentication middleware - userId:', req.session.userId, 'loggedIn:', req.session.loggedIn);
        
        if (!req.session.userId || !req.session.loggedIn) {
            console.log('Authentication failed - Missing userId or loggedIn flag');
            res.status(401).json({ message: "Unauthorized - Please log in" });
            return;
        }

        const user = await storage.getUser(req.session.userId);
        console.log('Authentication middleware - Found user:', !!user);
        
        if (!user) {
            console.log('Authentication failed - User not found in database');
            req.session.destroy((err) => {
                if (err) {
                    console.error("Error destroying session:", err);
                }
            });
            res.status(401).json({ message: "Invalid session - Please log in again" });
            return;
        }

        // Attach the user to the request
        req.user = user;
        console.log('Authentication successful for user:', user.username);
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

            if (!allowedRoles.includes(req.user.role)) {
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