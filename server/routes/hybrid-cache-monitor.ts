import { Router } from 'express';
import { hybridCacheService } from '../services/hybrid-cache-service';

const router = Router();

// Test basic cache operations
router.post('/test-basic', async (req, res) => {
  try {
    const testKey = `test:${Date.now()}`;
    const testValue = { message: 'Hybrid cache test', timestamp: new Date().toISOString() };

    // Set value
    await hybridCacheService.set(testKey, testValue, { ttl: 300, category: 'test' });
    
    // Get value
    const retrieved = await hybridCacheService.get(testKey);
    
    res.json({
      success: true,
      operation: 'basic-test',
      testKey,
      testValue,
      retrieved,
      match: JSON.stringify(testValue) === JSON.stringify(retrieved)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test connection status
router.get('/connections', async (req, res) => {
  try {
    const connections = await hybridCacheService.testConnections();
    res.json({
      success: true,
      connections,
      status: connections.overall ? 'operational' : 'degraded'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get cache statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await hybridCacheService.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test Redis failure scenario
router.post('/test-redis-failure', async (req, res) => {
  try {
    const testKey = `failover:${Date.now()}`;
    const testValue = { 
      message: 'Testing PostgreSQL fallback', 
      timestamp: new Date().toISOString(),
      redisUnavailable: true
    };

    // Force PostgreSQL-only operation (simulate Redis failure)
    await hybridCacheService.set(testKey, testValue, { 
      ttl: 300, 
      category: 'failover-test',
      skipInDocker: false // This might cause Redis to fail in some environments
    });
    
    // Try to retrieve (should work from PostgreSQL)
    const retrieved = await hybridCacheService.get(testKey, { forceRefresh: true });
    
    res.json({
      success: true,
      operation: 'redis-failure-test',
      testKey,
      testValue,
      retrieved,
      fallbackWorking: retrieved !== null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clean expired cache entries
router.post('/clean-expired', async (req, res) => {
  try {
    const deletedCount = await hybridCacheService.cleanExpired();
    res.json({
      success: true,
      operation: 'clean-expired',
      deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete cache by category
router.delete('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const deletedCount = await hybridCacheService.deleteByCategory(category);
    res.json({
      success: true,
      operation: 'delete-category',
      category,
      deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Performance test - multiple operations
router.post('/performance-test', async (req, res) => {
  try {
    const operations = 50;
    const startTime = Date.now();
    const promises = [];

    // Create multiple cache operations
    for (let i = 0; i < operations; i++) {
      const key = `perf:${i}:${Date.now()}`;
      const value = { index: i, data: `Performance test data ${i}` };
      promises.push(hybridCacheService.set(key, value, { ttl: 60, category: 'performance' }));
    }

    await Promise.all(promises);
    const writeTime = Date.now() - startTime;

    // Read operations
    const readStartTime = Date.now();
    const readPromises = [];
    for (let i = 0; i < operations; i++) {
      const key = `perf:${i}:${Date.now()}`;
      readPromises.push(hybridCacheService.get(key));
    }

    await Promise.all(readPromises);
    const readTime = Date.now() - readStartTime;

    res.json({
      success: true,
      operation: 'performance-test',
      operations,
      writeTime: `${writeTime}ms`,
      readTime: `${readTime}ms`,
      avgWriteTime: `${(writeTime / operations).toFixed(2)}ms`,
      avgReadTime: `${(readTime / operations).toFixed(2)}ms`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;