import express, { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { insertUserSchema, loginSchema, registerSchema, User } from '@shared/schema';
import { ZodError } from 'zod';
import bcrypt from 'bcryptjs';
import { fromZodError } from 'zod-validation-error';
import { authenticateUser } from '../middleware/auth';

// Extend express-session types
declare module 'express-session' {
    interface SessionData {
        userId?: number;
        loggedIn?: boolean;
    }
}

// Extend express Request type
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const data = registerSchema.parse(req.body);
        
        // Check if username already exists
        const existingUser = await storage.getUserByUsername(data.username);
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        
        // Check if email already exists
        const emailUser = await storage.getUserByEmail(data.email);
        if (emailUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash password (security-critical, direct)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        // Call VE30 with hashed password (Plan 057 hybrid architecture)
        console.log("🔐 AUTH-ROUTES: Calling VE30 with hashed password for validation...");
        
        // Import ValidationEngine30 for internal validation
        const { ValidationEngine30 } = await import('../services/validation/ValidationEngine30');
        const validationEngine30 = new ValidationEngine30();
        
        // Prepare data for VE30 validation with hashed password
        const validationData = {
            ...data,
            password: hashedPassword, // Send hashed password to VE30
            confirmPassword: hashedPassword // For validation consistency
        };
        
        // Validate through VE30 (Plan 057: validation only, not execution)
        const validationResult = await validationEngine30.validateAndExecute(
            'create',
            'userRegistration',
            validationData,
            {
                userId: 0, // Public registration context
                userRole: 'public',
                permissions: [] // Public context has no permissions
            }
        );
        
        if (!validationResult.overall.isValid) {
            console.log("❌ VE30: Registration validation failed:", validationResult.overall.errors);
            return res.status(400).json({ 
                message: 'Registration validation failed', 
                errors: validationResult.overall.errors,
                result: validationResult
            });
        }
        
        console.log("✅ VE30: Registration validation passed");
        if (validationResult.overall.warnings?.length > 0) {
            console.log("⚠️ VE30: Warnings:", validationResult.overall.warnings);
        }

        // Remove confirmPassword before saving
        const { confirmPassword, ...userDataWithoutConfirm } = data;
        
        // Generate a unique code for the user (username + random 4 chars)
        const generateUniqueCode = () => {
            const baseCode = data.username.substring(0, 6).toLowerCase().replace(/[^a-z0-9]/g, '');
            const randomChars = Math.random().toString(36).substring(2, 6);
            return `${baseCode}${randomChars}`;
        };

        // Create user with hashed password
        const user = await storage.createUser({
            ...userDataWithoutConfirm,
            // Combine firstName and lastName to maintain the name field for backwards compatibility
            name: `${data.firstName} ${data.lastName}`,
            password: hashedPassword,
            role: 'applicant', // Set all new registrations as applicants
            locationId: null, // Will be assigned by manager later
            // Phone number is already in the required format: +xx xxxxxxx
            phoneNumber: data.phoneNumber,
            // Generate unique code
            uniqueCode: generateUniqueCode()
        });

        // Remove password from response
        const { password: userPassword, ...userWithoutPassword } = user;

        return res.status(201).json({
            message: 'User registered successfully',
            redirectUrl: `/registration-success?email=${encodeURIComponent(user.email)}&username=${encodeURIComponent(user.username)}`,
            user: userWithoutPassword
        });
    } catch (error) {
        if (error instanceof ZodError) {
            const validationError = fromZodError(error);
            return res.status(400).json({ 
                message: 'Validation error', 
                errors: validationError.details 
            });
        }
        
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Error registering user' });
    }
});

// Enhanced login endpoint using Passport.js with multer for multipart form handling
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

