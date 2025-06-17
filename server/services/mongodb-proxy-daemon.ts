import express from 'express';
import { MongoClient } from 'mongodb';

class MongoDBProxyDaemon {
  private app: express.Application;
  private mongoClient: MongoClient | null = null;
  private mongoDb: any = null;
  private server: any = null;
  private isRunning = false;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        mongodb: this.mongoDb ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      });
    });

    // Find documents
    this.app.post('/collections/:collection/find', async (req, res) => {
      try {
        const { collection } = req.params;
        const { filter = {}, limit = 100, skip = 0 } = req.body;
        
        if (!this.mongoDb) {
          throw new Error('MongoDB not connected');
        }

        const documents = await this.mongoDb
          .collection(collection)
          .find(filter)
          .skip(skip)
          .limit(limit)
          .toArray();

        res.json(documents);
      } catch (error: any) {
        console.error('Find error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Insert document
    this.app.post('/collections/:collection/insert', async (req, res) => {
      try {
        const { collection } = req.params;
        const { document } = req.body;
        
        if (!this.mongoDb) {
          throw new Error('MongoDB not connected');
        }

        const result = await this.mongoDb.collection(collection).insertOne(document);
        res.json({ insertedId: result.insertedId });
      } catch (error: any) {
        console.error('Insert error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Update document
    this.app.post('/collections/:collection/update', async (req, res) => {
      try {
        const { collection } = req.params;
        const { filter, update } = req.body;
        
        if (!this.mongoDb) {
          throw new Error('MongoDB not connected');
        }

        const result = await this.mongoDb.collection(collection).updateOne(filter, update);
        res.json({ modifiedCount: result.modifiedCount });
      } catch (error: any) {
        console.error('Update error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Delete document
    this.app.post('/collections/:collection/delete', async (req, res) => {
      try {
        const { collection } = req.params;
        const { filter } = req.body;
        
        if (!this.mongoDb) {
          throw new Error('MongoDB not connected');
        }

        const result = await this.mongoDb.collection(collection).deleteOne(filter);
        res.json({ deletedCount: result.deletedCount });
      } catch (error: any) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  private async checkMongoDB(): Promise<boolean> {
    try {
      const testClient = new MongoClient('mongodb://127.0.0.1:27017');
      await testClient.connect();
      await testClient.db('test').admin().ping();
      await testClient.close();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async connectToMongoDB(): Promise<void> {
    try {
      this.mongoClient = new MongoClient('mongodb://127.0.0.1:27017');
      await this.mongoClient.connect();
      this.mongoDb = this.mongoClient.db('applicant_system');
      console.log('✅ MongoDB Proxy connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('MongoDB proxy daemon already running');
      return;
    }

    try {
      // Check if MongoDB is available
      const mongoRunning = await this.checkMongoDB();
      if (!mongoRunning) {
        throw new Error('MongoDB service not available');
      }

      // Connect to MongoDB
      await this.connectToMongoDB();

      // Start Express server
      const PORT = 3001;
      this.server = this.app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ MongoDB Proxy Daemon running on port ${PORT}`);
        this.isRunning = true;
      });

      this.server.on('error', (error: any) => {
        console.error('❌ Server error:', error);
        this.isRunning = false;
      });

    } catch (error) {
      console.error('❌ Failed to start MongoDB proxy daemon:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping MongoDB Proxy Daemon...');
    
    if (this.server) {
      this.server.close();
    }

    if (this.mongoClient) {
      await this.mongoClient.close();
    }

    this.isRunning = false;
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

export const mongoProxyDaemon = new MongoDBProxyDaemon();