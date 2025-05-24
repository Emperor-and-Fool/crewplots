import { Router, Request, Response } from "express";
import Redis from "ioredis";

const router = Router();

// Redis client instance
let redisClient: Redis | null = null;

// Initialize Redis connection
try {
  const redisConfig: any = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null
  };

  // Add password if provided
  if (process.env.REDIS_PASSWORD) {
    redisConfig.password = process.env.REDIS_PASSWORD;
  }

  redisClient = new Redis({
    ...redisConfig,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    // Handle connection errors gracefully
    onConnect: () => console.log('Redis connected'),
    onError: (err) => console.log('Redis connection error (handled):', err.message)
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

    // Test Redis connection with timeout
    try {
      await Promise.race([
        redisClient.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 2000))
      ]);
    } catch (connectError) {
      return res.json({
        connected: false,
        uptime: 0,
        memory: { used: 'N/A', peak: 'N/A' },
        clients: 0,
        version: 'N/A',
        error: `Connection failed: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`
      });
    }

    // Get Redis info
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
      uptime: parseInt(serverInfo.uptime_in_seconds || '0'),
      memory: {
        used: formatBytes(memoryInfo.used_memory || '0'),
        peak: formatBytes(memoryInfo.used_memory_peak || '0')
      },
      clients: parseInt(clientsInfo.connected_clients || '0'),
      version: serverInfo.redis_version || 'Unknown'
    });

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