import { Router } from 'express';
import { onDemandRedis } from '../../adapters-repl/redis-ondemand/on-demand-service';

const router = Router();

// Test Redis connection and basic operations
router.get('/test', async (req, res) => {
  try {
    const result = await onDemandRedis.withConnection(async (redis) => {
      // Test basic Redis operations
      await redis.set('test:key', 'Hello Redis!');
      const value = await redis.get('test:key');
      
      // Test with JSON data
      const jsonData = { message: 'Redis is working', timestamp: Date.now() };
      await redis.setex('test:json', 60, JSON.stringify(jsonData));
      const jsonValue = await redis.get('test:json');
      
      return {
        basicTest: value,
        jsonTest: JSON.parse(jsonValue || '{}'),
        serverInfo: await redis.info('server'),
        redisVersion: await redis.config('GET', 'version')
      };
    }, { connectionId: 'redis-test' });

    res.json({
      success: true,
      message: 'Redis is working with RESP-2 protocol',
      data: result
    });
  } catch (error) {
    console.error('Redis test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Redis test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test Redis session simulation
router.post('/session-test', async (req, res) => {
  try {
    const sessionId = `test-session-${Date.now()}`;
    const sessionData = {
      userId: 1,
      username: 'test-user',
      role: 'administrator',
      loginTime: new Date().toISOString()
    };

    const result = await onDemandRedis.withConnection(async (redis) => {
      // Simulate session storage
      await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(sessionData));
      
      // Retrieve session
      const stored = await redis.get(`session:${sessionId}`);
      
      // Test session update
      const updatedData = { ...sessionData, lastActivity: new Date().toISOString() };
      await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(updatedData));
      
      const final = await redis.get(`session:${sessionId}`);
      
      return {
        sessionId,
        original: JSON.parse(stored || '{}'),
        updated: JSON.parse(final || '{}')
      };
    }, { connectionId: 'session-test' });

    res.json({
      success: true,
      message: 'Redis session test successful',
      data: result
    });
  } catch (error) {
    console.error('Redis session test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Redis session test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;