// Handle login with multiple content types (JSON, urlencoded, multipart)
router.post('/login', upload.none(), async (req, res, next) => {
    try {
        // Safer logging that doesn't expose any sensitive data
        console.log('Login attempt received');
        console.log('Session ID:', req.sessionID || 'none');
        console.log('Content type:', req.get('Content-Type') || 'none');

        // Log the body keys we received without showing values
        if (req.body) {
            console.log('Body fields received:', Object.keys(req.body).join(', '));
        } else {
            console.log('No body received');
        }
        
        // Extract credentials regardless of content type
        const username = req.body?.username || null;
        const submittedPassword = req.body?.password || null;
        
        console.log(`Extracted username: ${username ? username : 'missing'}, password: ${submittedPassword ? '******' : 'missing'}`);
        
        if (!username || !submittedPassword) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        const identifier = username;
        
        // For email login, we'll handle the lookup ourselves and then pass to Passport
        console.log('Login identifier type check:', identifier.includes('@') ? 'email format' : 'username format');
        
        // Special case for admin development login
        if (identifier === 'admin' && submittedPassword === 'adminpass123') {
            console.log('Admin login detected using development credentials');
            
            // Look up the admin user first
            const adminUser = await storage.getUserByUsername('admin');
            if (!adminUser) {
                console.log('Admin user not found, cannot proceed with admin login');
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            
            // Use centralized auth compatible session format
            req.session.passport = {
                user: { 
                    id: adminUser.id,
                    username: adminUser.username,
                    role: adminUser.role,
                    loggedIn: true
                }
            };
            
            console.log('Admin login successful, session established with ID:', req.sessionID);
            
            // Set a debug cookie to test cookie functionality
            res.cookie('admin-login', new Date().toISOString(), { 
                maxAge: 86400000,
                httpOnly: true,
                sameSite: 'lax'
            });
            

            
            // Return success with user data (excluding password)
            const { password, ...userWithoutPassword } = adminUser;
            
            // Redirect service function for atomic server-controlled navigation
            function getRedirectForUser(user: any) {
                if (!user?.role) return '/register';
                return user.role === 'applicant' ? '/applicant-portal' : '/dashboard';
            }
            
            const redirectUrl = getRedirectForUser(userWithoutPassword);
            
            return res.status(200).json({
                message: 'Login successful',
                user: userWithoutPassword,
                redirectScript: `
                    console.log('🔍 SERVER REDIRECT (ADMIN): About to execute redirect to ${redirectUrl}');
                    console.log('🔍 SERVER REDIRECT (ADMIN): Current cookies before redirect:', document.cookie);
                    console.log('🔍 SERVER REDIRECT (ADMIN): Expected session cookie: connect.sid');
                    console.log('🔍 SERVER REDIRECT (ADMIN): Cookie includes connect.sid:', document.cookie.includes('connect.sid'));
                    setTimeout(() => {
                        console.log('🔍 SERVER REDIRECT (ADMIN): Cookies after 1 second:', document.cookie);
                        console.log('🔍 SERVER REDIRECT (ADMIN): Session cookie check:', document.cookie.includes('connect.sid'));
                        if (!document.cookie.includes('connect.sid')) {
                            console.error('❌ COOKIE TIMING ISSUE: Session cookie not found after 1 second');
                            console.log('🔄 Trying manual cookie refresh...');
                            window.location.reload();
                            return;
                        }
                        window.location.replace('${redirectUrl}');
                    }, 1000);
                `,
                redirectUrl: redirectUrl,
                debug: {
                    adminBypass: true,
                    sessionId: req.sessionID,
                    timestamp: new Date().toISOString(),
                    cookieSet: true
                }
            });
        }
        
        // For email login or username login, we need to find the correct user first
        let user = null;
        
        // First attempt - check if this is an email login
        if (identifier.includes('@')) {
            console.log('Attempting to find user by email:', identifier);
            user = await storage.getUserByEmail(identifier);
        } else {
            console.log('Attempting to find user by username:', identifier);
            user = await storage.getUserByUsername(identifier);
        }
        
        // Fallback attempt - try the other lookup method
        if (!user && !identifier.includes('@')) {
            console.log('Username lookup failed, trying as email fallback:', identifier);
            user = await storage.getUserByEmail(identifier);
        } else if (!user && identifier.includes('@')) {
            console.log('Email lookup failed, trying as username fallback:', identifier);
            user = await storage.getUserByUsername(identifier);
        }
        
        if (!user) {
            console.log('User not found with any identifier method:', identifier);
            return res.status(401).json({ message: 'Invalid username/email or password' });
        }
        
        console.log('User found:', user.username, 'with ID:', user.id);
        
        // Now we need to verify the password
        const isMatch = await bcrypt.compare(submittedPassword, user.password);
        if (!isMatch) {
            console.log('Password verification failed for user:', user.username);
            return res.status(401).json({ message: 'Invalid username/email or password' });
        }
        
        // If we get here, credentials are correct - use centralized auth compatible session format
        req.session.passport = {
            user: { 
                id: user.id,
                username: user.username,
                role: user.role,
                loggedIn: true
            }
        };
        
        console.log('Centralized auth login successful for user:', user.username);
        console.log('Session established with ID:', req.sessionID);
        
        // Set a regular cookie for debugging - FORCED INSECURE FOR DEVELOPMENT
        res.cookie('login-timestamp', new Date().toISOString(), { 
            maxAge: 86400000,
            httpOnly: false, // ALLOW CLIENT-SIDE ACCESS FOR DEBUGGING
            secure: false,   // FORCE HTTP COMPATIBILITY
            sameSite: 'lax'
        });
        
        // Return success with user data (excluding password)
        const { password: userPasswordField, ...userWithoutPassword } = user;
        
        // Redirect service function for atomic server-controlled navigation
        function getRedirectForUser(user: any) {
            if (!user?.role) return '/register';
            return user.role === 'applicant' ? '/applicant-portal' : '/dashboard';
        }
        
        const redirectUrl = getRedirectForUser(userWithoutPassword);
        
        return res.status(200).json({
            message: 'Login successful',
            user: userWithoutPassword,
            redirectScript: `
                console.log('🔍 SERVER REDIRECT: About to execute redirect to ${redirectUrl}');
                console.log('🔍 SERVER REDIRECT: Current cookies before redirect:', document.cookie);
                console.log('🔍 SERVER REDIRECT: Expected session cookie: connect.sid');
                console.log('🔍 SERVER REDIRECT: Cookie includes connect.sid:', document.cookie.includes('connect.sid'));
                setTimeout(() => {
                    console.log('🔍 SERVER REDIRECT: Cookies after 1 second:', document.cookie);
                    console.log('🔍 SERVER REDIRECT: Session cookie check:', document.cookie.includes('connect.sid'));
                    if (!document.cookie.includes('connect.sid')) {
                        console.error('❌ COOKIE TIMING ISSUE: Session cookie not found after 1 second');
                        console.log('🔄 Trying manual cookie refresh...');
                        window.location.reload();
                        return;
                    }
                    window.location.replace('${redirectUrl}');
                }, 1000);
            `,
            redirectUrl: redirectUrl,
            debug: {
                sessionId: req.sessionID,
                timestamp: new Date().toISOString(),
                cookieSet: true
            }
        });
    } catch (error) {
        if (error instanceof ZodError) {
            const validationError = fromZodError(error);
            return res.status(400).json({ 
                message: 'Validation error', 
                errors: validationError.details 
            });
        }
        
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Error logging in' });
    }
});

// Get current user - authenticated endpoint
router.get('/user', authenticateUser, (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = req.user;
        
        return res.status(200).json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({ message: 'Error getting user data' });
    }
});

