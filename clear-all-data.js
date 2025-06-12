// Clear all MongoDB documents for user 2
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');

async function clearAllData() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('shiftpro');
    const collection = db.collection('applicant_documents');

    // Delete all documents for user 2
    const result = await collection.deleteMany({ userId: 2 });
    console.log(`Deleted ${result.deletedCount} documents for user 2`);

    // Also check and delete any documents by userPublicId
    const result2 = await collection.deleteMany({ userPublicId: 'testkai' });
    console.log(`Deleted ${result2.deletedCount} documents for testkai`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

clearAllData();