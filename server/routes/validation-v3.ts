import express from 'express';
import { dataAggregationEngine } from '../services/validation/DataAggregationEngine';
import { validationEngine30 } from '../services/validation/ValidationEngine30';
import { dataOrchestrator3 } from '../services/validation/DataOrchestrator3';
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
        connectionId: `test-${(req.user as any)?.id || 'unknown'}`
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

// Test ValidationEngine30 direct validation
router.post('/validation30/test', authenticateUser, async (req, res) => {
  try {
    console.log('🧪 TESTING ValidationEngine30 direct validation');
    
    // Test ValidationEngine30 with simple data
    const result = await validationEngine30.validateAndExecute(
      'create',
      'testEntity',
      {
        name: 'Test Entity',
        value: 42
      },
      {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest'
        // No aggregatedData - direct validation
      }
    );
    
    res.json({
      success: true,
      message: 'ValidationEngine30 test complete',
      testResult: result,
      user: req.user
    });
  } catch (error) {
    console.error('🚨 VALIDATION ENGINE 30 TEST ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test DataOrchestrator3 orchestration
router.post('/orchestrator3/test', authenticateUser, async (req, res) => {
  try {
    console.log('🧪 TESTING DataOrchestrator3 orchestration');
    
    // Test DataOrchestrator3 with orchestration request
    const result = await dataOrchestrator3.orchestrate({
      operation: 'orchestrate', // Use aggregate-then-validate pattern
      entityType: 'testEntity',
      data: {
        name: 'Orchestrated Test Entity',
        value: 100
      },
      validationOperation: 'create',
      context: {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest'
      }
    });
    
    res.json({
      success: true,
      message: 'DataOrchestrator3 test complete',
      testResult: result,
      user: req.user
    });
  } catch (error) {
    console.error('🚨 DATA ORCHESTRATOR 3 TEST ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PLAN 050: Dual-use pattern endpoints as specified
// POST /api/validation/v3/validate (direct validation - fast path)
router.post('/validate', authenticateUser, async (req, res) => {
  try {
    console.log('🧪 VALIDATION ENGINE 30: Direct validation');
    
    const { operation, entityType, data, entityId } = req.body;
    
    // Direct validation through ValidationEngine30 (no aggregation)
    const result = await validationEngine30.validateAndExecute(
      operation,
      entityType,
      data,
      {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest'
        // No aggregatedData - direct validation pattern
      },
      entityId
    );
    
    res.json({
      success: result.overall.isValid,
      result,
      pattern: 'direct-validation',
      user: req.user
    });
  } catch (error) {
    console.error('🚨 DIRECT VALIDATION ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Direct validation failed'
    });
  }
});

// POST /api/validation/v3/orchestrate (aggregate-then-validate - comprehensive path)
router.post('/orchestrate', authenticateUser, async (req, res) => {
  try {
    console.log('🧪 DATA ORCHESTRATOR 3: Aggregate-then-validate');
    
    const { operation, entityType, data, validationOperation, entityId } = req.body;
    
    // Orchestrated validation with data aggregation
    const result = await dataOrchestrator3.orchestrate({
      operation: operation || 'orchestrate',
      entityType,
      data,
      validationOperation: validationOperation || 'create',
      context: {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest'
      },
      entityId
    });
    
    res.json({
      success: result.success,
      result,
      pattern: 'aggregate-then-validate',
      user: req.user
    });
  } catch (error) {
    console.error('🚨 ORCHESTRATION ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Orchestration failed'
    });
  }
});

export default router;