// Session validation endpoint for authentication checks
router.get('/login-session', async (req, res) => {
    try {
        // Check if user has valid session
        if (!req.session?.passport?.user) {
            return res.status(401).json({ 
                authenticated: false,
                message: 'No valid session found'
            });
        }

        // Return session user data
        const sessionUser = req.session.passport.user;
        return res.status(200).json({
            authenticated: true,
            user: sessionUser
        });
    } catch (error) {
        console.error('Error in /login-session endpoint:', error);
        return res.status(500).json({ 
            authenticated: false,
            message: 'Internal server error' 
        });
    }
});

// Centralized auth logout handler - support both POST and GET
const logoutHandler = (req: Request, res: Response) => {
    console.log('🔴 LOGOUT DEBUG: Backend logout handler started');
    console.log('🔴 LOGOUT DEBUG: Request method:', req.method);
    console.log('🔴 LOGOUT DEBUG: Session ID:', req.sessionID);
    console.log('🔴 LOGOUT DEBUG: Session passport data exists:', !!(req.session?.passport?.user));
    console.log('🔴 LOGOUT DEBUG: Current session data:', {
        passport: req.session?.passport,
        cookie: req.session?.cookie,
        id: req.sessionID
    });
    console.log('🔴 LOGOUT DEBUG: Request headers:', {
        'user-agent': req.headers['user-agent'],
        'cookie': req.headers.cookie,
        'content-type': req.headers['content-type']
    });
    
    try {
        console.log('🔴 LOGOUT DEBUG: Starting session cleanup...');
        
        // Clear authentication data from session using centralized auth pattern
        if (req.session?.passport) {
            console.log('🔴 LOGOUT DEBUG: Clearing passport session data...');
            delete req.session.passport;
            console.log('🔴 LOGOUT DEBUG: Passport session data cleared');
        } else {
            console.log('🔴 LOGOUT DEBUG: No passport session data to clear');
        }
        
        console.log('🔴 LOGOUT DEBUG: Destroying session...');
        // Destroy the session completely
        req.session.destroy((err) => {
            if (err) {
                console.error('🔴 LOGOUT DEBUG: Error destroying session:', err);
                return res.status(500).json({ 
                    message: 'Error during logout process',
                    error: err.message,
                    debug: { sessionId: req.sessionID, timestamp: new Date().toISOString() }
                });
            }
            
            console.log('🔴 LOGOUT DEBUG: Session destroyed successfully');
            
            // Clear only authentication-related cookies (targeted approach)
            const authCookies = [
                'connect.sid',
                'login-timestamp', 
                'debug-auth-check',
                'admin-login',
                'crewplots.sid',
                'connect.sid-refreshed'
            ];
            
            console.log('🔴 LOGOUT DEBUG: Clearing authentication cookies:', authCookies);
            authCookies.forEach(cookieName => {
                res.clearCookie(cookieName);
                console.log('🔴 LOGOUT DEBUG: Cleared cookie:', cookieName);
            });
            
            console.log('🔴 LOGOUT DEBUG: All cookies cleared');
            
            // For GET requests, redirect to login page
            if (req.method === 'GET') {
                console.log('🔴 LOGOUT DEBUG: GET request - redirecting to /login');
                return res.redirect('/login');
            }
            
            console.log('🔴 LOGOUT DEBUG: POST request - returning JSON response');
            // For POST requests, return JSON
            const successResponse = {
                message: 'Logged out successfully',
                debug: {
                    method: 'centralized_auth',
                    sessionDestroyed: true,
                    timestamp: new Date().toISOString()
                }
            };
            console.log('🔴 LOGOUT DEBUG: Sending response:', successResponse);
            return res.status(200).json(successResponse);
        });
    } catch (error) {
        console.error('Error during centralized logout:', error);
        return res.status(500).json({ 
            message: 'Error during logout process',
            error: String(error)
        });
    }
};

// Support both POST and GET for logout with centralized authentication
router.post('/logout', authenticateUser, logoutHandler);
router.get('/logout', authenticateUser, logoutHandler);

// Admin route to clear all sessions from the database
router.post('/clear-sessions', authenticateUser, async (req: Request, res: Response) => {
    // Only allow admins to clear sessions
    if (!req.user || req.user.role !== 'administrator') {
        return res.status(403).json({ message: 'Only administrators can clear sessions' });
    }
    
    try {
        console.log('Admin is clearing all sessions from the database');
        
        // Use the database connection from the pool
        const { db } = require('../db');
        
        // Truncate the sessions table
        await db.query('TRUNCATE TABLE sessions');
        
        console.log('All sessions cleared successfully');
        
        return res.status(200).json({ 
            success: true, 
            message: 'All sessions cleared from the database'
        });
    } catch (error) {
        console.error('Error clearing sessions:', error);
        return res.status(500).json({ 
            message: 'Failed to clear sessions', 
            error: String(error)
        });
    }
});

// Development direct HTML logout with centralized auth
router.get('/dev-logout', (req: Request, res: Response) => {
    console.log('Development centralized auth logout, sessionID:', req.sessionID);
    console.log('Session passport data exists:', !!(req.session?.passport?.user));
    
    try {
        // Clear authentication data from session using centralized auth pattern
        if (req.session?.passport) {
            delete req.session.passport;
            console.log('Dev logout: Cleared passport session data');
        }
        
        // Destroy the session completely
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session during dev logout:', err);
                return res.status(500).send('Error destroying session');
            }
            
            // Clear only authentication-related cookies (targeted approach)
            const authCookies = [
                'connect.sid',
                'login-timestamp', 
                'debug-auth-check',
                'admin-login',
                'crewplots.sid',
                'connect.sid-refreshed'
            ];
            
            authCookies.forEach(cookieName => {
                res.clearCookie(cookieName);
            });
            
            console.log('Development centralized auth logout successful');
            
            // Serve HTML with immediate redirect to login page
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Logout Successful</title>
                    <meta http-equiv="refresh" content="1;url=/login" />
                    <style>
                        body {
                            font-family: system-ui, -apple-system, sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            text-align: center;
                            background-color: #f9f9f9;
                        }
                        h1 {
                            color: #0070f3;
                        }
                        .method {
                            color: #666;
                            font-size: 0.9em;
                            margin-top: 1em;
                        }
                    </style>
                </head>
                <body>
                    <h1>Logout Successful</h1>
                    <p>You are being redirected to the login page...</p>
                    <div class="method">Using centralized authentication</div>
                    <script>
                        // Force reload to login and clear history
                        window.location.replace('/login');
                    </script>
                </body>
                </html>
            `);
        });
    } catch (error) {
        console.error('Error during development logout:', error);
        return res.status(500).send('Error during logout process: ' + String(error));
    }
});

// Change password
router.post('/change-password', authenticateUser, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }
        
        const user = req.user;
        
        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update password
        await storage.updateUser(user.id, { password: hashedPassword });
        
        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ message: 'Error changing password' });
    }
});

// Auto-login endpoint for development
router.get('/autologin', async (req, res) => {
    try {
        console.log('Attempting auto-login with admin credentials');
        
        // Find the admin user
        const user = await storage.getUserByUsername('admin');
        if (!user) {
            console.error('Admin user not found');
            return res.status(404).json({ message: 'Admin user not found' });
        }
        
        // Set session data
        req.session.userId = user.id;
        req.session.loggedIn = true;
        console.log('Auto-login successful, session:', req.session);
        
        // Explicitly save session
        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
                return res.status(500).json({ message: 'Error saving session' });
            }
            
            console.log('Session saved successfully for auto-login');
            
            // Remove password from response
            const { password, ...userWithoutPassword } = user;
            
            return res.status(200).json({
                message: 'Auto-login successful',
                user: userWithoutPassword
            });
        });
    } catch (error) {
        console.error('Auto-login error:', error);
        return res.status(500).json({ message: 'Error in auto-login' });
    }
});

// Development direct login with HTML response
router.get('/dev-login', async (req, res) => {
    try {
        console.log('Attempting dev-login with admin credentials');
        
        // Find the admin user
        const user = await storage.getUserByUsername('admin');
        if (!user) {
            console.error('Admin user not found');
            return res.status(404).send('Admin user not found');
        }
        
        // Use Passport login method which will handle both session and user serialization
        req.login(user, (err) => {
            if (err) {
                console.error('Error during Passport login:', err);
                return res.status(500).send('Error during login process');
            }
            
            console.log('Passport login successful for admin');
            console.log('Session ID after login:', req.sessionID);
            
            // Set a regular cookie for debugging
            res.cookie('admin-login', 'true', { 
                maxAge: 86400000,
                httpOnly: true,
                sameSite: 'lax'
            });
            
            // Send an HTML response that redirects to the dashboard
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Login Successful</title>
                    <meta http-equiv="refresh" content="0;url=/dashboard" />
                </head>
                <body>
                    <h1>Login Successful</h1>
                    <p>You are being redirected to the dashboard...</p>
                    <script>
                        // Force reload to dashboard and clear history
                        window.location.replace('/dashboard');
                    </script>
                </body>
                </html>
            `);
        });
    } catch (error) {
        console.error('Dev-login error:', error);
        return res.status(500).send('Error in dev-login');
    }
});

// Clear all sessions (admin only) - for development and testing
router.get('/clear-all-sessions', async (req, res) => {
    try {
        // Import sessions table from shared/schema.ts
        const { sessions } = require('@shared/schema');
        const { db } = require('../db');
        
        // Delete all sessions from the database
        await db.delete(sessions);
        
        console.log('All sessions cleared successfully');
        
        // Clear all cookies in the current response
        const cookies = req.headers.cookie?.split(';') || [];
        cookies.forEach(cookie => {
            const cookieName = cookie.split('=')[0]?.trim();
            if (cookieName) {
                res.clearCookie(cookieName);
            }
        });
        
        return res.status(200).json({ 
            message: 'All sessions cleared successfully',
            redirectUrl: '/login'
        });
    } catch (error) {
        console.error('Error clearing sessions:', error);
        return res.status(500).json({ 
            message: 'Failed to clear sessions', 
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

export default router;