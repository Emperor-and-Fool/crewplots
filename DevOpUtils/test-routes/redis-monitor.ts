import { Router } from 'express';
import { onDemandRedis } from '../../adapters-repl/redis-ondemand/on-demand-service';

const router = Router();

// Track Redis lifecycle events
let redisEvents: Array<{
  timestamp: string;
  event: string;
  details?: any;
}> = [];

// Function to log Redis events
function logRedisEvent(event: string, details?: any) {
  redisEvents.push({
    timestamp: new Date().toISOString(),
    event,
    details
  });
  console.log(`[Redis Monitor] ${event}:`, details || '');
}

// Test Redis staying alive with periodic pings
router.post('/start-lifecycle-test', async (req, res) => {
  try {
    redisEvents = []; // Clear previous events
    logRedisEvent('Lifecycle test started');
    
    // Initial Redis connection
    await onDemandRedis.withConnection(async (redis) => {
      await redis.set('lifecycle:test', 'active');
      logRedisEvent('Initial connection established');
      return 'OK';
    }, { connectionId: 'lifecycle-monitor', keepAlive: 300000 }); // 5 minutes

    res.json({
      success: true,
      message: 'Redis lifecycle monitoring started',
      events: redisEvents
    });
  } catch (error) {
    logRedisEvent('Error starting lifecycle test', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ping Redis to check if it's still alive
router.get('/ping', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const result = await onDemandRedis.withConnection(async (redis) => {
      const pingResult = await redis.ping();
      return pingResult;
    }, { connectionId: 'ping-test', keepAlive: 10000 });

    const responseTime = Date.now() - startTime;
    
    logRedisEvent('Ping successful', { responseTime: `${responseTime}ms` });
    
    res.json({
      success: true,
      ping: result,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logRedisEvent('Ping failed', { 
      responseTime: `${responseTime}ms`, 
      error: error instanceof Error ? error.message : 'Unknown' 
    });
    
    res.status(500).json({
      success: false,
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Redis status and event history
router.get('/status', (req, res) => {
  const status = onDemandRedis.getStatus();
  
  res.json({
    redisStatus: status,
    events: redisEvents,
    totalEvents: redisEvents.length,
    lastEvent: redisEvents[redisEvents.length - 1] || null
  });
});

// Automated ping test - ping every X seconds
router.post('/auto-ping/:intervalSeconds', async (req, res) => {
  const interval = parseInt(req.params.intervalSeconds) || 10;
  
  logRedisEvent('Auto-ping started', { intervalSeconds: interval });
  
  // Start interval pinging
  const pingInterval = setInterval(async () => {
    try {
      const startTime = Date.now();
      await onDemandRedis.withConnection(async (redis) => {
        return await redis.ping();
      }, { connectionId: 'auto-ping', keepAlive: 5000 });
      
      const responseTime = Date.now() - startTime;
      logRedisEvent('Auto-ping success', { responseTime: `${responseTime}ms` });
    } catch (error) {
      logRedisEvent('Auto-ping failed', { error: error instanceof Error ? error.message : 'Unknown' });
    }
  }, interval * 1000);

  // Stop after 2 minutes
  setTimeout(() => {
    clearInterval(pingInterval);
    logRedisEvent('Auto-ping stopped', { reason: 'Timeout after 2 minutes' });
  }, 120000);

  res.json({
    success: true,
    message: `Auto-ping started every ${interval} seconds for 2 minutes`,
    events: redisEvents
  });
});

export default router;