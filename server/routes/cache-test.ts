import { Router } from 'express';
import { cacheService } from '../services/cache-service';

const router = Router();

// Test cache functionality
router.get('/cache/test', async (req, res) => {
  try {
    const testKey = 'test:performance';
    const testData = {
      timestamp: Date.now(),
      message: 'Cache performance test',
      data: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` }))
    };

    console.log('[Test] Starting cache performance test...');
    const startTime = process.hrtime.bigint();

    // Test cache set
    await cacheService.set(testKey, testData, { ttl: 300 });

    // Test cache get
    const retrieved = await cacheService.get(testKey);

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    const status = cacheService.getStatus();

    res.json({
      success: true,
      performance: {
        duration_ms: duration.toFixed(2),
        data_size: JSON.stringify(testData).length,
        retrieved_correctly: JSON.stringify(retrieved) === JSON.stringify(testData)
      },
      cache_status: status,
      test_data: retrieved
    });

  } catch (error) {
    console.error('[Test] Cache test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cache_status: cacheService.getStatus()
    });
  }
});

// Test session caching
router.post('/cache/session/test', async (req, res) => {
  try {
    const testUser = {
      id: 999,
      public_id: null,
      username: 'cache-test-user',
      password: 'test-password',
      email: 'test@cache.com',
      firstName: 'Cache',
      lastName: 'User',
      role: 'administrator' as const,
      name: 'Cache Test User',
      phoneNumber: null,
      status: null,
      resumeUrl: null,
      notes: null,
      extraMessage: null,
      createdAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null
    };

    const sessionId = `test-session-${Date.now()}`;

    console.log('[Test] Testing session caching...');
    const startTime = process.hrtime.bigint();

    // Cache session
    await cacheService.cacheSession(sessionId, testUser, { ttl: 300 });

    // Retrieve session
    const retrievedSession = await cacheService.getSession(sessionId);

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;

    res.json({
      success: true,
      session_test: {
        duration_ms: duration.toFixed(2),
        cached_user: testUser,
        retrieved_user: retrievedSession,
        data_matches: JSON.stringify(testUser) === JSON.stringify(retrievedSession)
      },
      cache_status: cacheService.getStatus()
    });

  } catch (error) {
    console.error('[Test] Session cache test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cache_status: cacheService.getStatus()
    });
  }
});

// Batch operation test
router.post('/cache/batch/test', async (req, res) => {
  try {
    const userId = 888;
    const testData = {
      session: {
        id: userId,
        public_id: null,
        username: 'batch-test-user',
        password: 'test-password',
        email: 'batch@test.com',
        firstName: 'Batch',
        lastName: 'User',
        role: 'manager' as const,
        name: 'Batch Test User',
        phoneNumber: '+1234567890',
        status: null,
        resumeUrl: null,
        notes: null,
        extraMessage: null,
        createdAt: new Date(),
        passwordResetToken: null,
        passwordResetExpires: null
      },
      messages: [
        { id: 1, content: 'Test message 1', timestamp: Date.now() },
        { id: 2, content: 'Test message 2', timestamp: Date.now() + 1000 }
      ],
      profile: {
        id: userId,
        firstName: 'Batch',
        lastName: 'Test',
        phoneNumber: '+1234567890'
      }
    };

    console.log('[Test] Testing batch cache operations...');
    const startTime = process.hrtime.bigint();

    // Warmup user cache with batch operation
    await cacheService.warmupUserCache(userId, testData);

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;

    res.json({
      success: true,
      batch_test: {
        duration_ms: duration.toFixed(2),
        user_id: userId,
        data_cached: testData
      },
      cache_status: cacheService.getStatus()
    });

  } catch (error) {
    console.error('[Test] Batch cache test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cache_status: cacheService.getStatus()
    });
  }
});

// Get cache status
router.get('/cache/status', (req, res) => {
  const status = cacheService.getStatus();
  res.json({
    cache_service: status,
    environment: {
      docker_env: !!process.env.DOCKER_ENV,
      node_env: process.env.NODE_ENV
    }
  });
});

export default router;