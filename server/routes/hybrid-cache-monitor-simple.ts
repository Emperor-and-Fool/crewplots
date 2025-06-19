import { Router } from 'express';
import { hybridCacheService } from '../services/hybrid-cache-service-v2';

const router = Router();

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

// Get Redis service status
router.get('/redis-status', async (req, res) => {
  try {
    const status = hybridCacheService.getRedisStatus();
    res.json({
      success: true,
      redisStatus: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;