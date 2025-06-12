// Quick script to delete the existing MongoDB document directly
import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');

async function deleteDocument() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('shiftpro');
    const collection = db.collection('applicant_documents');

    // Delete the specific document
    const result = await collection.deleteOne({ 
      _id: new ObjectId('684abdb040957034170d19f3') 
    });

    if (result.deletedCount === 1) {
      console.log('Document deleted successfully');
    } else {
      console.log('No document found with that ID');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

deleteDocument();