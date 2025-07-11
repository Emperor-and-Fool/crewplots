import express, { Request, Response } from 'express';
import { storage } from '../../../storage';

const router = express.Router();

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