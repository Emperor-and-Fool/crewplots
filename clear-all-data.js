// Clear all MongoDB documents for user 2
import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');

async function clearAllData() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('shiftpro');
    const collection = db.collection('applicant_documents');

    // Delete specific document by ID
    const result = await collection.deleteOne({ 
      _id: new ObjectId('684abdb040957034170d19f3') 
    });
    console.log(`Deleted ${result.deletedCount} documents by ID`);

    // Delete all documents for user 2
    const result2 = await collection.deleteMany({ userId: 2 });
    console.log(`Deleted ${result2.deletedCount} documents for user 2`);

    // Also check and delete any documents by userPublicId
    const result3 = await collection.deleteMany({ userPublicId: 'testkai' });
    console.log(`Deleted ${result3.deletedCount} documents for testkai`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

clearAllData();