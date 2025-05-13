import express from 'express';
import { storage } from '../storage';
import { insertUserSchema, loginSchema, registerSchema } from '@shared/schema';
import { ZodError } from 'zod';
import bcrypt from 'bcryptjs';
import { fromZodError } from 'zod-validation-error';
import { authenticateUser } from '../middleware/auth';

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

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        // Create user with hashed password
        const user = await storage.createUser({
            ...data,
            password: hashedPassword,
            role: 'staff', // Default role for self-registration
            locationId: null // Will be assigned by manager later
        });

        // Remove password from response
        const { password, ...userWithoutPassword } = user;

        return res.status(201).json({
            message: 'User registered successfully',
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
        const data = loginSchema.parse(req.body);
        
        // Find user by username
        const user = await storage.getUserByUsername(data.username);
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        // Verify password
        const isMatch = await bcrypt.compare(data.password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        // Set session
        req.session.userId = user.id;
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        
        return res.status(200).json({
            message: 'Login successful',
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
        
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Error logging in' });
    }
});

// Get current user
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

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ message: 'Error logging out' });
        }
        
        res.clearCookie('connect.sid');
        return res.status(200).json({ message: 'Logged out successfully' });
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

export default router;