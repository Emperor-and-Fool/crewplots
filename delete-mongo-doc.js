// Quick script to delete the existing MongoDB document
import fetch from 'node-fetch';

async function deleteDocument() {
  try {
    const response = await fetch('http://localhost:5173/api/mongodb/documents/684abdb040957034170d19f3', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3ASijp8IKqOmRErn8za6JPWE52zxdxcFgU.%2F9y8EjOa%2BJjjMSkxz%2Bp3uVRyO0RrqZs3t7w%2FpMPyArE'
      }
    });
    
    console.log('Delete response status:', response.status);
    const result = await response.text();
    console.log('Delete response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteDocument();