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

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

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
        const { password, ...userWithoutPassword } = user;

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

// Login
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt - body:', JSON.stringify(req.body, (k, v) => k === 'password' ? '******' : v));
        console.log('Login attempt - session ID:', req.sessionID);
        console.log('Login attempt - cookies:', req.cookies);
        
        // Parse and validate the login data
        const data = loginSchema.parse(req.body);
        
        // First, check if input contains @ - if so, treat as email
        let user;
        const identifier = data.username;
        
        console.log('Login identifier type check:', identifier.includes('@') ? 'email format' : 'username format');
        
        // Try to find user by username or email
        if (identifier.includes('@')) {
            console.log('Attempting to find user by email:', identifier);
            user = await storage.getUserByEmail(identifier);
        } else {
            console.log('Attempting to find user by username:', identifier);
            user = await storage.getUserByUsername(identifier);
        }
        
        // If no user found, try the other lookup method as fallback
        if (!user && !identifier.includes('@')) {
            console.log('Username lookup failed, trying as email:', identifier);
            user = await storage.getUserByEmail(identifier);
        } else if (!user && identifier.includes('@')) {
            console.log('Email lookup failed, trying as username:', identifier);
            user = await storage.getUserByUsername(identifier);
        }
        
        if (!user) {
            console.log('Login failed - user not found with identifier:', identifier);
            return res.status(401).json({ message: 'Invalid username/email or password' });
        }
        
        console.log('User found:', user.username, 'with ID:', user.id, 'Email:', user.email);
        
        // Special case for admin user during development
        if (data.username === 'admin' && data.password === 'adminpass123') {
            console.log('Admin login detected, using development credentials');
            
            // Set session data with both userId and loggedIn flag
            req.session.userId = user.id;
            req.session.loggedIn = true;
            console.log('Admin login successful, session data set, session ID:', req.sessionID);
            
            // Explicitly save session to force persistence
            return new Promise<void>((resolve, reject) => {
                req.session.save((err) => {
                    if (err) {
                        console.error('Error saving admin session:', err);
                        reject(err);
                        return res.status(500).json({ message: 'Error saving session' });
                    } else {
                        console.log('Session saved successfully for admin user, session ID:', req.sessionID);
                        
                        // Remove password from response
                        const { password, ...userWithoutPassword } = user;
                        
                        res.status(200).json({
                            message: 'Login successful',
                            user: userWithoutPassword,
                            sessionId: req.sessionID,
                            debug: {
                                sessionSaved: true,
                                timestamp: new Date().toISOString()
                            }
                        });
                        resolve();
                    }
                });
            });
        }
        
        // Verify password for normal users
        console.log('Verifying password for standard user:', user.username);
        const isMatch = await bcrypt.compare(data.password, user.password);
        if (!isMatch) {
            console.log('Login failed - password mismatch for user:', user.username);
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        console.log('Password verified for user:', user.username);
        
        // Set session - save both userId and loggedIn flag
        req.session.userId = user.id;
        req.session.loggedIn = true;
        console.log('User login successful, session data set, session ID:', req.sessionID);
        
        // Explicitly save session to force persistence
        return new Promise<void>((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    console.error('Error saving session:', err);
                    reject(err);
                    return res.status(500).json({ message: 'Error saving session' });
                } else {
                    console.log('Session saved successfully for user:', user.username, 'session ID:', req.sessionID);
                    
                    // Set a regular cookie to test cookie functionality
                    res.cookie('login-timestamp', new Date().toISOString(), { 
                        maxAge: 86400000,
                        httpOnly: true,
                        sameSite: 'lax'
                    });
                    
                    // Remove password from response
                    const { password, ...userWithoutPassword } = user;
                    
                    res.status(200).json({
                        message: 'Login successful',
                        user: userWithoutPassword,
                        sessionId: req.sessionID,
                        debug: {
                            sessionSaved: true,
                            timestamp: new Date().toISOString()
                        }
                    });
                    resolve();
                }
            });
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

// Get current user - session check endpoint
router.get('/me', async (req, res) => {
    try {
        console.log('Session data:', req.session);
        console.log('Session ID:', req.sessionID);
        console.log('Cookies:', req.cookies);
        console.log('Headers:', req.headers);
        
        const userId = req.session?.userId;
        const loggedIn = req.session?.loggedIn;
        console.log('Get /me - userId from session:', userId, 'loggedIn:', loggedIn);
        
        if (!userId || loggedIn !== true) {
            console.log('No user ID or loggedIn flag in session');
            // Set debug cookie to see if cookies are being maintained
            res.cookie('debug-auth-check', 'was-checked', { 
                maxAge: 3600000, 
                httpOnly: true,
                sameSite: 'lax'
            });
            return res.status(200).json({ 
                authenticated: false,
                debug: {
                    sessionExists: !!req.session,
                    sessionId: req.sessionID,
                    hasCookies: !!req.cookies['connect.sid'],
                }
            });
        }
        
        console.log('Looking up user with ID:', userId);
        const user = await storage.getUser(userId);
        console.log('Get /me - found user:', user ? 'yes' : 'no');
        
        if (!user) {
            console.log('User not found in database');
            return res.status(200).json({ 
                authenticated: false,
                reason: 'user_not_found'
            });
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        
        console.log('Get /me - returning authenticated user:', userWithoutPassword.username);
        return res.status(200).json({ 
            authenticated: true,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Error in /me endpoint:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    console.log('Logging out user, sessionID:', req.sessionID);
    
    // Clear the session variables first
    req.session.userId = undefined;
    req.session.loggedIn = false;
    
    // Save the changes before destroying
    req.session.save((saveErr) => {
        if (saveErr) {
            console.error('Error saving session before logout:', saveErr);
        }
        
        // Then destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ message: 'Error logging out' });
            }
            
            // Clear the session cookie
            res.clearCookie('connect.sid');
            console.log('User logged out successfully');
            return res.status(200).json({ message: 'Logged out successfully' });
        });
    });
});

// Development direct HTML logout
router.get('/dev-logout', (req, res) => {
    console.log('Direct server-side logout, sessionID:', req.sessionID);
    
    // Clear the session variables first
    req.session.userId = undefined;
    req.session.loggedIn = false;
    
    // Save the changes before destroying
    req.session.save((saveErr) => {
        if (saveErr) {
            console.error('Error saving session before logout:', saveErr);
        }
        
        // Then destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).send('Error logging out');
            }
            
            // Clear the session cookie
            res.clearCookie('connect.sid');
            console.log('User logged out successfully with direct approach');
            
            // Serve HTML with a redirect to login page
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Logout Successful</title>
                    <meta http-equiv="refresh" content="0;url=/login" />
                </head>
                <body>
                    <h1>Logout Successful</h1>
                    <p>You are being redirected to the login page...</p>
                    <script>
                        // Force reload to login and clear history
                        window.location.replace('/login');
                    </script>
                </body>
                </html>
            `);
        });
    });
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
        
        // Set session data
        req.session.userId = user.id;
        req.session.loggedIn = true;
        console.log('Dev-login successful, session:', req.session);
        
        // Explicitly save session and redirect with HTML
        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
                return res.status(500).send('Error saving session');
            }
            
            console.log('Session saved successfully for dev-login');
            
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

export default router;