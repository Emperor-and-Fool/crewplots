import { Router, Request, Response } from "express";

const router = Router();

// Redis disabled due to binary incompatibility (SIGSEGV crashes)
// Using memory store instead
const redisDisabled = true;

// Connection state for status endpoint
let connectionState = {
  connected: false,
  lastConnected: 0,
  uptime: 0,
  error: 'Redis disabled due to environment incompatibility'
};

// Status endpoint
router.get('/status', (req: Request, res: Response) => {
  res.json({
    connected: false,
    uptime: 0,
    memory: {
      used: 0,
      peak: 0,
      total: 0
    },
    error: 'Redis disabled due to environment incompatibility'
  });
});

// Test endpoint  
router.get('/test', (req: Request, res: Response) => {
  res.json({ 
    success: false, 
    message: 'Redis disabled - using memory store instead'
  });
});

// Set endpoint
router.post('/set', (req: Request, res: Response) => {
  res.json({ 
    success: false, 
    message: 'Redis disabled - using memory store instead'
  });
});

// Get endpoint
router.get('/get/:key', (req: Request, res: Response) => {
  res.json({ 
    success: false, 
    message: 'Redis disabled - using memory store instead'
  });
});

export default router;