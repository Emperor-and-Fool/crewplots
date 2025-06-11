import { Router } from 'express';
import { hybridMessageService } from '../services/hybrid-message-service';

const router = Router();

/**
 * Test endpoint to create a hybrid message
 * POST /test-hybrid/message
 */
router.post('/message', async (req, res) => {
  try {
    const { userId, content, messageType, workflow, metadata } = req.body;

    if (!userId || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId and content' 
      });
    }

    console.log('🧪 Testing hybrid message creation...');
    console.log('📝 Content length:', content.length);
    console.log('👤 User ID:', userId);
    console.log('🏷️ Message type:', messageType || 'text');
    console.log('🔄 Workflow:', workflow || 'general');

    const hybridMessage = await hybridMessageService.createMessage({
      userId: parseInt(userId),
      content,
      messageType: messageType || 'text',
      workflow: workflow || 'general',
      metadata: metadata || { testCreated: true }
    });

    console.log('✅ Hybrid message created successfully');
    console.log('🆔 Message ID:', hybridMessage.id);
    console.log('📄 Document ID:', hybridMessage.documentId);

    res.json({
      success: true,
      message: 'Hybrid message created successfully',
      data: {
        id: hybridMessage.id,
        documentId: hybridMessage.documentId,
        userId: hybridMessage.userId,
        messageType: hybridMessage.messageType,
        workflow: hybridMessage.workflow,
        contentLength: hybridMessage.content.length,
        storedInMongoDB: !!hybridMessage.documentId,
        createdAt: hybridMessage.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Hybrid message creation failed:', error);
    res.status(500).json({ 
      error: 'Failed to create hybrid message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test endpoint to retrieve a hybrid message
 * GET /test-hybrid/message/:id
 */
router.get('/message/:id', async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    console.log('🔍 Retrieving hybrid message:', messageId);

    const hybridMessage = await hybridMessageService.getMessage(messageId);

    if (!hybridMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    console.log('✅ Hybrid message retrieved');
    console.log('📄 Document ID:', hybridMessage.documentId);
    console.log('📝 Content source:', hybridMessage.documentId ? 'MongoDB' : 'PostgreSQL');

    res.json({
      success: true,
      data: {
        id: hybridMessage.id,
        userId: hybridMessage.userId,
        content: hybridMessage.content,
        messageType: hybridMessage.messageType,
        workflow: hybridMessage.workflow,
        documentId: hybridMessage.documentId,
        contentSource: hybridMessage.documentId ? 'MongoDB' : 'PostgreSQL',
        createdAt: hybridMessage.createdAt,
        updatedAt: hybridMessage.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Hybrid message retrieval failed:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve hybrid message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test endpoint to get all messages for a user
 * GET /test-hybrid/user/:userId/messages
 */
router.get('/user/:userId/messages', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    console.log('📋 Retrieving messages for user:', userId);

    const messages = await hybridMessageService.getMessagesForUser(userId, limit);

    const summary = {
      totalMessages: messages.length,
      mongoDBStoredCount: messages.filter(m => m.documentId).length,
      postgresStoredCount: messages.filter(m => !m.documentId).length
    };

    console.log('✅ Retrieved user messages');
    console.log('📊 Summary:', summary);

    res.json({
      success: true,
      summary,
      data: messages.map(msg => ({
        id: msg.id,
        content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
        messageType: msg.messageType,
        workflow: msg.workflow,
        documentId: msg.documentId,
        contentSource: msg.documentId ? 'MongoDB' : 'PostgreSQL',
        createdAt: msg.createdAt
      }))
    });

  } catch (error) {
    console.error('❌ User messages retrieval failed:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve user messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test endpoint to check MongoDB proxy status
 * GET /test-hybrid/status
 */
router.get('/status', async (req, res) => {
  try {
    console.log('🔍 Checking hybrid system status...');

    const mongoProxyAvailable = await hybridMessageService.isMongoDBProxyAvailable();

    // Test MongoDB proxy health if available
    let mongoProxyHealth = null;
    if (mongoProxyAvailable) {
      try {
        const response = await fetch('http://localhost:3001/health');
        mongoProxyHealth = await response.json();
      } catch (error) {
        console.warn('MongoDB proxy health check failed:', error);
      }
    }

    const status = {
      hybridSystemActive: true,
      mongoDBProxyAvailable: mongoProxyAvailable,
      mongoProxyHealth,
      fallbackToPostgreSQL: !mongoProxyAvailable,
      timestamp: new Date().toISOString()
    };

    console.log('📊 System status:', status);

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('❌ Status check failed:', error);
    res.status(500).json({ 
      error: 'Failed to check system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;