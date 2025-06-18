import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * MongoDB-style operations implemented using PostgreSQL
 * This bridge layer provides MongoDB-like APIs while using PostgreSQL as the backend
 * Perfect for testing environments where MongoDB networking is restricted
 */

interface MongoDocument {
  _id?: string;
  [key: string]: any;
}

interface MongoQuery {
  [key: string]: any;
}

interface MongoUpdate {
  $set?: { [key: string]: any };
  $unset?: { [key: string]: any };
  $push?: { [key: string]: any };
  $pull?: { [key: string]: any };
}

export class MongoSQLBridge {
  private collectionTableMap: Map<string, string> = new Map();

  constructor() {
    // Map MongoDB collections to PostgreSQL tables
    this.collectionTableMap.set('messages', 'message_documents');
    this.collectionTableMap.set('notes', 'note_documents');
    this.collectionTableMap.set('conversations', 'conversation_documents');
    this.collectionTableMap.set('sensitive_documents', 'file_documents');
  }

  /**
   * Ensure the PostgreSQL table exists for a MongoDB collection
   */
  private async ensureCollection(collectionName: string): Promise<void> {
    const tableName = this.collectionTableMap.get(collectionName) || `mongo_${collectionName}`;
    
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(tableName)} (
          id SERIAL PRIMARY KEY,
          _id TEXT UNIQUE DEFAULT ('doc_' || generate_random_uuid()),
          document JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS ${sql.identifier(`idx_${tableName}_id`)} 
        ON ${sql.identifier(tableName)} (_id);
      `);
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS ${sql.identifier(`idx_${tableName}_document`)} 
        ON ${sql.identifier(tableName)} USING GIN (document);
      `);
    } catch (error) {
      console.warn(`Table ${tableName} setup warning:`, error);
    }
  }

  /**
   * Insert a document (MongoDB insertOne equivalent)
   */
  async insertOne(collectionName: string, document: MongoDocument): Promise<{ insertedId: string }> {
    await this.ensureCollection(collectionName);
    const tableName = this.collectionTableMap.get(collectionName) || `mongo_${collectionName}`;
    
    const docId = document._id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docWithId = { ...document, _id: docId };
    
    const result = await db.execute(sql`
      INSERT INTO ${sql.identifier(tableName)} (_id, document)
      VALUES (${docId}, ${JSON.stringify(docWithId)})
      RETURNING _id;
    `);
    
    return { insertedId: docId };
  }

  /**
   * Find documents (MongoDB find equivalent)
   */
  async find(collectionName: string, query: MongoQuery = {}): Promise<MongoDocument[]> {
    await this.ensureCollection(collectionName);
    const tableName = this.collectionTableMap.get(collectionName) || `mongo_${collectionName}`;
    
    let whereClause = '';
    if (Object.keys(query).length > 0) {
      const conditions = Object.entries(query).map(([key, value]) => {
        if (key === '_id') {
          return `_id = '${value}'`;
        }
        return `document->>'${key}' = '${value}'`;
      });
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }
    
    const result = await db.execute(sql.raw(`
      SELECT document FROM ${tableName} ${whereClause}
      ORDER BY created_at DESC;
    `));
    
    return result.rows.map((row: any) => row.document);
  }

  /**
   * Find one document (MongoDB findOne equivalent)
   */
  async findOne(collectionName: string, query: MongoQuery = {}): Promise<MongoDocument | null> {
    const results = await this.find(collectionName, query);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Update a document (MongoDB updateOne equivalent)
   */
  async updateOne(collectionName: string, query: MongoQuery, update: MongoUpdate): Promise<{ modifiedCount: number }> {
    await this.ensureCollection(collectionName);
    const tableName = this.collectionTableMap.get(collectionName) || `mongo_${collectionName}`;
    
    const doc = await this.findOne(collectionName, query);
    if (!doc) {
      return { modifiedCount: 0 };
    }
    
    let updatedDoc = { ...doc };
    
    // Handle $set operations
    if (update.$set) {
      Object.assign(updatedDoc, update.$set);
    }
    
    // Handle $unset operations
    if (update.$unset) {
      Object.keys(update.$unset).forEach(key => {
        delete updatedDoc[key];
      });
    }
    
    // Handle $push operations (simplified array handling)
    if (update.$push) {
      Object.entries(update.$push).forEach(([key, value]) => {
        if (!updatedDoc[key]) updatedDoc[key] = [];
        if (Array.isArray(updatedDoc[key])) {
          updatedDoc[key].push(value);
        }
      });
    }
    
    await db.execute(sql`
      UPDATE ${sql.identifier(tableName)}
      SET document = ${JSON.stringify(updatedDoc)}, updated_at = NOW()
      WHERE _id = ${doc._id};
    `);
    
    return { modifiedCount: 1 };
  }

  /**
   * Delete a document (MongoDB deleteOne equivalent)
   */
  async deleteOne(collectionName: string, query: MongoQuery): Promise<{ deletedCount: number }> {
    await this.ensureCollection(collectionName);
    const tableName = this.collectionTableMap.get(collectionName) || `mongo_${collectionName}`;
    
    const doc = await this.findOne(collectionName, query);
    if (!doc) {
      return { deletedCount: 0 };
    }
    
    await db.execute(sql`
      DELETE FROM ${sql.identifier(tableName)}
      WHERE _id = ${doc._id};
    `);
    
    return { deletedCount: 1 };
  }

  /**
   * Count documents (MongoDB countDocuments equivalent)
   */
  async countDocuments(collectionName: string, query: MongoQuery = {}): Promise<number> {
    await this.ensureCollection(collectionName);
    const tableName = this.collectionTableMap.get(collectionName) || `mongo_${collectionName}`;
    
    let whereClause = '';
    if (Object.keys(query).length > 0) {
      const conditions = Object.entries(query).map(([key, value]) => {
        if (key === '_id') {
          return `_id = '${value}'`;
        }
        return `document->>'${key}' = '${value}'`;
      });
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }
    
    const result = await db.execute(sql.raw(`
      SELECT COUNT(*) as count FROM ${tableName} ${whereClause};
    `));
    
    return parseInt(result.rows[0]?.count || '0');
  }

  /**
   * Aggregate operations (simplified MongoDB aggregate equivalent)
   */
  async aggregate(collectionName: string, pipeline: any[]): Promise<MongoDocument[]> {
    // Simplified aggregation - for complex operations, extend as needed
    console.log('Aggregation pipeline not fully implemented, falling back to find');
    return this.find(collectionName);
  }
}

export const mongoSQLBridge = new MongoSQLBridge();