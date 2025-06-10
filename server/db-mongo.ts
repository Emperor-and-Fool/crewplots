import { MongoClient, Db, GridFSBucket } from 'mongodb';

class MongoDBConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private gridFS: GridFSBucket | null = null;

  async connect(): Promise<void> {
    try {
      const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
      const dbName = process.env.MONGODB_DB_NAME || 'crewplots_documents';
      
      this.client = new MongoClient(mongoUrl);
      await this.client.connect();
      this.db = this.client.db(dbName);
      this.gridFS = new GridFSBucket(this.db, { bucketName: 'sensitive_documents' });
      
      console.log('✅ MongoDB connection established successfully');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.gridFS = null;
    }
  }

  getDatabase(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  getGridFS(): GridFSBucket {
    if (!this.gridFS) {
      throw new Error('MongoDB GridFS not initialized. Call connect() first.');
    }
    return this.gridFS;
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}

export const mongoConnection = new MongoDBConnection();