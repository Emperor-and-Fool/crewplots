import express from 'express';
import { MongoClient } from 'mongodb';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

let mongoClient = null;
let mongoDb = null;
let mongodProcess = null;

// Start MongoDB process
async function startMongoDB() {
  return new Promise((resolve, reject) => {
    // Ensure data directory exists
    const dataDir = './mongodb_data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Start MongoDB with tuned settings
    mongodProcess = spawn('mongod', [
      '--dbpath', dataDir,
      '--port', '27017',
      '--bind_ip', '127.0.0.1',
      '--wiredTigerCacheSizeGB', '0.25',
      '--logpath', './mongodb_proxy.log',
      '--fork'
    ]);

    mongodProcess.on('error', (error) => {
      console.error('Failed to start MongoDB:', error);
      reject(error);
    });

    // Wait for MongoDB to start
    setTimeout(async () => {
      try {
        await connectToMongoDB();
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 3000);
  });
}

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    mongoClient = new MongoClient('mongodb://127.0.0.1:27017');
    await mongoClient.connect();
    mongoDb = mongoClient.db('crewplots_documents');
    console.log('✅ MongoDB Proxy connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mongodb: mongoDb ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Insert document
app.post('/collections/:collection/insert', async (req, res) => {
  try {
    if (!mongoDb) {
      return res.status(503).json({ error: 'MongoDB not connected' });
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
      return res.status(503).json({ error: 'MongoDB not connected' });
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
      return res.status(503).json({ error: 'MongoDB not connected' });
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
      return res.status(503).json({ error: 'MongoDB not connected' });
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
      return res.status(503).json({ error: 'MongoDB not connected' });
    }
    
    const { collection } = req.params;
    const query = req.query.q ? JSON.parse(req.query.q) : {};
    
    const result = await mongoDb.collection(collection).deleteOne(query);
    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GridFS file upload
app.post('/gridfs/:bucket/upload', async (req, res) => {
  try {
    if (!mongoDb) {
      return res.status(503).json({ error: 'MongoDB not connected' });
    }
    
    const { bucket } = req.params;
    const { filename, metadata } = req.body;
    
    const gridFS = new mongoDb.GridFSBucket(mongoDb, { bucketName: bucket });
    const uploadStream = gridFS.openUploadStream(filename, { metadata });
    
    // For now, return success - extend with actual file handling as needed
    res.json({ fileId: uploadStream.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the proxy server
async function startProxyServer() {
  try {
    console.log('🚀 Starting MongoDB Proxy Server...');
    
    // Start MongoDB first
    await startMongoDB();
    
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
  
  if (mongodProcess) {
    mongodProcess.kill();
  }
  
  process.exit(0);
});

// Start the server
startProxyServer();