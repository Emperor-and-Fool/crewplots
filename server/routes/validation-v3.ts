import express from 'express';
import { dataAggregationEngine } from '../services/validation/DataAggregationEngine';
import { validationEngine30 } from '../services/validation/ValidationEngine30';
import { dataOrchestrator3 } from '../services/validation/DataOrchestrator3';
import { authenticateUser, authenticateUserLazy } from '../middleware/auth';
import type { DataAggregationTask } from '../services/validation/DataAggregationEngine';
import type { User } from '@shared/schema';
// Import messaging package from ValidationEngine30 registry
import { mapWorkflowToValidationPermissions } from '../services/validation/validation-perm-mapping';

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

/**
 * ValidationEngine30 Direct Execution Endpoint
 * POST /api/validation/v3/execute
 * 
 * Validates request and executes database operations directly
 * Simple validate + execute pattern for data retrieval
 */
router.post('/execute', authenticateUser, async (req, res) => {
  try {
    const { operation, entityType, data, context } = req.body;
    
    console.log(`🎯 VALIDATION ENGINE 30: Direct execution ${operation} for ${entityType}`);
    console.log('🗑️ EXECUTE ENDPOINT: Request body:', JSON.stringify(req.body, null, 2));
    
    // CRITICAL DEBUG: Check if this is a delete operation for scheduler
    if (operation === 'delete' && entityType === 'scheduleBlock') {
      console.log('🔥 DELETE REQUEST DETECTED: scheduleBlock delete operation in /execute endpoint');
      console.log('🔥 DELETE DATA:', JSON.stringify(data, null, 2));
    }
    
    // Use centralized permission mapper to convert user context to validation permissions
    const userRole = (req.user as any)?.role;
    const workflowPermissions = (req.user as any)?.workflowPermissions || {};
    
    // Map user context to validation permissions using database-first permission service
    const validationPermissions = await mapWorkflowToValidationPermissions({
      id: (req.user as any)?.id,
      username: (req.user as any)?.username,
      role: userRole,
      permissions: context?.permissions || [],
      workflowPermissions: workflowPermissions
    } as any);
    
    console.log(`🔐 VALIDATION ENGINE 30: User role: ${userRole}, mapped permissions:`, validationPermissions);

    // Use ValidationEngine30 direct validation + execution with nested user object
    const result = await validationEngine30.validateAndExecute(
      operation || 'read',
      entityType,
      data,
      {
        user: {
          id: (req.user as any)?.id,
          username: (req.user as any)?.username,
          role: userRole,
          permissions: validationPermissions,
          workflowPermissions: workflowPermissions
        },
        userId: (req.user as any)?.id,
        username: (req.user as any)?.username,
        role: userRole,
        permissions: validationPermissions,
        workflowPermissions: workflowPermissions,
        operation: operation || 'read',
        ...context
      }
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('🚨 VALIDATION ENGINE 30: Direct execution failed:', error);
    res.status(500).json({
      success: false,
      error: 'Direct execution failed',
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

// MESSAGING TEST ENDPOINT - Plan 053 integration verification
router.post('/test-messaging', authenticateUser, async (req, res) => {
  console.log('🚨 ENDPOINT HIT: /api/validation/v3/test-messaging route reached');
  console.log('🔍 AUTH DEBUG: req.user exists:', !!req.user);
  console.log('🔍 AUTH DEBUG: req.session exists:', !!req.session);
  console.log('🔍 AUTH DEBUG: req.isAuthenticated exists:', typeof req.isAuthenticated);
  
  try {
    console.log('🧪 MESSAGING VALIDATION TEST: Testing messaging package integration');
    console.log('🧪 User context:', { 
      userId: (req.user as any)?.id, 
      userRole: (req.user as any)?.role,
      username: (req.user as any)?.username
    });
    
    // Test data for messaging validation
    const testData = {
      content: 'This is a test message for ValidationEngine30 integration',
      workflow: 'application',
      messageType: 'rich-text',
      priority: 'normal',
      isPrivate: false
    };
    
    console.log('🧪 Test data:', JSON.stringify(testData, null, 2));
    
    // Test messaging validation through ValidationEngine30
    const result = await validationEngine30.validateAndExecute(
      'create',
      'messaging',
      testData,
      {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest',
        permissions: ['schedule.create'] // Required permission for messaging operations
      }
    );
    
    console.log('🧪 Validation result:', JSON.stringify(result, null, 2));
    
    res.json({
      success: result.overall.isValid,
      result,
      testData,
      message: 'Messaging package validation test completed',
      user: {
        id: (req.user as any)?.id,
        username: (req.user as any)?.username,
        role: (req.user as any)?.role
      },
      detailedErrors: result.overall.errors,
      validationThreads: {
        schema: result.threads.schema,
        permission: result.threads.permission,
        businessRules: result.threads.businessRules,
        transaction: result.threads.transaction
      }
    });
  } catch (error) {
    console.error('🚨 MESSAGING VALIDATION TEST ERROR:', error);
    console.error('🚨 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Messaging test failed',
      stack: error instanceof Error ? error.stack : undefined
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
        userRole: (req.user as any)?.role || 'guest',
        username: (req.user as any)?.username,
        role: (req.user as any)?.role,
        permissions: (req.user as any)?.permissions || [],
        workflowPermissions: (req.user as any)?.workflowPermissions || {}
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

// POST /api/validation/v3/auth/me - Session validation endpoint (RESTful standard) - DISABLED FOR TESTING
/*
router.post('/auth/me', authenticateUser, async (req, res) => {
  try {
    console.log('🔐 VE30 AUTH: Session validation request');
    
    // Enable CORS for all origins in development
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // User is already authenticated by middleware
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        authenticated: false, 
        error: 'Authentication required' 
      });
    }

    // Return authenticated user data
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        locationId: user.locationId,
        phoneNumber: user.phoneNumber,
        uniqueCode: user.uniqueCode
      }
    });
  } catch (error) {
    console.error('❌ VE30 AUTH: Session validation error:', error);
    res.status(500).json({ 
      authenticated: false, 
      error: 'Session validation failed' 
    });
  }
});
*/

// POST /api/validation/v3/auth - Direct implementation (no proxy)
router.post('/auth', async (req, res) => {
  console.log('🔍 VE30 AUTH: REQUEST RECEIVED - Starting auth check without middleware');
  console.log('🔍 VE30 AUTH: Session ID present:', !!req.sessionID);
  console.log('🔍 VE30 AUTH: Cookies:', req.headers.cookie || 'none');
  
  // Manual authentication check to avoid circular dependency
  try {
    console.log('🔐 VE30 AUTH STANDALONE: Session validation request (no proxy)');
    
    // Enable CORS for all origins in development
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // User is already authenticated by middleware
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        authenticated: false, 
        error: 'Authentication required' 
      });
    }

    // Return authenticated user data
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        locationId: user.locationId,
        phoneNumber: user.phoneNumber,
        uniqueCode: user.uniqueCode
      }
    });
  } catch (error) {
    console.error('❌ VE30 AUTH STANDALONE: Session validation error:', error);
    res.status(500).json({ 
      authenticated: false,
      error: 'Session validation failed' 
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

// POST /api/validation/v3/messaging/test - Test messaging validation via ValidationEngine30
router.post('/messaging/test', authenticateUser, async (req, res) => {
  try {
    console.log('🔍 MESSAGING V3 TEST: Testing messaging via ValidationEngine30');
    
    // Test data for messaging creation
    const testData = {
      content: 'Test message via ValidationEngine v3',
      workflow: 'application',
      messageType: 'rich-text',
      priority: 'normal',
      isPrivate: false
    };

    // Test messaging creation through ValidationEngine30
    const result = await validationEngine30.validateAndExecute(
      'create',
      'messaging',
      testData,
      {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest'
      }
    );
    
    res.json({
      success: true,
      message: 'Messaging ValidationEngine30 test completed',
      data: {
        validationResult: result,
        testData
      }
    });
  } catch (error) {
    console.error('🚨 MESSAGING V3 TEST ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/validation/v3/messaging/notes - Read notes via ValidationEngine v3
router.get('/messaging/notes', authenticateUser, async (req, res) => {
  try {
    console.log('🔍 MESSAGING V3: Reading notes via ValidationEngine v3');
    
    const result = await validationEngine30.validateAndExecute(
      'read',
      'messaging.read',
      {
        userId: (req.user as any)?.id,
        workflow: req.query.workflow || 'application'
      },
      {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest'
      }
    );

    if (result.overall.isValid) {
      res.json({
        success: true,
        message: 'Notes retrieved via ValidationEngine v3',
        data: result.threads.transaction?.data || []
      });
    } else {
      res.status(400).json({
        success: false,
        errors: result.overall.errors,
        message: 'Validation failed'
      });
    }
  } catch (error) {
    console.error('🚨 MESSAGING V3 ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/validation/v3/messaging/notes/:id - Update notes via ValidationEngine v3
router.put('/messaging/notes/:id', authenticateUser, async (req, res) => {
  try {
    console.log('🔍 MESSAGING V3: Updating note via ValidationEngine v3');
    
    const result = await validationEngine30.validateAndExecute(
      'update',
      'messaging.update',
      {
        id: parseInt(req.params.id),
        content: req.body.content,
        messageType: req.body.messageType,
        priority: req.body.priority,
        isPrivate: req.body.isPrivate
      },
      {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest'
      }
    );

    if (result.overall.isValid) {
      res.json({
        success: true,
        message: 'Note updated via ValidationEngine v3',
        data: result.threads.transaction?.data
      });
    } else {
      res.status(400).json({
        success: false,
        errors: result.overall.errors,
        message: 'Validation failed'
      });
    }
  } catch (error) {
    console.error('🚨 MESSAGING V3 ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/validation/v3/messaging/notes/:id - Delete notes via ValidationEngine v3
router.delete('/messaging/notes/:id', authenticateUser, async (req, res) => {
  try {
    console.log('🔍 MESSAGING V3: Deleting note via ValidationEngine v3');
    
    const result = await validationEngine30.validateAndExecute(
      'delete',
      'messaging.delete',
      {
        id: parseInt(req.params.id)
      },
      {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest'
      }
    );

    if (result.overall.isValid) {
      res.json({
        success: true,
        message: 'Note deleted via ValidationEngine v3'
      });
    } else {
      res.status(400).json({
        success: false,
        errors: result.overall.errors,
        message: 'Validation failed'
      });
    }
  } catch (error) {
    console.error('🚨 MESSAGING V3 ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/validation/v3/motivation-notes - Create motivation note via ValidationEngine30
router.post('/motivation-notes', authenticateUser, async (req, res) => {
  try {
    console.log('🔍 MOTIVATION NOTE V3: Creating motivation note via ValidationEngine30');
    
    const result = await validationEngine30.validateAndExecute(
      'create',
      'motivationNote',
      {
        content: req.body.content,
        userId: req.body.userId,
        workflow: 'user-management',
        messageType: 'motivation-note',
        priority: req.body.priority || 'normal',
        isPrivate: true,
        noteType: 'motivation',
        visibility: 'private',
        createdBy: (req.user as any)?.id
      },
      {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest'
      }
    );

    if (result.overall.isValid) {
      res.json({
        success: true,
        message: 'Motivation note created via ValidationEngine v3',
        data: result.threads.transaction?.data,
        validationMetadata: result.overall.metadata
      });
    } else {
      res.status(400).json({
        success: false,
        errors: result.overall.errors,
        warnings: result.overall.warnings,
        message: 'Motivation note validation failed'
      });
    }
  } catch (error) {
    console.error('🚨 MOTIVATION NOTE V3 ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/validation/v3/motivation-notes/:userId - Update motivation note via ValidationEngine30
router.put('/motivation-notes/:userId', authenticateUser, async (req, res) => {
  try {
    console.log('🔍 MOTIVATION NOTE V3: Updating motivation note via ValidationEngine30');
    
    const result = await validationEngine30.validateAndExecute(
      'update',
      'motivationNote',
      {
        content: req.body.content,
        userId: parseInt(req.params.userId),
        workflow: 'user-management',
        messageType: 'motivation-note',
        priority: req.body.priority || 'normal',
        isPrivate: true,
        noteType: 'motivation',
        visibility: 'private',
        createdBy: (req.user as any)?.id
      },
      {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest'
      }
    );

    if (result.overall.isValid) {
      res.json({
        success: true,
        message: 'Motivation note updated via ValidationEngine v3',
        data: result.threads.transaction?.data,
        validationMetadata: result.overall.metadata
      });
    } else {
      res.status(400).json({
        success: false,
        errors: result.overall.errors,
        warnings: result.overall.warnings,
        message: 'Motivation note validation failed'
      });
    }
  } catch (error) {
    console.error('🚨 MOTIVATION NOTE V3 ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Lightweight auth endpoint for auth-context - uses lazy authentication
router.get('/auth', authenticateUserLazy, async (req, res) => {
  try {
    console.log('🔐 AUTH PROFILE: Lightweight auth endpoint accessed');
    
    // Use ValidationEngine30 with authProfile package for minimal data
    const result = await validationEngine30.validateAndExecute(
      'read',
      'authProfile',
      {
        id: (req.user as any)?.id,
        username: (req.user as any)?.username,
        role: (req.user as any)?.role,
        workflowPermissions: (req.user as any)?.workflowPermissions || {},
        blockedPermissions: (req.user as any)?.blockedPermissions || []
      },
      {
        userId: (req.user as any)?.id || 0,
        userRole: (req.user as any)?.role || 'guest'
        // No aggregatedData - lightweight auth pattern
      }
    );
    
    // Return session validation structure for frontend compatibility
    if (result.overall.isValid && req.user) {
      res.json({
        authenticated: true,
        user: {
          id: (req.user as any).id,
          username: (req.user as any).username,
          role: (req.user as any).role,
          loggedIn: true
        }
      });
    } else {
      res.status(401).json({
        authenticated: false,
        error: 'Authentication validation failed'
      });
    }
  } catch (error) {
    console.error('🚨 AUTH PROFILE ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Auth profile error'
    });
  }
});

// POST /api/validation/v3/public - Public validation endpoint (no authentication required)
router.post('/public', async (req, res) => {
  try {
    console.log('🔓 VE30 PUBLIC ENDPOINT: Processing unauthenticated request');
    
    // Enable CORS for all origins in development
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    const { operation, entityType, data } = req.body;
    
    // Security validation for public endpoint
    if (!operation || !entityType || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: operation, entityType, data'
      });
    }
    
    // Restrict public endpoint to user registration only
    if (entityType !== 'userRegistration') {
      return res.status(403).json({
        success: false,
        error: 'Public endpoint only supports userRegistration operations'
      });
    }
    
    if (operation !== 'create') {
      return res.status(403).json({
        success: false,
        error: 'Public endpoint only supports create operations'
      });
    }
    
    // Process public validation request through ValidationEngine30
    const result = await validationEngine30.validateAndExecute(
      operation,
      entityType,
      data,
      {
        userId: 0, // Anonymous user
        userRole: 'public' // Public role for unauthenticated requests
      }
    );
    
    res.json({
      success: result.overall.isValid,
      result,
      pattern: 'public-validation',
      metadata: {
        operation,
        entityType,
        timestamp: new Date().toISOString(),
        publicEndpoint: true
      }
    });
  } catch (error) {
    console.error('🚨 PUBLIC VALIDATION ERROR:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Public validation failed'
    });
  }
});

export default router;