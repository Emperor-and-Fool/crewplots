import express from 'express';
import { dataAggregationEngine } from '../services/validation/DataAggregationEngine';
import { authenticateUser } from '../middleware/auth';
import type { DataAggregationTask } from '../services/validation/DataAggregationEngine';
import type { User } from '@shared/schema';

const router = express.Router();

/**
 * ValidationEngine 3.0 Data Aggregation Endpoint
 * POST /api/validation/v3/aggregate
 * 
 * Handles unified data aggregation tasks across hybrid storage
 * Based on 049 evidence and 048 implementation plan
 */
router.post('/aggregate', authenticateUser, async (req, res) => {
  console.log('[ValidationEngine 3.0] Data aggregation request received');
  
  try {
    const task: DataAggregationTask = req.body;
    
    // Validate required task properties
    if (!task.entityType || (!task.entityId && task.entityId !== 0)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: entityType and entityId'
      });
    }
    
    console.log(`[ValidationEngine 3.0] Processing aggregation task for ${task.entityType}:${task.entityId}`);
    
    // Execute aggregation
    const result = await dataAggregationEngine.aggregate(task);
    
    if (result) {
      console.log(`[ValidationEngine 3.0] Aggregation successful for ${task.entityType}:${task.entityId}`);
      res.json({
        success: true,
        data: result,
        metadata: {
          aggregatedAt: new Date().toISOString(),
          taskType: task.entityType,
          sources: Object.keys(task.requiredData || {})
        }
      });
    } else {
      console.log(`[ValidationEngine 3.0] No data found for ${task.entityType}:${task.entityId}`);
      res.status(404).json({
        success: false,
        error: 'Entity not found or no data available'
      });
    }
  } catch (error) {
    console.error('[ValidationEngine 3.0] Aggregation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal aggregation error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test endpoint for ValidationEngine 3.0
 * GET /api/validation/v3/test
 */
router.get('/test', authenticateUser, async (req, res) => {
  console.log('[ValidationEngine 3.0] Test endpoint accessed');
  
  try {
    // Test user aggregation with current user
    const testTask: DataAggregationTask = {
      entityType: 'user',
      entityId: (req.user as any).id,
      requiredData: {
        postgresql: ['user'],
        mongodb: ['notes'],
        redis: ['cache-keys']
      },
      compilationRules: {
        enhance: true,
        permissions: true,
        metadata: true
      },
      cacheStrategy: {
        category: 'user-profile',
        ttl: 300,
        connectionId: `test-${req.user.id}`
      }
    };
    
    const result = await dataAggregationEngine.aggregate(testTask);
    
    res.json({
      success: true,
      message: 'ValidationEngine 3.0 operational',
      testResult: result,
      user: req.user as any
    });
  } catch (error) {
    console.error('[ValidationEngine 3.0] Test error:', error);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Cache management endpoint
 * DELETE /api/validation/v3/cache/:entityType/:entityId
 */
router.delete('/cache/:entityType/:entityId', authenticateUser, async (req, res) => {
  const { entityType, entityId } = req.params;
  
  try {
    await dataAggregationEngine.clearCache(entityType, entityId);
    
    res.json({
      success: true,
      message: `Cache cleared for ${entityType}:${entityId}`
    });
  } catch (error) {
    console.error('[ValidationEngine 3.0] Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Cache clear failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;