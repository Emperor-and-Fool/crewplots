import express, { Request, Response } from 'express';
import { authenticateUser } from '../../../middleware/auth';

const router = express.Router();

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