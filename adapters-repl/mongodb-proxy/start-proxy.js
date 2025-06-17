import express from 'express';
import { MongoClient } from 'mongodb';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

let mongoClient = null;
let mongoDb = null;
let mongoProcess = null;

// Check if MongoDB is already running (on-demand service)
async function checkMongoDB() {
  try {
    console.log('🔍 Checking for existing MongoDB instance...');
    const testClient = new MongoClient('mongodb://127.0.0.1:27017');
    await testClient.connect();
    await testClient.db('test').admin().ping();
    await testClient.close();
    console.log('✅ Found existing MongoDB instance');
    return true;
  } catch (error) {
    console.log('❌ No existing MongoDB instance found');
    return false;
  }
}

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');
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
  res.json({ 
    status: 'ok', 
    mongodb: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

// Insert document
app.post('/collections/:collection/insert', async (req, res) => {
  try {
    if (!mongoDb) {
      return res.status(503).json({ error: 'MongoDB not available' });
    }
    
    const { collection } = req.params;
    const document = req.body;
    
    const result = await mongoDb.collection(collection).insertOne(document);
    res.json({ insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find one document
app.get('/collections/:collection/findOne', async (req, res) => {
  try {
    if (!mongoDb) {
      return res.status(503).json({ error: 'MongoDB not available' });
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
      return res.status(503).json({ error: 'MongoDB not available' });
    }
    
    const { collection } = req.params;
    const { query, update } = req.body;
    
    const result = await mongoDb.collection(collection).updateOne(query, update);
    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the proxy server
async function startProxyServer() {
  try {
    console.log('🚀 Starting MongoDB Proxy Server...');
    
    // Check if MongoDB is already running
    const mongoRunning = await checkMongoDB();
    if (!mongoRunning) {
      throw new Error('MongoDB service not available');
    }
    
    // Connect to existing MongoDB
    await connectToMongoDB();
    
    // Start Express server
    const PORT = 3001;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ MongoDB Proxy Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

    // Keep the process alive
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, gracefully shutting down');
      server.close(() => {
        if (mongoClient) {
          mongoClient.close();
        }
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, gracefully shutting down');
      server.close(() => {
        if (mongoClient) {
          mongoClient.close();
        }
        process.exit(0);
      });
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
  
  // MongoDB is managed by on-demand service, don't kill it
  
  process.exit(0);
});

// Start the server
startProxyServer();