import { ObjectId } from 'mongodb';

// MongoDB Proxy Client - HTTP REST interface to MongoDB Proxy Service
export class MongoDBProxyClient {
  private baseUrl: string;
  private connected: boolean = false;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async connect(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const health = await response.json();
      
      if (health.mongodb === 'connected') {
        this.connected = true;
        console.log('✅ MongoDB Proxy Client connected');
      } else {
        throw new Error('MongoDB proxy service not ready');
      }
    } catch (error) {
      console.error('❌ MongoDB Proxy Client connection failed:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Collection operations
  async insertOne(collectionName: string, document: any): Promise<{ insertedId: ObjectId }> {
    if (!this.connected) {
      throw new Error('MongoDB proxy not connected');
    }

    const response = await fetch(`${this.baseUrl}/collections/${collectionName}/insert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Insert operation failed');
    }

    const result = await response.json();
    return { insertedId: new ObjectId(result.insertedId) };
  }

  async findOne(collectionName: string, query: any = {}): Promise<any> {
    if (!this.connected) {
      throw new Error('MongoDB proxy not connected');
    }

    const queryParam = encodeURIComponent(JSON.stringify(query));
    const response = await fetch(`${this.baseUrl}/collections/${collectionName}/findOne?q=${queryParam}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'FindOne operation failed');
    }

    return await response.json();
  }

  async find(collectionName: string, query: any = {}, limit: number = 100): Promise<any[]> {
    if (!this.connected) {
      throw new Error('MongoDB proxy not connected');
    }

    const queryParam = encodeURIComponent(JSON.stringify(query));
    const response = await fetch(`${this.baseUrl}/collections/${collectionName}/find?q=${queryParam}&limit=${limit}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Find operation failed');
    }

    return await response.json();
  }

  async updateOne(collectionName: string, query: any, update: any): Promise<{ modifiedCount: number }> {
    if (!this.connected) {
      throw new Error('MongoDB proxy not connected');
    }

    const response = await fetch(`${this.baseUrl}/collections/${collectionName}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, update })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Update operation failed');
    }

    return await response.json();
  }

  async deleteOne(collectionName: string, query: any): Promise<{ deletedCount: number }> {
    if (!this.connected) {
      throw new Error('MongoDB proxy not connected');
    }

    const queryParam = encodeURIComponent(JSON.stringify(query));
    const response = await fetch(`${this.baseUrl}/collections/${collectionName}/delete?q=${queryParam}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Delete operation failed');
    }

    return await response.json();
  }

  async checkHealth(): Promise<{ mongodb: boolean; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const health = await response.json();
      
      return {
        mongodb: health.mongodb === 'connected',
        timestamp: health.timestamp
      };
    } catch (error) {
      return {
        mongodb: false,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
export const mongoProxyClient = new MongoDBProxyClient();