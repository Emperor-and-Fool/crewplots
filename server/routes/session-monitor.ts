import { Router } from 'express';
import { hybridSessionStore } from '../services/hybrid-session-store';

const router = Router();

/**
 * Session Store Monitoring API
 * Provides insights into hybrid Redis-PostgreSQL session store performance
 */

// Get session store status and metrics
router.get('/status', async (req, res) => {
  try {
    const status = await hybridSessionStore.getStatus();
    
    res.json({
      timestamp: new Date().toISOString(),
      store: 'hybrid-redis-postgresql',
      postgresql: {
        sessions: status.pgSessions,
        status: 'connected'
      },
      redis: {
        status: status.redisReady ? 'connected' : 'disconnected',
        cacheHits: status.cacheHits || 0
      },
      performance: {
        primaryStore: 'postgresql',
        cacheLayer: status.redisReady ? 'redis-active' : 'redis-unavailable',
        fallbackMode: !status.redisReady
      }
    });
  } catch (error) {
    console.error('Session store status error:', error);
    res.status(500).json({
      error: 'Failed to get session store status',
      timestamp: new Date().toISOString()
    });
  }
});

// Get session count
router.get('/count', (req, res) => {
  hybridSessionStore.length((err: any, count?: number) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to get session count',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      sessionCount: count || 0,
      store: 'hybrid-redis-postgresql',
      timestamp: new Date().toISOString()
    });
  });
});

// Clear all sessions (admin only)
router.delete('/clear', (req, res) => {
  // Simple admin check - in production, implement proper authorization
  const userRole = (req as any).user?.role;
  
  if (userRole !== 'administrator') {
    return res.status(403).json({
      error: 'Unauthorized - Administrator access required',
      timestamp: new Date().toISOString()
    });
  }

  hybridSessionStore.clear((err: any) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to clear sessions',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      message: 'All sessions cleared successfully',
      store: 'hybrid-redis-postgresql',
      timestamp: new Date().toISOString()
    });
  });
});

// Test session store performance
router.get('/test', async (req, res) => {
  const testSessionId = `test-${Date.now()}`;
  const testSession = {
    cookie: { maxAge: 60000 }, // 1 minute
    testData: 'hybrid-session-store-test',
    timestamp: new Date().toISOString()
  };

  try {
    const startTime = Date.now();
    
    // Test write performance
    await new Promise((resolve, reject) => {
      hybridSessionStore.set(testSessionId, testSession, (err: any) => {
        if (err) reject(err);
        else resolve(undefined);
      });
    });
    
    const writeTime = Date.now() - startTime;
    
    // Test read performance
    const readStart = Date.now();
    const retrievedSession = await new Promise((resolve, reject) => {
      hybridSessionStore.get(testSessionId, (err: any, session: any) => {
        if (err) reject(err);
        else resolve(session);
      });
    });
    
    const readTime = Date.now() - readStart;
    
    // Clean up test session
    await new Promise((resolve) => {
      hybridSessionStore.destroy(testSessionId, () => resolve(undefined));
    });
    
    res.json({
      test: 'session-store-performance',
      results: {
        writeTime: `${writeTime}ms`,
        readTime: `${readTime}ms`,
        totalTime: `${writeTime + readTime}ms`,
        dataIntegrity: retrievedSession?.testData === testSession.testData ? 'passed' : 'failed'
      },
      store: 'hybrid-redis-postgresql',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Session store test error:', error);
    res.status(500).json({
      error: 'Session store test failed',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;