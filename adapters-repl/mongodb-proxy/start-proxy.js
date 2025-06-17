const express = require('express');
const { MongoClient } = require('mongodb');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

let mongoClient = null;
let mongoDb = null;
let mongoProcess = null;

// Start MongoDB process
async function startMongoDB() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting MongoDB server...');
    
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), '../../mongodb_data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const mongodPath = '/nix/store/fwh4fxd747m0py3ib3s5abamia9nrf90-mongodb-4.4.29/bin/mongod';
    
    mongoProcess = spawn(mongodPath, [
      '--dbpath', dataDir,
      '--port', '27017',
      '--bind_ip', '127.0.0.1',
      '--nojournal',
      '--noprealloc',
      '--smallfiles',
      '--quiet'
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    mongoProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('waiting for connections')) {
        console.log('✅ MongoDB server started successfully');
        resolve(true);
      }
    });

    mongoProcess.stderr.on('data', (data) => {
      console.log('MongoDB stderr:', data.toString());
    });

    mongoProcess.on('error', (error) => {
      console.error('❌ MongoDB process error:', error);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (mongoProcess && mongoProcess.pid) {
        console.log('✅ MongoDB process appears to be running');
        resolve(true);
      } else {
        reject(new Error('MongoDB startup timeout'));
      }
    }, 30000);
  });
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
    
    // Start MongoDB first
    await startMongoDB();
    
    // Wait a bit for MongoDB to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Start Express server
    const PORT = 3001;
    app.listen(PORT, '127.0.0.1', () => {
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
  
  if (mongoProcess) {
    mongoProcess.kill('SIGTERM');
  }
  
  process.exit(0);
});

// Start the server
startProxyServer();