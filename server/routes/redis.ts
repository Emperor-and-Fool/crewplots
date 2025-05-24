import { Router, Request, Response } from "express";
import Redis from "ioredis";

const router = Router();

// Redis client instance
let redisClient: Redis | null = null;
let connectionState = {
  connected: false,
  lastConnected: 0,
  uptime: 0,
  error: 'Not initialized'
};

// Initialize Redis connection
try {
  const redisConfig: any = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    // Environment-optimized settings for slower connections
    maxRetriesPerRequest: 60,
    retryDelayOnFailover: 2000,
    connectTimeout: 10000,
    lazyConnect: true,
    enableReadyCheck: false,
    // Graceful reconnection
    maxRetriesPerRequest: 60,
    retryDelayOnClusterDown: 2000,
    retryDelayOnReconnect: function(times: number) {
      return Math.min(times * 2000, 10000);
    }
  };

  // Add password if provided
  if (process.env.REDIS_PASSWORD) {
    redisConfig.password = process.env.REDIS_PASSWORD;
  }

  redisClient = new Redis(redisConfig);
  
  // Proper event handling with state tracking
  redisClient.on('connect', () => {
    console.log('Redis connected successfully');
    connectionState.connected = true;
    connectionState.lastConnected = Date.now();
    connectionState.error = '';
  });
  redisClient.on('ready', () => {
    console.log('Redis ready for commands');
    connectionState.connected = true;
    connectionState.lastConnected = Date.now();
  });
  redisClient.on('error', (err) => {
    connectionState.connected = false;
    connectionState.error = err.message;
    // Don't flood logs with connection errors during startup
    if (!err.message.includes('ECONNREFUSED')) {
      console.log('Redis error:', err.message);
    }
  });
  redisClient.on('reconnecting', () => {
    console.log('Redis reconnecting...');
    connectionState.connected = false;
    connectionState.error = 'Reconnecting';
  });
  redisClient.on('close', () => {
    connectionState.connected = false;
    connectionState.error = 'Connection closed';
  });
  
} catch (error) {
  console.log("Redis connection failed:", error);
}

// Redis status endpoint
router.get("/status", async (req: Request, res: Response) => {
  try {
    if (!redisClient) {
      return res.json({
        connected: false,
        uptime: 0,
        memory: { used: 'N/A', peak: 'N/A' },
        clients: 0,
        version: 'N/A',
        error: 'Redis client not initialized'
      });
    }

    // Use tracked connection state instead of ping test
    if (!connectionState.connected) {
      return res.json({
        connected: false,
        uptime: 0,
        memory: { used: 'N/A', peak: 'N/A' },
        clients: 0,
        version: 'N/A',
        error: connectionState.error || 'Not connected'
      });
    }

    // Calculate uptime
    connectionState.uptime = connectionState.lastConnected ? 
      Math.floor((Date.now() - connectionState.lastConnected) / 1000) : 0;

    // Try to get Redis info - if it fails, we're still "connected" but show basic info
    try {
      const info = await redisClient.info();
      const lines = info.split('\r\n');
      
      const parseInfo = (section: string) => {
        const result: Record<string, string> = {};
        let inSection = false;
        
        for (const line of lines) {
          if (line.startsWith(`# ${section}`)) {
            inSection = true;
            continue;
          }
          if (line.startsWith('#')) {
            inSection = false;
            continue;
          }
          if (inSection && line.includes(':')) {
            const [key, value] = line.split(':');
            result[key] = value;
          }
        }
        return result;
      };

      const serverInfo = parseInfo('Server');
      const memoryInfo = parseInfo('Memory');
      const clientsInfo = parseInfo('Clients');

      // Format memory values
      const formatBytes = (bytes: string) => {
        const num = parseInt(bytes);
        if (isNaN(num)) return bytes;
        return `${(num / 1024 / 1024).toFixed(1)}MB`;
      };

      res.json({
        connected: true,
        uptime: parseInt(serverInfo.uptime_in_seconds || connectionState.uptime.toString()),
        memory: {
          used: formatBytes(memoryInfo.used_memory || '0'),
          peak: formatBytes(memoryInfo.used_memory_peak || '0')
        },
        clients: parseInt(clientsInfo.connected_clients || '0'),
        version: serverInfo.redis_version || 'Unknown'
      });
      
    } catch (infoError) {
      // Connected but can't get detailed info - show basic status
      res.json({
        connected: true,
        uptime: connectionState.uptime,
        memory: { used: 'N/A', peak: 'N/A' },
        clients: 0,
        version: 'N/A',
        error: `Info unavailable: ${infoError instanceof Error ? infoError.message : 'Unknown'}`
      });
    }

  } catch (error) {
    console.error("Redis status check failed:", error);
    res.json({
      connected: false,
      uptime: 0,
      memory: { used: 'N/A', peak: 'N/A' },
      clients: 0,
      version: 'N/A',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;