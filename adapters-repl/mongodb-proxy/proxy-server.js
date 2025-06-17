import express from 'express';
import { MongoClient } from 'mongodb';
import { onDemandMongoService } from '../mongodb-ondemand/on-demand-mongodb.js';

const app = express();
app.use(express.json());

let mongoClient = null;
let mongoDb = null;

// Connect to MongoDB via on-demand service
async function connectToMongoDB() {
  try {
    // Ensure MongoDB service is ready
    const serviceReady = await onDemandMongoService.ensureReady();
    if (!serviceReady) {
      throw new Error('MongoDB on-demand service failed to start');
    }

    mongoClient = new MongoClient('mongodb://127.0.0.1:27017');
    await mongoClient.connect();
    mongoDb = mongoClient.db('crewplots_documents');
    console.log('✅ MongoDB Proxy connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB Proxy connection failed:', error.message);
    return false;
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  const mongoStatus = mongoDb ? 'connected' : 'disconnected';
  const serviceStatus = onDemandMongoService.getStatus();
  
  res.json({ 
    status: 'ok', 
    mongodb: mongoStatus,
    service: serviceStatus,
    timestamp: new Date().toISOString()
  });
});

// Insert document
app.post('/collections/:collection/insert', async (req, res) => {
  try {
    if (!mongoDb) {
      const connected = await connectToMongoDB();
      if (!connected) {
        return res.status(503).json({ error: 'MongoDB not available' });
      }
    }
    
    const { collection } = req.params;
    const document = req.body;
    
    const result = await mongoDb.collection(collection).insertOne(document);
    res.json({ insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find documents
app.get('/collections/:collection/find', async (req, res) => {
  try {
    if (!mongoDb) {
      const connected = await connectToMongoDB();
      if (!connected) {
        return res.status(503).json({ error: 'MongoDB not available' });
      }
    }
    
    const { collection } = req.params;
    const query = req.query.q ? JSON.parse(req.query.q) : {};
    const limit = parseInt(req.query.limit) || 100;
    
    const documents = await mongoDb.collection(collection)
      .find(query)
      .limit(limit)
      .toArray();
    
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find one document
app.get('/collections/:collection/findOne', async (req, res) => {
  try {
    if (!mongoDb) {
      const connected = await connectToMongoDB();
      if (!connected) {
        return res.status(503).json({ error: 'MongoDB not available' });
      }
    }
    
    const { collection } = req.params;
    const query = req.query.q ? JSON.parse(req.query.q) : {};
    
    const document = await mongoDb.collection(collection).findOne(query);
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update document
app.put('/collections/:collection/update', async (req, res) => {
  try {
    if (!mongoDb) {
      const connected = await connectToMongoDB();
      if (!connected) {
        return res.status(503).json({ error: 'MongoDB not available' });
      }
    }
    
    const { collection } = req.params;
    const { query, update } = req.body;
    
    const result = await mongoDb.collection(collection).updateOne(query, update);
    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete document
app.delete('/collections/:collection/delete', async (req, res) => {
  try {
    if (!mongoDb) {
      const connected = await connectToMongoDB();
      if (!connected) {
        return res.status(503).json({ error: 'MongoDB not available' });
      }
    }
    
    const { collection } = req.params;
    const query = req.query.q ? JSON.parse(req.query.q) : {};
    
    const result = await mongoDb.collection(collection).deleteOne(query);
    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the proxy server
async function startProxyServer() {
  try {
    console.log('🚀 Starting MongoDB Proxy Server...');
    
    // Attempt initial connection
    await connectToMongoDB();
    
    // Start Express server
    const PORT = process.env.MONGO_PROXY_PORT || 3001;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ MongoDB Proxy Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start proxy server:', error);
    process.exit(1);
  }
}

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down MongoDB Proxy Server...');
  
  if (mongoClient) {
    await mongoClient.close();
  }
  
  await onDemandMongoService.stop();
  process.exit(0);
});

// Start the server
startProxyServer();