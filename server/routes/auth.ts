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
        const password = req.body?.password || null;
        
        console.log(`Extracted username: ${username ? username : 'missing'}, password: ${password ? '******' : 'missing'}`);
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        const identifier = username;
        
        // For email login, we'll handle the lookup ourselves and then pass to Passport
        console.log('Login identifier type check:', identifier.includes('@') ? 'email format' : 'username format');
        
        // Special case for admin development login
        if (identifier === 'admin' && password === 'adminpass123') {
            console.log('Admin login detected using development credentials');
            
            // Look up the admin user first
            const adminUser = await storage.getUserByUsername('admin');
            if (!adminUser) {
                console.log('Admin user not found, cannot proceed with admin login');
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            
            // Manually log in the admin user using Passport's login method
            req.login(adminUser, { session: true }, (err) => {
                if (err) {
                    console.error('Admin login error:', err);
                    return res.status(500).json({ message: 'Error during login process' });
                }
                
                console.log('Admin login successful, session established with ID:', req.sessionID);
                
                // Set a debug cookie to test cookie functionality
                res.cookie('admin-login', new Date().toISOString(), { 
                    maxAge: 86400000,
                    httpOnly: true,
                    sameSite: 'lax'
                });
                
                // Return success with user data (excluding password)
                const { password, ...userWithoutPassword } = adminUser;
                return res.status(200).json({
                    message: 'Login successful',
                    user: userWithoutPassword,
                    debug: {
                        adminBypass: true,
                        sessionId: req.sessionID,
                        timestamp: new Date().toISOString()
                    }
                });
            });
            
            return; // End execution here for admin login
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
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password verification failed for user:', user.username);
            return res.status(401).json({ message: 'Invalid username/email or password' });
        }
        
        // If we get here, credentials are correct - use Passport to log in
        req.login(user, { session: true }, (err) => {
            if (err) {
                console.error('Login error:', err);
                return res.status(500).json({ message: 'Error during login process' });
            }
            
            console.log('Passport login successful for user:', user.username);
            console.log('Session established with ID:', req.sessionID);
            
            // Set a regular cookie for debugging
            res.cookie('login-timestamp', new Date().toISOString(), { 
                maxAge: 86400000,
                httpOnly: true,
                sameSite: 'lax'
            });
            
            // Return success with user data (excluding password)
            const { password, ...userWithoutPassword } = user;
            return res.status(200).json({
                message: 'Login successful',
                user: userWithoutPassword,
                debug: {
                    sessionId: req.sessionID,
                    timestamp: new Date().toISOString()
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

// Enhanced /me endpoint that uses Passport's isAuthenticated
router.get('/me', async (req, res) => {
    try {
        // Enable CORS for all origins in development
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        
        console.log('Session data:', req.session);
        console.log('Session ID:', req.sessionID || 'none');
        console.log('Is authenticated (Passport):', req.isAuthenticated());
        console.log('User object from Passport:', req.user ? `User: ${req.user.username}` : 'None');
        
        // Set debug cookie for testing - use SameSite=None for cross-domain cookies
        res.cookie('debug-auth-check', 'was-checked', { 
            maxAge: 3600000, 
            httpOnly: true,
            sameSite: 'none',
            secure: false // Important: Allow insecure cookies in development
        });
        
        // Force cookie to be visible in response
        res.header('Set-Cookie', `connect.sid-refreshed=${req.sessionID || 'no-session'}; Path=/; HttpOnly; SameSite=None; Max-Age=3600`);
        
        // Use Passport's isAuthenticated() method 
        if (!req.isAuthenticated()) {
            console.log('Not authenticated according to Passport');
            return res.status(200).json({ 
                authenticated: false,
                debug: {
                    sessionExists: !!req.session,
                    sessionId: req.sessionID || 'none',
                    hasCookies: !!(req.cookies && req.cookies['connect.sid']),
                    hasAnyHeaders: !!req.headers,
                    hasAnyCookies: !!(req.cookies && Object.keys(req.cookies).length > 0),
                    cookieHeader: req.headers.cookie || 'none'
                }
            });
        }
        
        // At this point, req.user should have the user data
        if (!req.user) {
            console.log('Missing user object despite being authenticated');
            return res.status(200).json({ 
                authenticated: false,
                reason: 'user_object_missing'
            });
        }
        
        // Remove sensitive data before returning the user
        const user = req.user as any; // Type assertion needed for password property
        const { password, ...userWithoutPassword } = user;
        
        console.log('Get /me - returning authenticated user:', userWithoutPassword.username);
        return res.status(200).json({ 
            authenticated: true,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Error in /me endpoint:', error);
        
        // Return a more detailed error response for debugging
        return res.status(200).json({ 
            authenticated: false,
            error: {
                message: 'Error checking authentication status',
                hasSession: !!req.session,
                sessionID: req.sessionID || 'none',
                isPassportInitialized: !!req.isAuthenticated
            } 
        });
    }
});

// Enhanced logout using Passport - support both POST and GET
const logoutHandler = (req, res) => {
    console.log('Logging out user, sessionID:', req.sessionID);
    console.log('Current authentication status:', req.isAuthenticated());
    
    // Use Passport's logout method
    req.logout((err) => {
        if (err) {
            console.error('Error during Passport logout:', err);
            return res.status(500).json({ message: 'Error logging out' });
        }
        
        // Then destroy the session to be thorough
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ message: 'Error during logout' });
            }
            
            // Clear ALL cookies
            res.clearCookie('connect.sid');
            res.clearCookie('login-timestamp');
            res.clearCookie('debug-auth-check');
            res.clearCookie('admin-login');
            
            // Clear additional cookies that might exist
            const cookieNames = Object.keys(req.cookies || {});
            cookieNames.forEach(name => {
                res.clearCookie(name);
            });
            
            console.log('User logged out successfully, redirecting to login');
            
            // For GET requests, redirect to login page
            if (req.method === 'GET') {
                return res.redirect('/login');
            }
            
            // For POST requests, return JSON
            return res.status(200).json({ 
                message: 'Logged out successfully',
                debug: {
                    sessionDestroyed: true,
                    timestamp: new Date().toISOString()
                }
            });
        });
    });
};

// Support both POST and GET for logout
router.post('/logout', logoutHandler);
router.get('/logout', logoutHandler);

// Development direct HTML logout with Passport
router.get('/dev-logout', (req, res) => {
    console.log('Direct server-side logout, sessionID:', req.sessionID);
    console.log('Current authentication status:', req.isAuthenticated());
    
    // Use Passport's logout method
    req.logout((err) => {
        if (err) {
            console.error('Error during Passport logout:', err);
            return res.status(500).send('Error during logout process');
        }
        
        // Then destroy the session to be thorough
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).send('Error destroying session');
            }
            
            // Clear cookies
            res.clearCookie('connect.sid');
            res.clearCookie('login-timestamp');
            res.clearCookie('debug-auth-check');
            res.clearCookie('admin-login');
            
            console.log('User logged out successfully with direct approach');
            
            // Serve HTML with a redirect to login page
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Logout Successful</title>
                    <meta http-equiv="refresh" content="3;url=/login" />
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
                    </style>
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

export default router;